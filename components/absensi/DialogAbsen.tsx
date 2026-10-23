"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Btn, Modal } from "@/components/ui";
import { INK, MUTED } from "@/components/ui/tokens";
import { catatAbsen, type HasilAbsen } from "@/lib/actions/absensi";
import { hariIni } from "@/lib/format";
import { tampilJarak, ukuranFoto } from "@/lib/logic/absensi";
import { createClient } from "@/lib/supabase/client";

/* Absen = lokasi GPS + foto langsung dari kamera. Foto diambil dari aliran kamera (bukan dari galeri), diperkecil,
   diunggah ke bucket privat milik pengguna, lalu dicatat lewat Server Action. Keputusan (radius, akurasi, waktu) ada di database. */

type Posisi = { lat: number; lng: number; akurasi: number };

const PESAN_LOKASI: Record<number, string> = {
  1: "Izin lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan browser, lalu buka lagi.",
  2: "Lokasi tidak tersedia. Nyalakan GPS lalu coba lagi.",
  3: "Lokasi terlalu lama didapat. Pindah ke tempat terbuka lalu coba lagi.",
};

export function DialogAbsen({ jenis, userId, onTutup }: { jenis: "masuk" | "pulang"; userId: string; onTutup: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [posisi, setPosisi] = useState<Posisi | null>(null);
  // Dialog hanya dirender setelah klik, jadi `navigator` selalu ada; dukungan perangkat dicek sekali di awal, bukan di dalam efek.
  const [galatLokasi, setGalatLokasi] = useState<string | null>(() => ("geolocation" in navigator ? null : "Perangkat ini tidak mendukung lokasi."));
  const [kameraSiap, setKameraSiap] = useState(false);
  const [galatKamera, setGalatKamera] = useState<string | null>(() => (typeof navigator.mediaDevices?.getUserMedia === "function" ? null : "Perangkat ini tidak mendukung kamera."));
  const [hasil, setHasil] = useState<HasilAbsen | null>(null);
  const [sibuk, mulai] = useTransition();

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => { setGalatLokasi(null); setPosisi({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: p.coords.accuracy }); },
      (e) => setGalatLokasi(PESAN_LOKASI[e.code] ?? "Lokasi tidak terbaca."),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    let aliran: MediaStream | null = null;
    let batal = false;
    if (!navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        if (batal) { s.getTracks().forEach((t) => t.stop()); return; }
        aliran = s;
        if (video.current) { video.current.srcObject = s; void video.current.play().catch(() => undefined); }
        setKameraSiap(true);
      })
      .catch(() => setGalatKamera("Kamera tidak bisa dibuka. Izinkan kamera untuk situs ini, lalu buka lagi."));
    return () => { batal = true; aliran?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const kirim = () => {
    const v = video.current;
    if (!v || !posisi) return;
    mulai(async () => {
      const { lebar, tinggi } = ukuranFoto(v.videoWidth, v.videoHeight);
      const kanvas = document.createElement("canvas");
      kanvas.width = lebar;
      kanvas.height = tinggi;
      kanvas.getContext("2d")?.drawImage(v, 0, 0, lebar, tinggi);
      const blob = await new Promise<Blob | null>((ok) => kanvas.toBlob(ok, "image/jpeg", 0.72));
      if (!blob) return setHasil({ error: "Foto gagal diambil. Coba lagi." });
      const path = `${userId}/${hariIni()}-${jenis}-${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from("absensi").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) return setHasil({ error: "Foto gagal diunggah. Periksa sinyal lalu coba lagi." });
      setHasil(await catatAbsen({ jenis, lat: posisi.lat, lng: posisi.lng, akurasi: posisi.akurasi, foto: path }));
    });
  };

  const berhasil = hasil?.ok === true;
  const siap = Boolean(posisi) && kameraSiap && !sibuk && !berhasil;
  return (
    <Modal title={jenis === "masuk" ? "Absen masuk" : "Absen pulang"} onClose={onTutup}>
      {berhasil ? (
        <div className="space-y-3">
          <div role="status" className="rounded-2xl px-4 py-3 text-[14px]" style={{ background: "#DDF3E8", color: "#0B6B4A" }}>
            Absen {jenis} tercatat pukul {hasil?.waktu} di {hasil?.lokasi}{hasil?.jarakM != null && ` (${tampilJarak(hasil.jarakM)} dari titik)`}.
            {jenis === "masuk" && (hasil?.terlambatMenit ?? 0) > 0 && <span className="block font-medium">Terlambat {hasil?.terlambatMenit} menit.</span>}
          </div>
          <Btn full onClick={onTutup}>Selesai</Btn>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl bg-black">
            {/* Cermin hanya di layar supaya wajah terasa seperti selfie; foto yang dikirim tidak dibalik. */}
            <video ref={video} playsInline muted className="aspect-[4/3] w-full object-cover" style={{ transform: "scaleX(-1)" }} aria-label="Pratinjau kamera" />
          </div>
          {galatKamera && <p role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{galatKamera}</p>}
          {galatLokasi && <p role="alert" className="rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{galatLokasi}</p>}
          <p className="text-[12.5px]" style={{ color: MUTED }} data-testid="status-gps">
            {posisi ? <>Lokasi didapat, akurasi <b style={{ color: INK }}>±{Math.round(posisi.akurasi)} m</b>. Foto harus diambil sekarang, bukan dari galeri.</> : "Mencari lokasi..."}
          </p>
          {hasil && !berhasil && (
            <p role="alert" className="rounded-xl px-3 py-2 text-[13px]" style={{ background: "#FBE5E3", color: "#A8322B" }}>{hasil.error ?? hasil.alasan}</p>
          )}
          <Btn full disabled={!siap} onClick={kirim}>{sibuk ? "Mengirim..." : `Ambil foto dan absen ${jenis}`}</Btn>
        </div>
      )}
    </Modal>
  );
}

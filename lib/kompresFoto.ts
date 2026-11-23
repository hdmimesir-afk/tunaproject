/* Kompres foto di browser sebelum diunggah (permintaan user 23 Nov 2026): diperkecil kalau kegedean, terus disimpan WebP.
   Rotasi foto HP ngikut data orientasi fotonya. Kalau browser nggak bisa bikin WebP (sebagian iPhone lama),
   fotonya tetap dikompres tapi jadi JPEG, biar upload nggak gagal. PDF dan berkas lain nggak lewat sini. */

/** Ukuran baru biar sisi terpanjang maksimal `maks` piksel. Foto yg udah kecil nggak diperbesar. */
export function ukuranBaru(lebar: number, tinggi: number, maks: number) {
  const sisi = Math.max(lebar, tinggi);
  if (sisi <= maks || sisi === 0) return { lebar, tinggi };
  const r = maks / sisi;
  return { lebar: Math.max(1, Math.round(lebar * r)), tinggi: Math.max(1, Math.round(tinggi * r)) };
}

/** Ganti akhiran nama berkas, misalnya "nota.JPG" jadi "nota.webp". */
export const gantiAkhiran = (nama: string, akhiran: "webp" | "jpg") => `${nama.replace(/\.[^./\\]+$/, "") || "foto"}.${akhiran}`;

export const BISA_DIKOMPRES = ["image/jpeg", "image/png", "image/webp"] as const;

async function bacaGambar(f: Blob): Promise<{ sumber: CanvasImageSource; lebar: number; tinggi: number; tutup: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const b = await createImageBitmap(f, { imageOrientation: "from-image" });
      return { sumber: b, lebar: b.width, tinggi: b.height, tutup: () => b.close() };
    } catch {
      // lanjut ke cara lama di bawah
    }
  }
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Fotonya nggak bisa dibaca.");
  }
  return { sumber: img, lebar: img.naturalWidth, tinggi: img.naturalHeight, tutup: () => URL.revokeObjectURL(url) };
}

const keBlob = (k: HTMLCanvasElement, tipe: string, kualitas: number) => new Promise<Blob | null>((ok) => k.toBlob(ok, tipe, kualitas));

/** Gambar di kanvas jadi WebP (atau JPEG kalau WebP nggak didukung browser). */
export async function kanvasKeFoto(k: HTMLCanvasElement, kualitas = 0.8): Promise<Blob | null> {
  const webp = await keBlob(k, "image/webp", kualitas);
  if (webp && webp.type === "image/webp") return webp;
  return keBlob(k, "image/jpeg", Math.min(0.85, kualitas + 0.05));
}

/** Kompres satu foto jadi WebP. Hasilnya berkas baru dengan nama berakhiran .webp (atau .jpg kalau terpaksa). */
export async function kompresFoto(f: File, opsi: { maks?: number; kualitas?: number } = {}): Promise<File> {
  const { maks = 2000, kualitas = 0.8 } = opsi;
  const g = await bacaGambar(f);
  try {
    const { lebar, tinggi } = ukuranBaru(g.lebar, g.tinggi, maks);
    const k = document.createElement("canvas");
    k.width = lebar;
    k.height = tinggi;
    const ctx = k.getContext("2d");
    if (!ctx) throw new Error("Fotonya nggak bisa diproses.");
    // PNG transparan dikasih latar putih biar nggak jadi hitam kalau terpaksa JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, lebar, tinggi);
    ctx.drawImage(g.sumber, 0, 0, lebar, tinggi);
    const blob = await kanvasKeFoto(k, kualitas);
    if (!blob) throw new Error("Fotonya nggak bisa diproses.");
    // Foto WebP yg udah kecil dari sananya: kalau hasil kompres malah lebih gede, pakai yg asli.
    if (f.type === "image/webp" && blob.size >= f.size && lebar === g.lebar) return f;
    const akhiran = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], gantiAkhiran(f.name, akhiran), { type: blob.type });
  } finally {
    g.tutup();
  }
}

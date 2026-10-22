import type { Metadata } from "next";
import { Suspense } from "react";
import { AksesKelola, type Pengguna } from "@/components/akses/AksesKelola";
import { Belum } from "@/components/shell/Belum";
import { Judul } from "@/components/shell/Judul";
import { requireIzin } from "@/lib/data/auth";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "KATALIS ERP | Akses" };

export default function AksesPage() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <Judul kicker="Pengguna dan peran" judul="Akses" />
      {supabaseConfigured ? (
        <Suspense fallback={<div className="h-64 rounded-[26px] bg-white/50" />}>
          <AksesData />
        </Suspense>
      ) : (
        <Belum />
      )}
    </div>
  );
}

async function AksesData() {
  const sesi = await requireIzin("akses.kelola");
  const supabase = await createClient();
  const [{ data: pengguna }, { data: peran }] = await Promise.all([
    supabase.from("profiles").select("user_id, nama, email, role_id, aktif").order("dibuat_pada"),
    supabase.from("roles").select("id, nama").order("urutan"),
  ]);
  return (
    <AksesKelola
      pengguna={(pengguna ?? []) as Pengguna[]}
      peran={(peran ?? []) as { id: string; nama: string }[]}
      saya={sesi.userId}
      bolehOwner={sesi.semuaIzin}
    />
  );
}

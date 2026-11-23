-- 23 Nov 2026: dashboard owner (permintaan owner, "kayak aplikasi barber": owner cuma lihat dan nyetujuin).
--   1. Saldo perusahaan: saldo awal kas (sebelum pakai sistem) di settings, ditambah semua uang masuk dikurang keluar di buku kas
--      (view v_saldo_kas). Diisi admin di Pengaturan.
--   2. Modal usaha buat ngitung balik modal (BEP) dari laba proyek. Diisi admin di Pengaturan.
--   3. Link CCTV (bisa beberapa kamera): tabel cctv_links. Diisi admin (pengaturan.write), dilihat owner (izin cctv.read).
--      Peran lain nggak bisa lihat linknya.
--   4. Lampiran jenis invoice dan kwitansi (sebelumnya kwitansi dicatat sebagai bukti transfer).
-- Batasan "owner nggak bisa input" ada di aplikasi (lib/izin.ts). Database tetap ngasih owner semua izin.

insert into public.settings (kunci, nilai, keterangan) values
  ('saldo_awal_kas_rp', '0', 'Saldo kas perusahaan sebelum pakai sistem (Rp). Saldo di dashboard = ini + uang masuk - uang keluar di buku kas.'),
  ('modal_usaha_rp', '0', 'Total modal usaha (Rp), buat ngitung balik modal (BEP) di dashboard owner.')
on conflict (kunci) do nothing;

-- ============================================================ saldo buku kas
create view public.v_saldo_kas with (security_invoker = true) as
select
  coalesce(sum(case when arah = 'masuk' then jumlah else -jumlah end), 0)::numeric(16,2) as saldo_buku,
  coalesce(sum(jumlah) filter (where arah = 'masuk'), 0)::numeric(16,2) as total_masuk,
  coalesce(sum(jumlah) filter (where arah = 'keluar'), 0)::numeric(16,2) as total_keluar,
  max(tanggal) as tanggal_terakhir
from public.ledger;
revoke all on public.v_saldo_kas from anon;
grant select on public.v_saldo_kas to authenticated;

-- ============================================================ CCTV
create table public.cctv_links (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) between 1 and 60),
  url text not null check (url ~ '^https?://' and length(url) <= 500),
  urutan int not null default 0,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);
select private.pasang_aturan_tabel('public.cctv_links');
create policy "cctv terbaca" on public.cctv_links for select to authenticated
  using ((select private.has_permission('cctv.read')) or (select private.has_permission('pengaturan.write')));
create policy "cctv ditambah" on public.cctv_links for insert to authenticated
  with check ((select private.has_permission('pengaturan.write')));
create policy "cctv diubah" on public.cctv_links for update to authenticated
  using ((select private.has_permission('pengaturan.write'))) with check ((select private.has_permission('pengaturan.write')));

-- ============================================================ lampiran invoice dan kwitansi
alter table public.documents drop constraint documents_jenis_check;
alter table public.documents add constraint documents_jenis_check
  check (jenis in ('nota', 'bukti_transfer', 'surat_jalan', 'foto_timbangan', 'tanda_terima', 'tagihan', 'invoice', 'kwitansi', 'lainnya'));

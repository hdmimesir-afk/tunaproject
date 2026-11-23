-- Jalanin sekali di Supabase SQL Editor (produksi). Isinya sama persis dengan migrasi:
--   20261123000600_super_admin_terima: Super Admin bisa input terima ikan
--   20261123000700_super_admin_semua_izin: Super Admin pegang semua izin (pengaman khusus Owner tetap jalan)
-- Aman dijalanin walau 000600 udah pernah dijalanin. Langsung berlaku tanpa nunggu push: cukup refresh halaman (atau keluar terus masuk lagi).

begin;

-- =====================================================================
-- 20261123000600_super_admin_terima
-- =====================================================================
-- 23 Nov 2026: Super Admin juga bisa input terima ikan (permintaan tim Katalis). Sebelumnya cuma Petugas Lapangan dan
-- Kepala Produksi, jadi form Terima ikan nggak muncul di akun Super Admin padahal tombol Ajukan pembelian ada.
-- Grading tetap izin mutu.write (Kepala Produksi / QC), nggak ikut ditambah.
insert into public.role_permissions (role_id, aksi) values ('super_admin', 'penerimaan.write')
on conflict do nothing;

-- =====================================================================
-- 20261123000700_super_admin_semua_izin
-- =====================================================================
-- 23 Nov 2026: Super Admin bisa segalanya (keputusan user). Semua izin yg dipakai aplikasi dikasih ke super_admin satu per satu,
-- termasuk produksi, koreksi di tiap step, persetujuan, tutup buku, dan hapus data.
-- Sengaja NGGAK pakai roles.semua_izin (tanda Owner), biar pengaman khusus Owner tetap jalan:
--   akun Owner cuma bisa diatur Owner (email, tautan sandi, peran), dan orang yg ngajuin nggak bisa nyetujuin pengajuannya sendiri.
-- Izin baru yg ditambah nanti perlu ditambahin juga ke super_admin.
insert into public.role_permissions (role_id, aksi)
select 'super_admin', x.aksi
from unnest(array[
  'absensi.absen', 'absensi.kelola', 'absensi.rekap', 'absensi.setuju', 'akses.kelola', 'asisten.use', 'biaya.setuju', 'cctv.read',
  'data.hapus', 'dokumen.read', 'dokumen.write', 'gudang.read', 'gudang.write', 'invoice.write', 'jejak.read', 'keuangan.read',
  'keuangan.write', 'laporan.read', 'master.read', 'master.write', 'mutu.read', 'mutu.write', 'nota.susulan', 'pembayaran.write',
  'pembelian.read', 'pembelian.write', 'penerimaan.write', 'pengaturan.write', 'pengiriman.write', 'penjualan.read', 'penjualan.write',
  'periode.read', 'periode.tutup', 'persetujuan.periksa', 'persetujuan.read', 'persetujuan.setuju', 'produksi.periksa', 'produksi.read',
  'produksi.setuju', 'produksi.write', 'siklus.read', 'siklus.tutup', 'siklus.write', 'stok.read', 'stok.setuju', 'stok.write',
  'terima_bayar.write'
]) as x(aksi)
on conflict do nothing;

-- Catat migrasinya biar Supabase tahu udah jalan.
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261123000600', 'super_admin_terima'),
  ('20261123000700', 'super_admin_semua_izin')
on conflict do nothing;

commit;

-- Cek abis jalan (cuma baca): harus keluar 47.
select count(*) as izin_super_admin from public.role_permissions where role_id = 'super_admin';

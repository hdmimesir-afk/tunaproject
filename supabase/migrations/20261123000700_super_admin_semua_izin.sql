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

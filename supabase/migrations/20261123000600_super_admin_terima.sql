-- 23 Nov 2026: Super Admin juga bisa input terima ikan (permintaan tim Katalis). Sebelumnya cuma Petugas Lapangan dan
-- Kepala Produksi, jadi form Terima ikan nggak muncul di akun Super Admin padahal tombol Ajukan pembelian ada.
-- Grading tetap izin mutu.write (Kepala Produksi / QC), nggak ikut ditambah.
insert into public.role_permissions (role_id, aksi) values ('super_admin', 'penerimaan.write')
on conflict do nothing;

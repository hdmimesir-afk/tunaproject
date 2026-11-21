-- 22 Nov 2026: tutup jalur input stok manual lama.
-- Sejak 21 Nov stok hasil produksi masuk sendiri dari produksi yg disetujui Owner (private.atur_unit_otomatis), dan koreksi
-- stok lewat Koreksi produksi. Dua fungsi lama di bawah udah nggak dipanggil dari aplikasi, tapi masih bisa dipanggil
-- langsung lewat API. Kalau dipakai, bisa bikin unit stok dobel atau sisa stok beda sama produksinya.
--   masukkan_hasil_produksi  : DITUTUP (hak eksekusi pengguna dicabut). Unit lama yg dibikin dari sini tetap ada dan tetap jalan.
--   ajukan_koreksi_stok      : DITUTUP. Pengajuan lama yg masih nunggu tetap ada di Stok.
--   putuskan_koreksi_stok    : TETAP. Owner masih perlu mutusin pengajuan lama yg masih nunggu.
-- Nggak ada fungsi atau data yang dihapus. Kalau perlu dibuka lagi: grant execute ... to authenticated.

do $$
begin
  execute 'revoke execute on function public.masukkan_hasil_produksi(uuid, uuid, uuid, text, numeric, text, boolean, text, uuid) from public, anon, authenticated';
  execute 'revoke execute on function public.ajukan_koreksi_stok(uuid, numeric, text) from public, anon, authenticated';
end;
$$;

comment on function public.masukkan_hasil_produksi(uuid, uuid, uuid, text, numeric, text, boolean, text, uuid) is
  'DITUTUP 22 Nov 2026. Stok hasil produksi masuk otomatis dari produksi yg disetujui Owner. Disimpan buat riwayat.';
comment on function public.ajukan_koreksi_stok(uuid, numeric, text) is
  'DITUTUP 22 Nov 2026. Koreksi stok lewat Koreksi produksi. Pengajuan lama tetap bisa diputuskan lewat putuskan_koreksi_stok.';

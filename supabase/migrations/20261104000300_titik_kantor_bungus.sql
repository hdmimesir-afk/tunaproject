-- Titik lokasi kerja disamakan dengan pin PT Katalis Lintas Global di Google Maps (-1.0280625, 100.3953125, dibulatkan ke 6 desimal).
-- Hanya titiknya yang berubah; radius, batas akurasi, dan jam kerja tetap. Lokasi kerja dibuat lewat aplikasi,
-- jadi bila namanya tidak mengandung "Bungus", tidak ada baris yang berubah dan titiknya diisi lewat menu Absensi.
do $$
declare
  jumlah int;
begin
  update public.work_sites set lat = -1.028063, lng = 100.395313 where nama ilike '%bungus%';
  get diagnostics jumlah = row_count;
  raise notice 'Titik lokasi kerja Bungus diperbarui: % baris.', jumlah;
end;
$$;

-- Fase 7 · Absensi dan izin: geofence tanpa peta, waktu server, satu absen per hari, izin, rekap, RLS. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'owner11@uji.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'admin11@uji.local'),
  ('00000000-0000-0000-0000-0000000000b3', 'petugas11@uji.local'),
  ('00000000-0000-0000-0000-0000000000b4', 'petugas11b@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-0000000000b1';
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin Uji' where user_id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas Uji' where user_id = '00000000-0000-0000-0000-0000000000b3';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas Dua' where user_id = '00000000-0000-0000-0000-0000000000b4';

-- ============================================================ Super Admin: lokasi kerja
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated", "aal": "aal1"}';
select lives_ok(
  $$select public.simpan_lokasi_kerja(null, 'Pabrik Uji', -0.9492, 100.3543, 50, 30, '23:59', 0, true)$$,
  'admin menambah lokasi kerja dengan koordinat dari GPS, tanpa peta');
select is((select count(*)::int from public.work_sites), 1, 'satu lokasi kerja tersimpan');
select throws_ok($$select public.simpan_lokasi_kerja(null, 'Salah', -0.9, 100.3, 5, 30, '08:00', 15, true)$$, 'KT001', null, 'radius di bawah 10 meter ditolak');
select throws_ok($$select public.simpan_lokasi_kerja(null, 'Salah', 200, 100.3, 50, 30, '08:00', 15, true)$$, 'KT001', null, 'koordinat di luar batas ditolak');

-- ============================================================ Petugas
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b3", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.simpan_lokasi_kerja(null, 'X', -0.9, 100.3, 50, 30, '08:00', 15, true)$$, '42501', null, 'petugas tidak boleh mengatur lokasi kerja');

-- Sekitar 30 m dari titik (0,00027 derajat lintang) dengan akurasi baik: berhasil.
select is(
  (public.catat_absen('masuk', -0.94893, 100.3543, 10, '00000000-0000-0000-0000-0000000000b3/masuk-1.jpg') ->> 'ok'),
  'true', 'absen masuk di dalam radius berhasil');
select is((select count(*)::int from public.attendance where user_id = '00000000-0000-0000-0000-0000000000b3' and jenis = 'masuk' and hasil = 'berhasil'), 1, 'absen masuk tersimpan');
select is((select terlambat_menit from public.attendance where user_id = '00000000-0000-0000-0000-0000000000b3' and jenis = 'masuk'), 0, 'jam masuk 23.59: tidak terlambat');
select is(
  (public.catat_absen('masuk', -0.94893, 100.3543, 10, '00000000-0000-0000-0000-0000000000b3/masuk-2.jpg') ->> 'ok'),
  'false', 'absen masuk kedua di hari yang sama ditolak');
select like(
  (public.catat_absen('masuk', -0.94893, 100.3543, 10, '00000000-0000-0000-0000-0000000000b3/masuk-3.jpg') ->> 'alasan'),
  '%sudah absen masuk%', 'alasan penolakan menyebut sudah absen');

-- Sekitar 111 m dari titik (0,001 derajat): di luar radius 50 m. Percobaannya tetap tersimpan.
select is(
  (public.catat_absen('pulang', -0.9482, 100.3543, 10, '00000000-0000-0000-0000-0000000000b3/pulang-1.jpg') ->> 'ok'),
  'false', 'absen pulang di luar radius ditolak');
select is((select count(*)::int from public.attendance where user_id = '00000000-0000-0000-0000-0000000000b3' and hasil = 'gagal' and alasan_gagal like '%di luar radius%'), 1, 'percobaan di luar radius tercatat dengan alasan jelas');
select is(
  (public.catat_absen('pulang', -0.94893, 100.3543, 80, '00000000-0000-0000-0000-0000000000b3/pulang-2.jpg') ->> 'ok'),
  'false', 'akurasi GPS buruk ditolak');
select is((select count(*)::int from public.attendance where user_id = '00000000-0000-0000-0000-0000000000b3' and alasan_gagal like '%kurang akurat%'), 1, 'penolakan akurasi tercatat');
select throws_ok(
  $$select public.catat_absen('pulang', -0.94893, 100.3543, 10, '00000000-0000-0000-0000-0000000000b4/curang.jpg')$$,
  'KT001', null, 'foto di folder orang lain ditolak');
select is(
  (public.catat_absen('pulang', -0.94893, 100.3543, 12, '00000000-0000-0000-0000-0000000000b3/pulang-3.jpg') ->> 'ok'),
  'true', 'absen pulang di dalam radius berhasil');
select is(
  (public.catat_absen('pulang', -0.94893, 100.3543, 12, '00000000-0000-0000-0000-0000000000b3/pulang-4.jpg') ->> 'ok'),
  'false', 'absen pulang kedua ditolak');
select throws_ok(
  $$insert into public.attendance (user_id, jenis, tanggal, lat, lng, foto_path, hasil) values ('00000000-0000-0000-0000-0000000000b3', 'masuk', current_date, 0, 0, 'x', 'berhasil')$$,
  '42501', null, 'absen tidak bisa ditulis langsung');
select throws_ok($$update public.attendance set hasil = 'berhasil'$$, '42501', null, 'absen tidak bisa diubah');
select throws_ok($$delete from public.attendance$$, '42501', null, 'absen tidak bisa dihapus');

-- Izin.
select lives_ok($$select public.ajukan_izin('sakit', current_date + 3, current_date + 4, 'demam')$$, 'petugas mengajukan sakit');
select throws_ok($$select public.ajukan_izin('izin', current_date + 4, current_date + 5, 'tumpang tindih')$$, 'KT001', null, 'pengajuan di tanggal yang sama ditolak');
select throws_ok($$select public.ajukan_izin('izin', current_date + 9, current_date + 8, 'terbalik')$$, 'KT001', null, 'tanggal selesai sebelum mulai ditolak');
select throws_ok($$select public.putuskan_izin((select id from public.leave_requests where alasan = 'demam'), true, '')$$, '42501', null, 'petugas tidak boleh memutuskan izin');
select is((select count(*)::int from public.daftar_izin()), 1, 'petugas hanya melihat izinnya sendiri');

-- ============================================================ Petugas kedua
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b4", "role": "authenticated", "aal": "aal1"}';
select is((select count(*)::int from public.attendance where user_id = '00000000-0000-0000-0000-0000000000b3'), 0, 'petugas lain tidak melihat absen orang lain (RLS)');
select is(
  (public.catat_absen('pulang', -0.94893, 100.3543, 10, '00000000-0000-0000-0000-0000000000b4/pulang-0.jpg') ->> 'ok'),
  'false', 'absen pulang sebelum masuk ditolak');
select lives_ok($$select public.ajukan_izin('izin', current_date + 10, current_date + 10, 'urusan keluarga')$$, 'petugas kedua mengajukan izin');

-- Jam masuk digeser ke 00.00 tanpa toleransi, supaya absen masuk berikutnya terlambat.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated", "aal": "aal1"}';
select lives_ok(
  $$select public.simpan_lokasi_kerja((select id from public.work_sites where nama = 'Pabrik Uji'), 'Pabrik Uji', -0.9492, 100.3543, 50, 30, '00:00', 0, true)$$,
  'admin mengubah jam masuk dan toleransi');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b4", "role": "authenticated", "aal": "aal1"}';
select is(
  (public.catat_absen('masuk', -0.94893, 100.3543, 10, '00000000-0000-0000-0000-0000000000b4/masuk-1.jpg') ->> 'ok'),
  'true', 'petugas kedua absen masuk');
select ok(
  (select terlambat_menit from public.attendance where user_id = '00000000-0000-0000-0000-0000000000b4' and jenis = 'masuk') > 0
  or (now() at time zone 'Asia/Jakarta')::time < time '00:01',
  'absen setelah jam masuk dan toleransi dihitung terlambat');

-- ============================================================ Super Admin: rekap
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b2", "role": "authenticated", "aal": "aal1"}';
select is((select count(*)::int from public.absensi_harian((now() at time zone 'Asia/Jakarta')::date)), 5, 'rekap harian memuat semua absen dan percobaan yang ditolak');
select ok(
  exists (select 1 from public.rekap_kehadiran((now() at time zone 'Asia/Jakarta')::date) r where r.nama = 'Petugas Uji' and r.hadir = 1)
  or extract(isodow from (now() at time zone 'Asia/Jakarta')) = 7,
  'rekap bulanan menghitung hadir (hari Minggu libur)');
select is((select count(*)::int from public.daftar_izin()), 2, 'admin melihat izin semua orang');
select throws_ok($$select public.putuskan_izin((select id from public.leave_requests where alasan = 'demam'), true, '')$$, '42501', null, 'Super Admin tidak boleh memutuskan izin');

-- ============================================================ Owner
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.putuskan_izin((select id from public.leave_requests where alasan = 'urusan keluarga'), false, '')$$, 'KT001', null, 'menolak izin tanpa alasan ditolak');
select lives_ok($$select public.putuskan_izin((select id from public.leave_requests where alasan = 'demam'), true, 'Cepat sembuh')$$, 'Owner menyetujui izin');
select is((select status from public.leave_requests where alasan = 'demam'), 'disetujui', 'status izin menjadi disetujui');
select throws_ok($$select public.putuskan_izin((select id from public.leave_requests where alasan = 'demam'), false, 'ubah pikiran')$$, 'KT001', null, 'izin yang sudah diputuskan tidak bisa diputuskan lagi');

-- ============================================================ Pembatalan izin
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000b3", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.batalkan_izin((select id from public.leave_requests where alasan = 'demam'))$$, 'KT001', null, 'izin yang sudah disetujui tidak bisa dibatalkan');
select throws_ok($$select public.batalkan_izin((select id from public.leave_requests where alasan = 'urusan keluarga'))$$, 'KT001', null, 'izin orang lain tidak bisa dibatalkan');

select * from finish();
rollback;

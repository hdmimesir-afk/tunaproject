-- Pesan galat database pakai "proyek" dan nggak pakai "Anda". Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosrc ~ 'raise exception ''[^'']*[Ss]iklus'),
  0, 'nggak ada pesan galat yang masih nyebut siklus');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosrc ~ '''[^'']*\mAnda\M'),
  0, 'nggak ada pesan yang masih pakai Anda');

-- Pengguna tanpa peran ditolak dengan kalimat baru, tanpa kunci izin teknis.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000191', 'tanpaperan19@uji.local');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000191","role":"authenticated"}', true);

select throws_ok($$select private.wajib_izin('siklus.tutup')$$, '42501',
  'Peran ini nggak punya izin buat langkah ini. Minta Super Admin kalau memang perlu.', 'izin ditolak pakai kalimat santai');

select ok(
  (select prosrc from pg_proc where proname = 'tutup_siklus') like '%Proyeknya nggak ketemu.%',
  'tutup proyek pakai kata proyek');
select ok(
  (select bool_or(prosrc like '%Udah absen %s hari ini jam %s.%') from pg_proc where proname = 'catat_absen'),
  'absen dobel pakai kalimat baru');
select ok(
  (select bool_or(prosrc like '%Posisinya %s m dari %s, di luar radius %s m.%') from pg_proc where proname = 'catat_absen'),
  'absen di luar radius pakai kalimat baru');

select * from finish();
rollback;

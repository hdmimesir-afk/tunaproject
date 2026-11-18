-- Grade tuna utuh (penerimaan, harga nelayan) dipisah dari grade loin (produksi, tagihan buyer). Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000211', 'qc21@uji.local');
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC 21' where user_id = '00000000-0000-0000-0000-000000000211';
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000211', 'Nelayan Uji 21');

select has_column('public', 'grades', 'jenis', 'grade punya kolom jenis');
select results_eq($$select string_agg(kode, ',' order by urutan) from public.grades where jenis = 'utuh'$$, array['AB,C,D'], 'grade tuna utuh AB, C, D tersedia');
select results_eq($$select count(*)::int from public.grades where jenis = 'loin' and kode = 'A-SO'$$, array[1], 'grade lama tetap jadi grade loin');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000211", "role": "authenticated", "aal": "aal1"}';
create temp table uji21 (k text primary key, v uuid);
insert into uji21 values ('lot', public.terima_ikan('10000000-0000-0000-0000-000000000211', 100, current_date, null, ''));

select throws_ok($$select public.cek_mutu_grade((select v from uji21 where k = 'lot'), 'lulus', jsonb_build_array(
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 100)), '')$$,
  'KT001', 'A-SO itu grade loin. Di sini pakai grade tuna utuh (AB, C, D).', 'grading tuna utuh nolak grade loin');
select lives_ok($$select public.cek_mutu_grade((select v from uji21 where k = 'lot'), 'lulus', jsonb_build_array(
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'kg', 70),
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'D'), 'kg', 30)), '')$$,
  'grading tuna utuh pakai AB dan D');
select results_eq($$select g.kode from public.lots l join public.grades g on g.id = l.grade_id where l.id = (select v from uji21 where k = 'lot')$$,
  array['AB'], 'grade utama lot dari grade tuna utuh');

insert into uji21 values ('prd', public.mulai_produksi(jsonb_build_array(jsonb_build_object('lot_id', (select v from uji21 where k = 'lot'), 'kg', 100)), current_date, 'uji21'));
select throws_ok($$select public.simpan_loin_total((select v from uji21 where k = 'prd'),
    jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'kg', 50)))$$,
  'KT001', 'AB itu grade tuna utuh. Di sini pakai grade loin.', 'timbang loin nolak grade tuna utuh');
select lives_ok($$select public.simpan_loin_total((select v from uji21 where k = 'prd'),
    jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 50)))$$,
  'timbang loin pakai grade loin');
reset role;

select * from finish();
rollback;

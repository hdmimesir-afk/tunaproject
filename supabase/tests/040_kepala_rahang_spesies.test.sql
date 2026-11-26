-- 27 Nov 2026: kepala dan rahang dipisah, spesies titipan, jenis pemilik. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select ok(exists (select 1 from public.component_categories where nama = 'Kepala' and komponen = 'hasil_samping'), 'ada kategori Kepala');
select ok(exists (select 1 from public.component_categories where nama = 'Rahang' and komponen = 'hasil_samping'), 'ada kategori Rahang');
select ok(not exists (select 1 from public.component_categories where lower(nama) = 'kepala dan rahang'), 'kategori gabungan udah nggak ada');
insert into public.buyers (nama) values ('Pemilik 40');
select is((select jenis_pemilik from public.buyers where nama = 'Pemilik 40'), 'pt', 'jenis pemilik bawaan PT');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000401', 'admin40@uji.local'),
  ('00000000-0000-0000-0000-000000000402', 'finance40@uji.local');
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 40' where user_id = '00000000-0000-0000-0000-000000000401';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance 40' where user_id = '00000000-0000-0000-0000-000000000402';
update public.buyers set jenis_pemilik = 'perorangan' where nama = 'Pemilik 40';
insert into public.storage_units (id, buyer_id, pemilik_nama, product_id, product_nama, kondisi, kg_masuk, sisa_kg, sisa_dasar_masuk) values
  ('f4000000-0000-0000-0000-000000000001', (select id from public.buyers where nama = 'Pemilik 40'), 'Pemilik 40',
   (select id from public.products where nama = 'Loin tuna'), 'Loin tuna', 'beku', 50, 50, 50);

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000402", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.atur_spesies_titipan('f4000000-0000-0000-0000-000000000001', 'Cumi')$$, '42501', null, 'finance nggak bisa ngubah titipan');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000401", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$select public.atur_spesies_titipan('f4000000-0000-0000-0000-000000000001', 'Cumi')$$, 'spesies diisi pas terima');
select lives_ok($$select public.atur_spesies_titipan('f4000000-0000-0000-0000-000000000001', 'Cumi-cumi', 'salah ketik')$$, 'spesies dikoreksi pakai alasan');
reset role;
select is((select spesies from public.storage_units where id = 'f4000000-0000-0000-0000-000000000001'), 'Cumi-cumi', 'spesies kesimpan');
select is((select count(*)::int from public.koreksi_data where ref_id = 'f4000000-0000-0000-0000-000000000001'), 1, 'koreksi spesies kecatat sekali (pas terima nggak dicatat)');

select * from finish();
rollback;

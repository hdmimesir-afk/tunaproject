-- 23 Nov 2026: Super Admin bisa segalanya (izin satu per satu), tapi pengaman khusus Owner tetap jalan. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000331', 'admin33@uji.local'),
  ('00000000-0000-0000-0000-000000000332', 'finance33@uji.local'),
  ('00000000-0000-0000-0000-000000000333', 'owner33@uji.local');
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 33' where user_id = '00000000-0000-0000-0000-000000000331';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance 33' where user_id = '00000000-0000-0000-0000-000000000332';
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner 33' where user_id = '00000000-0000-0000-0000-000000000333';
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000331', 'Pemasok 33');

select is((select count(*)::int from public.role_permissions where role_id = 'super_admin'), 47, 'Super Admin pegang 47 izin');
select is((select semua_izin from public.roles where id = 'super_admin'), false, 'tapi bukan tanda Owner (semua_izin tetap punya Owner)');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000331", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$select public.terima_ikan('10000000-0000-0000-0000-000000000331', 120)$$, 'Super Admin bisa terima ikan');
select lives_ok($$select public.cek_mutu_grade((select id from public.lots where supplier_id = '10000000-0000-0000-0000-000000000331'), 'ditahan', '[]'::jsonb, 'uji')$$,
  'Super Admin bisa grading');
select is((select sesi_saya ->> 'semua_izin' from public.sesi_saya()), 'false', 'sesi Super Admin bukan semua izin');
-- Akun Owner tetap cuma bisa diatur Owner: Super Admin nggak bisa ngubah peran Owner.
select throws_ok($$update public.profiles set aktif = false where user_id = '00000000-0000-0000-0000-000000000333'$$,
  null, null, 'Super Admin nggak bisa nonaktifin akun Owner');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000332", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.terima_ikan('10000000-0000-0000-0000-000000000331', 50)$$, '42501', null, 'finance tetap nggak bisa terima ikan');
reset role;
select is((select aktif from public.profiles where user_id = '00000000-0000-0000-0000-000000000333'), true, 'akun Owner tetap aktif');

select * from finish();
rollback;

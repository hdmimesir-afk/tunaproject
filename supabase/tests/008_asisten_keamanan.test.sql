-- Fase 6 · Batas pertanyaan Asisten AI dan tinjauan keamanan otomatis (RLS, hak anon, hapus, bucket Storage). Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000071', 'owner8@uji.local'),
  ('00000000-0000-0000-0000-000000000072', 'petugas8@uji.local'),
  ('00000000-0000-0000-0000-000000000073', 'finance8@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-000000000071';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas Uji' where user_id = '00000000-0000-0000-0000-000000000072';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance Uji' where user_id = '00000000-0000-0000-0000-000000000073';

-- ============================================================ Tinjauan keamanan (struktur)
select is(
  (select string_agg(c.relname, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not (c.relrowsecurity and c.relforcerowsecurity)),
  null, 'semua tabel di schema public memakai RLS yang dipaksa');

select is(
  (select string_agg(c.relname, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'v') and has_table_privilege('anon', c.oid, 'select, insert, update, delete')),
  null, 'tamu (anon) tidak punya hak apa pun atas tabel dan tampilan');

select is(
  (select string_agg(c.relname, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'v') and has_table_privilege('authenticated', c.oid, 'delete')),
  null, 'pengguna masuk tidak punya hak DELETE atas tabel mana pun');

select is(
  (select string_agg(p.proname, ', ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute')),
  null, 'tamu (anon) tidak bisa menjalankan fungsi di schema public');

select ok(not has_schema_privilege('anon', 'private', 'usage'), 'schema private tertutup untuk tamu (fungsi bantu tidak terjangkau)');

select is(
  (select string_agg(c.relname, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v' and not coalesce((select 'security_invoker=true' = any (c.reloptions)), false)),
  null, 'semua tampilan memakai security_invoker (mengikuti izin pembaca)');

select is(
  (select string_agg(c.relname, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not exists (select 1 from pg_trigger t where t.tgrelid = c.oid and t.tgname like '%tolak_hapus')),
  null, 'semua tabel punya pemicu penolak hapus');

select ok(exists (select 1 from storage.buckets where id = 'dokumen' and not public), 'bucket dokumen privat');
select is((select file_size_limit::text from storage.buckets where id = 'dokumen'), '10485760', 'bucket dokumen dibatasi 10 MB');
select is(
  (select string_agg(policyname, ', ') from pg_policies where schemaname = 'storage' and tablename = 'objects' and cmd in ('DELETE', 'UPDATE', 'ALL')),
  null, 'tidak ada kebijakan ubah atau hapus berkas di Storage');
select is(
  (select string_agg(tablename || ':' || policyname, ', ') from pg_policies where schemaname = 'public' and roles::text like '%anon%'),
  null, 'tidak ada kebijakan RLS untuk tamu di schema public');

-- ============================================================ Batas pertanyaan Asisten AI
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000072", "role": "authenticated", "aal": "aal1"}';
select is((public.jatah_asisten() ->> 'batas'), '30', 'batas bawaan 30 pertanyaan per hari');
select lives_ok($$select public.mulai_asisten('cepat', 'piutang telat')$$, 'pertanyaan cepat tercatat');
select is((public.jatah_asisten() ->> 'sisa'), '30', 'pertanyaan cepat tidak menghabiskan jatah');

reset role;
update public.settings set nilai = '2' where kunci = 'batas_asisten_per_hari';
set local role authenticated;
select lives_ok($$select public.mulai_asisten('model', 'pertanyaan 1')$$, 'pertanyaan model pertama diterima');
select lives_ok($$select public.mulai_asisten('model', 'pertanyaan 2')$$, 'pertanyaan model kedua diterima');
select throws_ok($$select public.mulai_asisten('model', 'pertanyaan 3')$$, 'KT001', null, 'pertanyaan di atas batas ditolak');
select is((public.jatah_asisten() ->> 'sisa'), '0', 'sisa jatah nol setelah batas tercapai');

select lives_ok(
  $$select public.selesai_asisten((select id from public.ai_usage where pertanyaan = 'pertanyaan 1'), array['saldo_kas'], 120, 45, 'selesai')$$,
  'pemakaian token dan alat dicatat');
select is((select token_masuk::text || '/' || token_keluar::text from public.ai_usage where pertanyaan = 'pertanyaan 1'), '120/45', 'token masuk dan keluar tersimpan di ai_usage');
select throws_ok($$update public.ai_usage set token_masuk = 0$$, '42501', null, 'log pemakaian tidak bisa diubah langsung');
select throws_ok($$delete from public.ai_usage$$, '42501', null, 'log pemakaian tidak bisa dihapus');

-- Pengguna lain tidak melihat pemakaian orang lain, dan jatahnya sendiri.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000073", "role": "authenticated", "aal": "aal2"}';
select is((select count(*)::int from public.ai_usage), 0, 'pengguna hanya melihat pemakaian sendiri');
select is((public.jatah_asisten() ->> 'sisa'), '2', 'jatah dihitung per pengguna');

-- Owner melihat semua pemakaian.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000071", "role": "authenticated", "aal": "aal2"}';
select is((select count(*)::int from public.ai_usage), 3, 'Owner melihat semua pemakaian');

select * from finish();
rollback;

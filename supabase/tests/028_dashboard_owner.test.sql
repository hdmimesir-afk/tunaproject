-- 23 Nov 2026: dashboard owner: saldo kas, modal usaha, link CCTV, lampiran invoice dan kwitansi. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000281', 'owner28@uji.local'),
  ('00000000-0000-0000-0000-000000000282', 'admin28@uji.local'),
  ('00000000-0000-0000-0000-000000000283', 'petugas28@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner 28' where user_id = '00000000-0000-0000-0000-000000000281';
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 28' where user_id = '00000000-0000-0000-0000-000000000282';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 28' where user_id = '00000000-0000-0000-0000-000000000283';
insert into public.ledger (tanggal, arah, kategori_nama, uraian, jumlah) values
  (current_date, 'masuk', 'Penerimaan penjualan', 'uji 28', 1000000),
  (current_date, 'keluar', 'Bahan baku', 'uji 28', 250000);

select has_table('public', 'cctv_links', 'tabel link CCTV ada');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.cctv_links'::regclass), 'RLS CCTV aktif dan dipaksa');
select is((select count(*)::int from public.settings where kunci in ('saldo_awal_kas_rp', 'modal_usaha_rp')), 2, 'pengaturan saldo awal dan modal ada');

-- ============================================================ admin ngisi CCTV
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000282", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$insert into public.cctv_links (nama, url, urutan) values ('Gudang', 'https://cctv.contoh.test/gudang', 1)$$, 'admin nambah link CCTV');
select throws_ok($$insert into public.cctv_links (nama, url) values ('Aneh', 'javascript:alert(1)')$$, '23514', null, 'link harus http atau https');
select lives_ok($$update public.settings set nilai = '500000000' where kunci = 'modal_usaha_rp'$$, 'admin isi modal usaha');
select is((select (nilai #>> '{}')::numeric from public.settings where kunci = 'modal_usaha_rp'), 500000000::numeric, 'modal usaha kesimpen');

-- ============================================================ owner lihat
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000281", "role": "authenticated", "aal": "aal2"}';
select is((select count(*)::int from public.cctv_links where nama = 'Gudang'), 1, 'owner bisa lihat link CCTV');
select ok((select saldo_buku >= 750000 from public.v_saldo_kas), 'saldo buku kas = masuk dikurang keluar');

-- ============================================================ petugas nggak bisa lihat CCTV
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000283", "role": "authenticated", "aal": "aal1"}';
select is((select count(*)::int from public.cctv_links), 0, 'petugas nggak bisa lihat link CCTV');
select throws_ok($$insert into public.cctv_links (nama, url) values ('x', 'https://x.test')$$, '42501', null, 'petugas nggak bisa nambah link CCTV');
select is((select count(*)::int from public.v_saldo_kas where saldo_buku <> 0), 0, 'petugas nggak bisa lihat saldo (buku kas tersaring RLS)');

-- ============================================================ lampiran invoice dan kwitansi
reset role;
select lives_ok($$select 1 from (select 'invoice'::text j union all select 'kwitansi') x
  where exists (select 1 from pg_constraint where conname = 'documents_jenis_check' and pg_get_constraintdef(oid) like '%' || x.j || '%')$$, 'jenis invoice dan kwitansi dikenal');
select is((select count(*)::int from (values ('invoice'), ('kwitansi')) v(j)
  where pg_get_constraintdef((select oid from pg_constraint where conname = 'documents_jenis_check')) like '%''' || v.j || '''%'), 2, 'constraint jenis lampiran nerima invoice dan kwitansi');

select * from finish();
rollback;

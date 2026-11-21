-- 22 Nov 2026: hapus data dari Pengaturan, cuma Owner, wajib alasan dan konfirmasi, tercatat di log. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000241', 'owner24@uji.local'),
  ('00000000-0000-0000-0000-000000000242', 'petugas24@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner 24' where user_id = '00000000-0000-0000-0000-000000000241';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 24' where user_id = '00000000-0000-0000-0000-000000000242';

insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000241', 'Nelayan 24');
insert into public.cycles (id, nama) values ('30000000-0000-0000-0000-000000000241', 'Bongkaran 24');
insert into public.lots (id, kode, supplier_id, cycle_id, kg, sisa_kg, qc) values
  ('c0000000-0000-0000-0000-000000000241', 'LOT-T241', '10000000-0000-0000-0000-000000000241', '30000000-0000-0000-0000-000000000241', 100, 60, 'menunggu');
insert into public.productions (id, status, catatan, cycle_id) values
  ('d0000000-0000-0000-0000-000000000241', 'berjalan', 'hapus-24', '30000000-0000-0000-0000-000000000241');
insert into public.lot_allocations (production_id, lot_id, lot_kode, kg) values
  ('d0000000-0000-0000-0000-000000000241', 'c0000000-0000-0000-0000-000000000241', 'LOT-T241', 40);

-- ============================================================ petugas: nggak boleh
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000242", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.pratinjau_hapus_data(array['produksi'])$$, '42501', null, 'petugas nggak boleh lihat pratinjau hapus');
select throws_ok($$select public.hapus_data(array['produksi'], 'coba', 'HAPUS')$$, '42501', null, 'petugas nggak boleh hapus data');
select throws_ok($$delete from public.lots$$, '42501', null, 'hapus langsung dari aplikasi tetap ditolak');
select is((select count(*)::int from public.hapus_data_log), 0, 'petugas nggak bisa baca log hapus');

-- ============================================================ owner
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000241", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.hapus_data(array['produksi'], '', 'HAPUS')$$, 'KT001', 'Tulis alasan kenapa datanya dihapus.', 'wajib alasan');
select throws_ok($$select public.hapus_data(array['produksi'], 'salah input', 'hapus')$$, 'KT001', null, 'wajib ngetik HAPUS huruf besar');
select throws_ok($$select public.hapus_data(array[]::text[], 'salah input', 'HAPUS')$$, 'KT001', null, 'wajib pilih bagian');
select throws_ok($$select public.hapus_data(array['gudang'], 'salah input', 'HAPUS')$$, 'KT001', null, 'bagian yang nggak dikenal ditolak');
select throws_ok($$delete from public.productions$$, '42501', null, 'owner juga nggak bisa hapus langsung');

select ok((select public.pratinjau_hapus_data(array['pembelian'])) @> '[{"tabel": "productions", "jumlah": 1}]'::jsonb,
  'pratinjau hapus penerimaan nunjukin produksi dari lot itu ikut kehapus');
select is((select count(*)::int from public.productions where id = 'd0000000-0000-0000-0000-000000000241'), 1, 'pratinjau nggak ngubah data');

-- Hapus produksi aja: sisa lot balik.
select lives_ok($$select public.hapus_data(array['produksi'], 'produksi latihan', 'HAPUS')$$, 'owner hapus produksi');
select is((select count(*)::int from public.productions where id = 'd0000000-0000-0000-0000-000000000241'), 0, 'produksi kehapus');
select is((select count(*)::int from public.lot_allocations where lot_id = 'c0000000-0000-0000-0000-000000000241'), 0, 'pemakaian lot ikut kehapus');
select is((select sisa_kg::text from public.lots where id = 'c0000000-0000-0000-0000-000000000241'), '100.000', 'sisa lot balik utuh');
select results_eq($$select oleh_nama, alasan, bagian::text from public.hapus_data_log order by id$$,
  $$values ('Owner 24', 'produksi latihan', '{produksi}')$$, 'hapus tercatat di log: siapa, alasan, bagian');
select ok((select rincian from public.hapus_data_log order by id limit 1) @> '[{"tabel": "productions", "jumlah": 1, "kode": []}]'::jsonb
  or (select rincian from public.hapus_data_log order by id limit 1) @> '[{"tabel": "productions", "jumlah": 1}]'::jsonb, 'log nyimpen jumlah per jenis data');

-- Hapus penerimaan dan proyek.
select lives_ok($$select public.hapus_data(array['pembelian', 'proyek'], 'data latihan', 'HAPUS')$$, 'owner hapus penerimaan dan proyek');
select is((select count(*)::int from public.lots where id = 'c0000000-0000-0000-0000-000000000241'), 0, 'lot kehapus');
select is((select count(*)::int from public.cycles where id = '30000000-0000-0000-0000-000000000241'), 0, 'proyek yang udah nggak dipakai ikut kehapus');

-- ============================================================ log nggak bisa diutak-atik
reset role;
select throws_ok($$delete from public.hapus_data_log$$, '42501', null, 'log hapus nggak bisa dihapus');
select throws_ok($$update public.hapus_data_log set alasan = 'x'$$, '42501', null, 'log hapus nggak bisa diubah');

select * from finish();
rollback;

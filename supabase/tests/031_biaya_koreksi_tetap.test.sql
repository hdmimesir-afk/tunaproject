-- 23 Nov 2026: koreksi biaya langsung berlaku, hapus biaya permanen, biaya tetap bulanan. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000311', 'owner31@uji.local'),
  ('00000000-0000-0000-0000-000000000312', 'finance31@uji.local'),
  ('00000000-0000-0000-0000-000000000313', 'petugas31@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner 31' where user_id = '00000000-0000-0000-0000-000000000311';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance 31' where user_id = '00000000-0000-0000-0000-000000000312';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 31' where user_id = '00000000-0000-0000-0000-000000000313';
update public.expense_categories set nota_wajib = false where nama = 'Operasional rutin';
update public.expense_categories set nota_wajib = true where nama = 'Perawatan dan perbaikan';
update public.expense_categories set nota_wajib = true where nama = 'Overhead pabrik';

-- Biaya bulan ini: satu nunggu Owner, satu udah disetujui (barisnya ada di buku kas), satu dobel buat dihapus.
insert into public.expenses (id, category_id, kategori_nama, uraian, jumlah, tanggal, status, diajukan_oleh) values
  ('d3100000-0000-0000-0000-000000000001', (select id from public.expense_categories where nama = 'Operasional rutin'), 'Operasional rutin', 'ES', 610000, current_date, 'diajukan', '00000000-0000-0000-0000-000000000312'),
  ('d3100000-0000-0000-0000-000000000002', (select id from public.expense_categories where nama = 'Operasional rutin'), 'Operasional rutin', 'Listrik', 1500000, current_date, 'diajukan', '00000000-0000-0000-0000-000000000312'),
  ('d3100000-0000-0000-0000-000000000003', (select id from public.expense_categories where nama = 'Operasional rutin'), 'Operasional rutin', 'Listrik dobel', 1500000, current_date, 'diajukan', '00000000-0000-0000-0000-000000000312');
update public.expenses set status = 'disetujui', diputuskan_oleh = '00000000-0000-0000-0000-000000000311', diputuskan_pada = now()
where id in ('d3100000-0000-0000-0000-000000000002', 'd3100000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.ledger where ref_tabel = 'expenses' and ref_id in ('d3100000-0000-0000-0000-000000000002', 'd3100000-0000-0000-0000-000000000003')), 2,
  'biaya yg disetujui masuk buku kas');
insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe)
values ('expenses', 'd3100000-0000-0000-0000-000000000003', 'nota', 'uji/nota31.webp', 'nota31.webp', 1000, 'image/webp');

-- ============================================================ petugas nggak boleh
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000313", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.koreksi_biaya('d3100000-0000-0000-0000-000000000001', (select id from public.expense_categories where nama = 'Bahan baku'), 'ES', 1, current_date, null, null, null, 'uji')$$,
  '42501', null, 'petugas nggak bisa koreksi biaya');
select throws_ok($$select public.hapus_biaya('d3100000-0000-0000-0000-000000000003', 'dobel')$$, '42501', null, 'petugas nggak bisa hapus biaya');
select throws_ok($$select public.catat_biaya_tetap(current_date, current_date)$$, '42501', null, 'petugas nggak bisa catat biaya tetap');

-- ============================================================ finance: koreksi
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000312", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.koreksi_biaya('d3100000-0000-0000-0000-000000000001', (select id from public.expense_categories where nama = 'Bahan baku'), 'Es balok', 650000, current_date, null, null, null, '  ')$$,
  'KT001', 'Tulis alasan koreksinya.', 'koreksi wajib alasan');
select throws_ok($$select public.koreksi_biaya('d3100000-0000-0000-0000-000000000001', (select id from public.expense_categories where nama = 'Bahan baku'), 'Es balok', 0, current_date, null, null, null, 'salah')$$,
  'KT001', null, 'jumlah nol ditolak');
-- Biaya yg nunggu Owner: semua isian bisa diganti, status tetap nunggu.
select lives_ok($$select public.koreksi_biaya('d3100000-0000-0000-0000-000000000001', (select id from public.expense_categories where nama = 'Bahan baku'), 'Es balok', 650000, current_date, null, null, null, 'salah kategori sama jumlah')$$,
  'biaya yg nunggu Owner bisa dikoreksi');
select results_eq($$select kategori_nama, uraian, jumlah::numeric, status from public.expenses where id = 'd3100000-0000-0000-0000-000000000001'$$,
  $$values ('Bahan baku'::text, 'Es balok'::text, 650000::numeric, 'diajukan'::text)$$, 'isian berubah, status tetap Menunggu Owner');
select is((select count(*)::int from public.ledger where ref_tabel = 'expenses' and ref_id = 'd3100000-0000-0000-0000-000000000001'), 0, 'yg belum disetujui belum masuk buku kas');
-- Biaya yg udah disetujui: langsung berlaku, buku kasnya ikut dibenerin.
select lives_ok($$select public.koreksi_biaya('d3100000-0000-0000-0000-000000000002', (select id from public.expense_categories where nama = 'Operasional rutin'), 'Listrik Oktober', 1450000, current_date, null, null, null, 'salah ketik jumlah')$$,
  'biaya yg udah disetujui bisa dikoreksi');
select results_eq($$select jumlah::numeric, status from public.expenses where id = 'd3100000-0000-0000-0000-000000000002'$$,
  $$values (1450000::numeric, 'disetujui'::text)$$, 'tetap disetujui (nggak balik ke Owner)');
select results_eq($$select jumlah::numeric, uraian from public.ledger where ref_tabel = 'expenses' and ref_id = 'd3100000-0000-0000-0000-000000000002'$$,
  $$select 1450000::numeric, (select kode from public.expenses where id = 'd3100000-0000-0000-0000-000000000002') || ' Listrik Oktober'$$, 'baris buku kas ikut dibenerin');
select is((select count(*)::int from public.ledger where ref_tabel = 'expenses' and ref_id = 'd3100000-0000-0000-0000-000000000002'), 1, 'buku kas nggak dobel');
select is((select count(*)::int from public.koreksi_data where tabel = 'expenses'), 2, 'dua koreksi kecatat');
select results_eq($$select (sebelum ->> 'jumlah')::numeric, (sesudah ->> 'jumlah')::numeric, alasan from public.koreksi_data where tabel = 'expenses' and ref_id = 'd3100000-0000-0000-0000-000000000002'$$,
  $$values (1500000::numeric, 1450000::numeric, 'salah ketik jumlah'::text)$$, 'sebelum sesudahnya kecatat');
select is((select count(*)::int from public.koreksi_data where tabel = 'expenses'), 2, 'finance bisa baca riwayat koreksi biaya');

-- ============================================================ finance: hapus
select throws_ok($$select public.hapus_biaya('d3100000-0000-0000-0000-000000000003', '')$$, 'KT001', null, 'hapus wajib alasan');
select is(public.hapus_biaya('d3100000-0000-0000-0000-000000000003', 'kecatat dobel') > 0, true, 'biaya dobel dihapus');
reset role;
select is((select count(*)::int from public.expenses where id = 'd3100000-0000-0000-0000-000000000003'), 0, 'biayanya ilang');
select is((select count(*)::int from public.ledger where ref_tabel = 'expenses' and ref_id = 'd3100000-0000-0000-0000-000000000003'), 0, 'baris buku kasnya ilang');
select is((select count(*)::int from public.documents where ref_tabel = 'expenses' and ref_id = 'd3100000-0000-0000-0000-000000000003'), 0, 'notanya ilang');
select results_eq($$select bagian, alasan, total from public.hapus_data_log where 'biaya' = any(bagian) order by id desc limit 1$$,
  $$values (array['biaya'], 'kecatat dobel'::text, 3)$$, 'kecatat di log hapus (biaya + nota + buku kas)');
select ok((select rincian -> 0 -> 'kode' ->> 0 from public.hapus_data_log where 'biaya' = any(bagian) order by id desc limit 1) like '% · Listrik dobel · %', 'log nyimpen kode dan uraian biayanya');
-- Biaya lain nggak kesentuh.
select is((select count(*)::int from public.expenses where id in ('d3100000-0000-0000-0000-000000000001', 'd3100000-0000-0000-0000-000000000002')), 2, 'biaya lain tetap ada');
select throws_ok($$delete from public.expenses where id = 'd3100000-0000-0000-0000-000000000001'$$, '42501', null, 'hapus langsung (bukan lewat fungsi) tetap ditolak');

-- Bulan yg udah tutup buku: nggak bisa dikoreksi atau dihapus.
insert into public.expenses (id, category_id, kategori_nama, uraian, jumlah, tanggal, status)
values ('d3100000-0000-0000-0000-000000000004', (select id from public.expense_categories where nama = 'Operasional rutin'), 'Operasional rutin', 'Lama', 1000, date '2025-01-10', 'draf');
insert into public.accounting_periods (bulan, status) values (date '2025-01-01', 'ditutup');
set local role authenticated;
select throws_ok($$select public.koreksi_biaya('d3100000-0000-0000-0000-000000000004', (select id from public.expense_categories where nama = 'Operasional rutin'), 'Lama', 2000, date '2025-01-10', null, null, null, 'uji')$$,
  'KT001', null, 'biaya di bulan yg udah tutup buku nggak bisa dikoreksi');
select throws_ok($$select public.hapus_biaya('d3100000-0000-0000-0000-000000000004', 'uji')$$, 'KT001', null, 'biaya di bulan yg udah tutup buku nggak bisa dihapus');

-- ============================================================ biaya tetap
select throws_ok($$select public.simpan_biaya_tetap(null, '  ', 'kantor', 'bulanan', 1000, null, true)$$, 'KT001', null, 'nama wajib');
select lives_ok($$select public.simpan_biaya_tetap(null, 'Sewa gudang', 'kantor', 'bulanan', 5000000, null, true)$$, 'biaya tetap tanpa nota dibikin');
select lives_ok($$select public.simpan_biaya_tetap(null, 'Servis genset', 'overhead_pabrik', 'bulanan', 750000, null, true)$$, 'biaya tetap wajib nota dibikin');
select lives_ok($$select public.simpan_biaya_tetap(null, 'Langganan lama', 'kantor', 'bulanan', 100000, null, false)$$, 'biaya tetap nonaktif dibikin');
select throws_ok($$select public.simpan_biaya_tetap(null, 'sewa gudang', 'kantor', 'bulanan', 1, null, true)$$, 'KT001', null, 'nama dobel ditolak');
select is(public.catat_biaya_tetap(current_date, current_date), 2, 'dua biaya tetap aktif kecatat bulan ini');
select results_eq($$select uraian ~ '^Sewa gudang bulan ', status from public.expenses where fixed_cost_id is not null order by uraian desc$$,
  $$values (true, 'diajukan'::text), (false, 'draf'::text)$$, 'yg nggak wajib nota langsung diajukan, yg wajib nota jadi draf');
select is((select count(*)::int from public.expenses e join public.fixed_costs f on f.id = e.fixed_cost_id where f.nama = 'Langganan lama'), 0, 'yg nonaktif nggak ikut');
select throws_ok($$select public.catat_biaya_tetap(current_date, current_date)$$, 'KT001', null, 'nggak bisa kecatat dua kali sebulan');
select lives_ok($$select public.simpan_biaya_tetap((select id from public.fixed_costs where nama = 'Langganan lama'), 'Langganan lama', 'kantor', 'bulanan', 100000, null, true)$$, 'biaya tetap diaktifin lagi');
select is(public.catat_biaya_tetap(current_date, current_date), 1, 'yg baru aktif nyusul kecatat, yg lain dilewatin');
select throws_ok($$select public.catat_biaya_tetap(current_date, (current_date - interval '2 months')::date)$$, 'KT001', null, 'tanggal harus di bulan yg dicatat');
reset role;

select * from finish();
rollback;

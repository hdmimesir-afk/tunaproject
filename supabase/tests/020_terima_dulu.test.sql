-- Masukan training 17 Nov 2026: terima ikan dulu, grading menentukan harga, PO terbit setelah disetujui, koreksi di setiap data,
-- dan proyek dengan lini bisnis (jual / jasa / titip). Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(51);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000201', 'owner20@uji.local'),
  ('00000000-0000-0000-0000-000000000202', 'finance20@uji.local'),
  ('00000000-0000-0000-0000-000000000203', 'admin20@uji.local'),
  ('00000000-0000-0000-0000-000000000204', 'petugas20@uji.local'),
  ('00000000-0000-0000-0000-000000000205', 'qc20@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner 20' where user_id = '00000000-0000-0000-0000-000000000201';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance 20' where user_id = '00000000-0000-0000-0000-000000000202';
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 20' where user_id = '00000000-0000-0000-0000-000000000203';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 20' where user_id = '00000000-0000-0000-0000-000000000204';
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC 20' where user_id = '00000000-0000-0000-0000-000000000205';
insert into public.suppliers (id, nama) values
  ('10000000-0000-0000-0000-000000000201', 'Nelayan Uji 20'),
  ('10000000-0000-0000-0000-000000000202', 'Nelayan Lain 20');
insert into public.buyers (id, nama) values ('20000000-0000-0000-0000-000000000201', 'PT Pemilik Ikan 20');
-- Nota lot nggak wajib di uji ini; nota PO tetap wajib (bawaan), jadi pakai "nota menyusul".

create temp table uji (k text primary key, v uuid);
grant all on uji to authenticated;

select has_table('public', 'purchase_order_lines', 'tabel baris PO per grade ada');
select has_table('public', 'koreksi_data', 'tabel catatan koreksi ada');

-- ============================================================ petugas: terima ikan tanpa PO
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000204", "role": "authenticated", "aal": "aal1"}';
insert into uji values ('lot1', public.terima_ikan('10000000-0000-0000-0000-000000000201', 300, current_date, null, 'bongkar pagi', 'Bongkaran Uji 20'));
insert into uji values ('lot2', public.terima_ikan('10000000-0000-0000-0000-000000000201', 100, current_date, (select cycle_id from public.lots where id = (select v from uji where k = 'lot1')), ''));
insert into uji values ('lot3', public.terima_ikan('10000000-0000-0000-0000-000000000202', 50, current_date, null, '', 'Bongkaran Lain 20'));
insert into uji values ('c3', (select cycle_id from public.lots where id = (select v from uji where k = 'lot3')));
select results_eq($$select qc, po_id is null, kg::text from public.lots where id = (select v from uji where k = 'lot1')$$,
  $$values ('menunggu', true, '300.000')$$, 'ikan diterima tanpa PO, status menunggu');
select results_eq($$select c.nama, c.lini_bisnis from public.lots l join public.cycles c on c.id = l.cycle_id where l.id = (select v from uji where k = 'lot1')$$,
  $$values ('Bongkaran Uji 20', 'jual')$$, 'proyek baru dibikin dari penerimaan');
select throws_ok($$select public.terima_ikan('10000000-0000-0000-0000-000000000201', 0)$$, 'KT001', null, 'berat nol ditolak');

-- ============================================================ QC: grading dan tahan
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000205", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$select public.cek_mutu_grade((select v from uji where k = 'lot1'), 'lulus', jsonb_build_array(
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'kg', 200),
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'C'), 'kg', 100)), '')$$, 'grading lot 1 dua grade');
select lives_ok($$select public.cek_mutu_grade((select v from uji where k = 'lot2'), 'lulus', jsonb_build_array(
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'kg', 100)), '')$$, 'grading lot 2');
select lives_ok($$select public.cek_mutu_grade((select v from uji where k = 'lot3'), 'ditahan', '[]'::jsonb, 'gugur')$$, 'lot 3 ditahan (gugur)');

-- ============================================================ admin: ajukan pembelian per grade
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000203", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.ajukan_pembelian(array[(select v from uji where k = 'lot1'), (select v from uji where k = 'lot3')],
  jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'harga_per_kg', 50000)), true)$$,
  'KT001', null, 'lot ditahan nggak bisa diajukan');
select throws_ok($$select public.ajukan_pembelian(array[(select v from uji where k = 'lot1')],
  jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'harga_per_kg', 50000)), true)$$,
  'KT001', 'Isi harga per kg buat grade C.', 'harga tiap grade wajib diisi');
select lives_ok($$insert into uji values ('po', public.ajukan_pembelian(array[(select v from uji where k = 'lot1'), (select v from uji where k = 'lot2')],
  jsonb_build_array(
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'harga_per_kg', 50000),
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'C'), 'harga_per_kg', 40000)), true))$$,
  'ajukan dua lot dari pemasok yang sama');
select results_eq($$select kode is null, status_persetujuan, kg::text, total::text, harga_per_kg::text from public.purchase_orders where id = (select v from uji where k = 'po')$$,
  $$values (true, 'diajukan', '400.000', '19000000.00', '47500.00')$$, 'PO belum punya kode, total per grade: 300x50rb + 100x40rb');
select results_eq($$select count(*)::int from public.lots where po_id = (select v from uji where k = 'po')$$, array[2], 'lot tersambung ke pengajuan');
select results_eq($$select jumlah::text from public.approvals where ref_id = (select v from uji where k = 'po') and status = 'diajukan'$$,
  array['19000000.00'], 'pengajuan masuk antrean persetujuan');

-- ============================================================ Owner: setujui, kode PO terbit
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000201", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$select public.setujui_persetujuan(array[(select id from public.approvals where ref_id = (select v from uji where k = 'po') and status = 'diajukan')], 19000000)$$, 'Owner menyetujui');
select ok((select kode like 'PO/%' from public.purchase_orders where id = (select v from uji where k = 'po')), 'kode PO terbit waktu disetujui');
select ok((select bool_and(po_kode = (select kode from public.purchase_orders where id = (select v from uji where k = 'po'))) from public.lots where po_id = (select v from uji where k = 'po')),
  'lot ikut dapat kode PO');

-- ============================================================ Finance: bayar, batal bayar
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000202", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$insert into uji values ('bayar1', public.catat_bayar((select v from uji where k = 'po'), 5000000, current_date, 'dp'))$$, 'bayar 5 juta');
select lives_ok($$select public.batalkan_pembayaran((select v from uji where k = 'bayar1'), 'salah nominal')$$, 'pembayaran dibatalkan');
select results_eq($$select total_bayar::text from public.v_purchase_orders where id = (select v from uji where k = 'po')$$, array['0.00'], 'pembayaran batal nggak dihitung');
reset role;
select results_eq($$select arah, jumlah::text from public.ledger where ref_tabel = 'payments_batal' and ref_id = (select v from uji where k = 'bayar1')$$,
  $$values ('masuk', '5000000.00')$$, 'buku kas dapat baris pembalik');
select results_eq($$select count(*)::int from public.koreksi_data where tabel = 'payments' and ref_id = (select v from uji where k = 'bayar1')$$, array[1], 'batal bayar tercatat');
set local role authenticated;
select throws_ok($$select public.batalkan_pembayaran((select v from uji where k = 'bayar1'), 'lagi')$$, 'KT001', null, 'nggak bisa dibatalkan dua kali');
select lives_ok($$select public.catat_bayar((select v from uji where k = 'po'), 15000000, current_date, 'bayar')$$, 'bayar 15 juta');

-- ============================================================ admin: koreksi harga PO yang udah disetujui
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000203", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.koreksi_pembelian((select v from uji where k = 'po'),
  jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'harga_per_kg', 30000)),
  '10000000-0000-0000-0000-000000000201', (select cycle_id from public.purchase_orders where id = (select v from uji where k = 'po')), '', 'harga turun')$$,
  'KT001', null, 'total baru di bawah yang udah dibayar ditolak');
select throws_ok($$select public.koreksi_pembelian((select v from uji where k = 'po'), null,
  '10000000-0000-0000-0000-000000000201', null, '', '')$$, 'KT001', null, 'koreksi tanpa alasan ditolak');
select lives_ok($$select public.koreksi_pembelian((select v from uji where k = 'po'),
  jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'harga_per_kg', 52000)),
  '10000000-0000-0000-0000-000000000201', (select cycle_id from public.purchase_orders where id = (select v from uji where k = 'po')), '', 'salah ketik harga A')$$,
  'koreksi harga grade A');
select results_eq($$select status_persetujuan, total::text from public.purchase_orders where id = (select v from uji where k = 'po')$$,
  $$values ('diajukan', '19600000.00')$$, 'total berubah, PO balik ke antrean persetujuan');
select results_eq($$select count(*)::int from public.approvals where ref_id = (select v from uji where k = 'po') and status = 'diajukan' and judul like 'Koreksi PO/%'$$,
  array[1], 'pengajuan koreksi bertanda Koreksi');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000202", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.catat_bayar((select v from uji where k = 'po'), 100000)$$, 'KT001', null, 'selama nunggu persetujuan ulang, belum bisa bayar');

-- ============================================================ petugas: koreksi berat lot
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000204", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.koreksi_lot((select v from uji where k = 'lot2'), 80, current_date, '10000000-0000-0000-0000-000000000201', null, '', 'salah timbang')$$,
  'KT001', null, 'berat lebih kecil dari hasil grading ditolak');
select throws_ok($$select public.koreksi_lot((select v from uji where k = 'lot2'), 120, current_date, '10000000-0000-0000-0000-000000000202', null, '', 'ganti')$$,
  'KT001', null, 'pemasok lot yang udah masuk pembelian nggak bisa diganti dari lot');
select lives_ok($$select public.koreksi_lot((select v from uji where k = 'lot3'), 55, current_date, '10000000-0000-0000-0000-000000000202', null, 'timbang ulang', 'salah timbang')$$,
  'koreksi berat lot yang belum diajukan');
select results_eq($$select kg::text, sisa_kg::text from public.lots where id = (select v from uji where k = 'lot3')$$, $$values ('55.000', '55.000')$$, 'berat dan sisa lot ikut berubah');

-- ============================================================ produksi: lot menunggu boleh, ditahan nggak
insert into uji values ('lot4', public.terima_ikan('10000000-0000-0000-0000-000000000202', 80, current_date, (select v from uji where k = 'c3'), ''));
select lives_ok($$insert into uji values ('prd', public.mulai_produksi(jsonb_build_array(jsonb_build_object('lot_id', (select v from uji where k = 'lot4'), 'kg', 80)),
  current_date, '', (select v from uji where k = 'c3')))$$, 'lot yang belum digrading boleh diolah');
select throws_ok($$select public.mulai_produksi(jsonb_build_array(jsonb_build_object('lot_id', (select v from uji where k = 'lot3'), 'kg', 10)))$$,
  'KT001', null, 'lot ditahan nggak bisa diolah');
select lives_ok($$select public.ubah_alokasi_lot((select v from uji where k = 'prd'), (select v from uji where k = 'lot4'), 70, 'kelebihan catat')$$, 'koreksi berat lot di produksi');
select results_eq($$select sisa_kg::text from public.lots where id = (select v from uji where k = 'lot4')$$, array['10.000'], 'sisa lot balik 10 kg');

-- Jasa produksi: ikan dari PT, tanpa lot.
select throws_ok($$select public.mulai_produksi('[]'::jsonb, current_date, '', null,
  jsonb_build_object('nama', 'Jasa Uji 20', 'lini_bisnis', 'jasa'), 500)$$, 'KT001', 'Pilih PT pemilik ikannya.', 'jasa produksi wajib pilih PT');
select lives_ok($$insert into uji values ('jasa', public.mulai_produksi('[]'::jsonb, current_date, '', null,
  jsonb_build_object('nama', 'Jasa Uji 20', 'lini_bisnis', 'jasa', 'pt_id', '20000000-0000-0000-0000-000000000201'), 500))$$, 'mulai jasa produksi 500 kg dari PT');
select results_eq($$select masuk_kg::text from public.v_neraca_produksi where production_id = (select v from uji where k = 'jasa')$$, array['500.000'], 'neraca masuk dari berat PT');
select lives_ok($$select public.simpan_loin_total((select v from uji where k = 'jasa'),
  jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'A-SO'), 'kg', 300)))$$, 'isi loin total jasa');
select lives_ok($$select public.koreksi_produksi((select v from uji where k = 'jasa'), current_date,
  (select cycle_id from public.productions where id = (select v from uji where k = 'jasa')), 520, '', 'timbangan PT beda')$$, 'koreksi berat ikan dari PT');

-- Titip saja: nggak bisa diproduksi.
insert into uji values ('titip', public.buat_proyek('Titip Uji 20', 'titip', '20000000-0000-0000-0000-000000000201'));
select throws_ok($$select public.mulai_produksi('[]'::jsonb, current_date, '', (select v from uji where k = 'titip'), null, 10)$$,
  'KT001', null, 'proyek titip nggak diproduksi');
select lives_ok($$select public.terima_titipan('20000000-0000-0000-0000-000000000201', (select id from public.products where nama = 'Loin tuna'), null, 'beku', 50,
  '', false, '', null, (select v from uji where k = 'titip'))$$, 'titipan masuk ke proyek titip');
select results_eq($$select count(*)::int from public.storage_units where cycle_id = (select v from uji where k = 'titip')$$, array[1], 'titipan tercatat di proyeknya');

-- Hasil jasa produksi jadi milik PT.
reset role;
update public.productions set status = 'diperiksa' where id = (select v from uji where k = 'jasa');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000205", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$insert into uji select 'stok', u.id from public.storage_units u where u.production_id = (select v from uji where k = 'jasa') and u.otomatis and u.grade_id is not null limit 1$$, 'hasil jasa otomatis masuk stok');
select ok((select v from uji where k = 'stok') is not null, 'unit stok hasil jasa ada');
select results_eq($$select buyer_id::text, pemilik_nama from public.storage_units where id = (select v from uji where k = 'stok')$$,
  $$values ('20000000-0000-0000-0000-000000000201', 'PT Pemilik Ikan 20')$$, 'stok hasil jasa milik PT');

-- Owner: buka lagi produksi ditolak kalau hasilnya udah masuk stok.
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000201", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.buka_lagi_produksi((select v from uji where k = 'jasa'), 'cek ulang')$$, 'KT001', null, 'buka lagi ditolak kalau udah masuk stok');
reset role;
select ok((select count(*) from public.koreksi_data where tabel in ('lots', 'purchase_orders', 'productions')) >= 4, 'koreksi lot, PO, dan produksi tercatat');

select * from finish();
rollback;

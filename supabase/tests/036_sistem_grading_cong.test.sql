-- 23 Nov 2026: sistem grading cong di lot (penerimaan). Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000361', 'admin36@uji.local');
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 36' where user_id = '00000000-0000-0000-0000-000000000361';
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000361', 'Pemasok 36');

select is((select count(*)::int from public.grades where kode = 'CONG' and jenis = 'utuh' and aktif), 1, 'grade CONG ada');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000361", "role": "authenticated", "aal": "aal1"}';

-- Lot per ekor tanpa grade (kayak LOT-002): langsung jadi cong.
select lives_ok($$select public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000361', current_date, null, 'ekor-36', null, null, null,
    jsonb_build_array(jsonb_build_object('no_tag', '1', 'kg', 300, 'gancu', 0), jsonb_build_object('no_tag', '2', 'kg', 159, 'gancu', 1)))$$, 'lot per ekor tanpa grade diterima');
select throws_ok($$select public.jadikan_cong((select id from public.lots where catatan = 'ekor-36'), null, ' ')$$, 'KT001', null, 'wajib alasan');
select lives_ok($$select public.jadikan_cong((select id from public.lots where catatan = 'ekor-36'), null, 'sistem cong')$$, 'lot per ekor jadi cong');
select results_eq($$select qc, (select g.kode from public.grades g where g.id = grade_id) from public.lots where catatan = 'ekor-36'$$,
  $$values ('lulus'::text, 'CONG'::text)$$, 'lot langsung lulus dengan grade CONG');
select is((select lg.kg::numeric from public.lot_grades lg join public.grades g on g.id = lg.grade_id join public.lots l on l.id = lg.lot_id
    where l.catatan = 'ekor-36' and g.kode = 'CONG'), 458::numeric, 'berat CONG = berat dibayar (dipotong gancu 1 kg)');
select is((select count(*)::int from public.lot_ekor e join public.lots l on l.id = e.lot_id join public.grades g on g.id = e.grade_id
    where l.catatan = 'ekor-36' and g.kode = 'CONG' and not e.batal), 2, 'semua ekor ikut CONG');

-- Lot berat total yg udah digrading + diajukan, terus diganti cong dengan harga cong.
select lives_ok($$select public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000361', current_date, null, 'total-36', null, 360, null, null,
    jsonb_build_array(
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB' and jenis = 'utuh'), 'kg', 175),
      jsonb_build_object('grade_id', (select id from public.grades where kode = 'C' and jenis = 'utuh'), 'kg', 185)))$$, 'lot berat total digrading');
select lives_ok($$select public.ajukan_pembelian(array[(select id from public.lots where catatan = 'total-36')], jsonb_build_array(
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB' and jenis = 'utuh'), 'harga_per_kg', 60000),
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'C' and jenis = 'utuh'), 'harga_per_kg', 40000)), true)$$, 'diajukan pembeliannya');
select lives_ok($$select public.jadikan_cong((select id from public.lots where catatan = 'total-36'), 50000, 'ternyata cong')$$, 'lot di PO jadi cong pakai harga cong');
select is((select total::numeric from public.purchase_orders where id = (select po_id from public.lots where catatan = 'total-36')), 18000000::numeric,
  'PO dihitung ulang: 360 kg x 50rb');

-- Balik ke per grade: grade baru pakai harga rata-rata PO dulu (nggak ketahan).
select lives_ok($$select public.cek_mutu_grade((select id from public.lots where catatan = 'total-36'), 'lulus', jsonb_build_array(
    jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB' and jenis = 'utuh'), 'kg', 360)), 'balik per grade')$$,
  'balik ke per grade');
select results_eq($$select g.kode, pl.kg::numeric, pl.harga_per_kg::numeric from public.purchase_order_lines pl join public.grades g on g.id = pl.grade_id
    where pl.po_id = (select po_id from public.lots where catatan = 'total-36') and pl.kg > 0$$,
  $$values ('AB'::text, 360::numeric, 60000::numeric)$$, 'harga AB lama kepake lagi, CONG kosong');

-- Lot berat total jadi cong sekalian benerin beratnya.
select lives_ok($$select public.terima_ikan('10000000-0000-0000-0000-000000000361', 50)$$, 'lot ketiga');
select lives_ok($$select public.jadikan_cong((select id from public.lots where supplier_id = '10000000-0000-0000-0000-000000000361' and kg = 50), null, 'cong', 45)$$, 'jadi cong + berat 45');
select is((select lg.kg::numeric from public.lot_grades lg join public.grades g on g.id = lg.grade_id join public.lots l on l.id = lg.lot_id
    where l.supplier_id = '10000000-0000-0000-0000-000000000361' and l.kg = 45 and g.kode = 'CONG'), 45::numeric, 'CONG ikut berat baru');
reset role;

select * from finish();
rollback;

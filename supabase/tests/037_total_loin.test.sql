-- 24 Nov 2026: total berat loin + total jumlah loin per produksi. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000371', 'kepala37@uji.local'),
  ('00000000-0000-0000-0000-000000000372', 'finance37@uji.local');
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'Kepala 37' where user_id = '00000000-0000-0000-0000-000000000371';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance 37' where user_id = '00000000-0000-0000-0000-000000000372';
insert into public.cycles (id, ref_po_pembeli) values ('c3700000-0000-0000-0000-000000000001', 'PO-UJI-37');
insert into public.productions (id, tanggal, cycle_id, kg_masuk_pt) values ('d3700000-0000-0000-0000-000000000001', current_date, 'c3700000-0000-0000-0000-000000000001', 4093);

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000372", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.simpan_total_loin('d3700000-0000-0000-0000-000000000001', 1096.075, 120)$$, '42501', null, 'finance nggak bisa isi total loin');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000371", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.simpan_total_loin('d3700000-0000-0000-0000-000000000001', null, null)$$, 'KT001', null, 'minimal salah satu diisi');
select throws_ok($$select public.simpan_total_loin('d3700000-0000-0000-0000-000000000001', 100, 0)$$, 'KT001', null, 'jumlah loin harus lebih dari nol');
select lives_ok($$select public.simpan_total_loin('d3700000-0000-0000-0000-000000000001', 1096.075, 120)$$, 'produksi berjalan: total loin diisi tanpa alasan');
select results_eq($$select loin_berat_total::numeric, loin_jumlah_total from public.v_productions where id = 'd3700000-0000-0000-0000-000000000001'$$,
  $$values (1096.075::numeric, 120)$$, 'kebaca di v_productions');
select is((select count(*)::int from public.koreksi_data where ref_id = 'd3700000-0000-0000-0000-000000000001'), 0, 'pas berjalan nggak dicatat sebagai koreksi');

reset role;
update public.productions set status = 'selesai' where id = 'd3700000-0000-0000-0000-000000000001';
set local role authenticated;
select throws_ok($$select public.simpan_total_loin('d3700000-0000-0000-0000-000000000001', 1100, 121)$$, 'KT001', null, 'udah selesai: wajib alasan');
select lives_ok($$select public.simpan_total_loin('d3700000-0000-0000-0000-000000000001', 1100, 121, 'salah hitung')$$, 'udah selesai: koreksi pakai alasan');
select results_eq($$select (sebelum ->> 'loin_jumlah_total')::int, (sesudah ->> 'loin_jumlah_total')::int, alasan from public.koreksi_data
    where ref_id = 'd3700000-0000-0000-0000-000000000001'$$, $$values (120, 121, 'salah hitung'::text)$$, 'koreksinya kecatat');
reset role;

select * from finish();
rollback;

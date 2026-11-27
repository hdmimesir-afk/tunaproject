-- 27 Nov 2026: total biaya tetap sebulan tanpa rincian. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000411', 'finance41@uji.local'),
  ('00000000-0000-0000-0000-000000000412', 'produksi41@uji.local');
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance 41' where user_id = '00000000-0000-0000-0000-000000000411';
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'Produksi 41' where user_id = '00000000-0000-0000-0000-000000000412';

select ok(exists (select 1 from public.expense_categories where nama = 'Biaya tetap bulanan' and not nota_wajib), 'ada kategori Biaya tetap bulanan, nggak wajib nota');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000412", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.catat_total_biaya_tetap(current_date, current_date, 200000000)$$, '42501', null, 'selain finance nggak bisa input total');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000411", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.catat_total_biaya_tetap(current_date, (current_date - interval '2 month')::date, 200000000)$$, 'KT001',
  'Tanggal biayanya harus di bulan yg dicatat.', 'tanggal harus di bulannya');
select throws_ok($$select public.catat_total_biaya_tetap(current_date, current_date, 0)$$, 'KT001', null, 'total nol ditolak');
select lives_ok($$select public.catat_total_biaya_tetap(current_date, current_date, 200000000)$$, 'total bulan ini diinput');
select results_eq($$select kategori_nama, jumlah::numeric, status, fixed_cost_id is null from public.expenses where total_tetap = date_trunc('month', current_date)::date$$,
  $$values ('Biaya tetap bulanan'::text, 200000000::numeric, 'diajukan'::text, true)$$, 'jadi biaya biasa yg diajukan ke Owner, tanpa pos');
select throws_ok($$select public.catat_total_biaya_tetap(current_date, current_date, 1000)$$, 'KT001', null, 'satu bulan cuma satu total');

-- Bulan ini udah pakai total: catat per pos ditolak biar nggak dobel.
select lives_ok($$select public.simpan_biaya_tetap(null, 'Gaji 41', 'tenaga_kerja', 'bulanan', 30000000, null, true)$$, 'pos tetap bisa ditambah');
select throws_ok($$select public.catat_biaya_tetap(current_date, current_date)$$, 'KT001', null, 'catat per pos ditolak kalau bulannya udah ada total');

-- Bulan depan dicatat per pos dulu: total bulan itu ditolak.
select lives_ok($$select public.catat_biaya_tetap((current_date + interval '1 month')::date, (date_trunc('month', current_date) + interval '1 month')::date)$$, 'bulan depan per pos');
select throws_ok($$select public.catat_total_biaya_tetap((current_date + interval '1 month')::date, (date_trunc('month', current_date) + interval '1 month')::date, 5000)$$,
  'KT001', null, 'total ditolak kalau bulannya udah dicatat per pos');
reset role;

select * from finish();
rollback;

-- 23 Nov 2026: pos biaya tetap (kelompok, bulanan/tahunan). Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000321', 'finance32@uji.local');
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance 32' where user_id = '00000000-0000-0000-0000-000000000321';

select is((select count(*)::int from public.expense_categories where nama in ('Tenaga kerja', 'Overhead pabrik', 'Sertifikasi dan izin', 'Kantor', 'Keuangan') and not nota_wajib), 5,
  'lima kelompok jadi kategori biaya, nggak wajib nota');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000321", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.simpan_biaya_tetap(null, 'Gaji', 'marketing', 'bulanan', 1000, null, true)$$, 'KT001', null, 'kelompok di luar lima pilihan ditolak');
select throws_ok($$select public.simpan_biaya_tetap(null, 'Gaji', 'tenaga_kerja', 'mingguan', 1000, null, true)$$, 'KT001', null, 'cara bayar cuma bulanan atau tahunan');
select throws_ok($$select public.simpan_biaya_tetap(null, 'Izin HACCP', 'sertifikasi_izin', 'tahunan', 1000, null, true)$$, 'KT001', 'Pilih bulan bayarnya buat pos tahunan.', 'pos tahunan wajib bulan bayar');
select lives_ok($$select public.simpan_biaya_tetap(null, 'Gaji karyawan', 'tenaga_kerja', 'bulanan', 30000000, 5, true)$$, 'pos bulanan dibikin (bulan bayar diabaikan)');
select lives_ok($$select public.simpan_biaya_tetap(null, 'Listrik pabrik', 'overhead_pabrik', 'bulanan', 8000000, null, true)$$, 'pos overhead dibikin');
select lives_ok($$select public.simpan_biaya_tetap(null, 'Izin HACCP', 'sertifikasi_izin', 'tahunan', 12000000, extract(month from current_date)::int, true)$$, 'pos tahunan jatuh tempo bulan ini');
select lives_ok($$select public.simpan_biaya_tetap(null, 'Izin SKP', 'sertifikasi_izin', 'tahunan', 6000000, (extract(month from current_date)::int % 12) + 1, true)$$, 'pos tahunan jatuh tempo bulan depan');
reset role;
select results_eq($$select nama, kelompok, cara_bayar, bulan_bayar, (select k.nama from public.expense_categories k where k.id = category_id) from public.fixed_costs where nama = 'Gaji karyawan'$$,
  $$values ('Gaji karyawan'::text, 'tenaga_kerja'::text, 'bulanan'::text, null::smallint, 'Tenaga kerja'::text)$$, 'kategori ikut kelompok, bulan bayar kosong buat bulanan');
set local role authenticated;

select is(public.catat_biaya_tetap(current_date, current_date), 3, 'bulan ini: dua pos bulanan + satu pos tahunan yg jatuh tempo');
select results_eq($$select kategori_nama, jumlah::numeric, status from public.expenses where fixed_cost_id = (select id from public.fixed_costs where nama = 'Izin HACCP')$$,
  $$values ('Sertifikasi dan izin'::text, 12000000::numeric, 'diajukan'::text)$$, 'pos tahunan kecatat nominal setahun, kategori Sertifikasi dan izin');
select ok((select uraian from public.expenses where fixed_cost_id = (select id from public.fixed_costs where nama = 'Izin HACCP')) = 'Izin HACCP tahun ' || extract(year from current_date)::int,
  'uraian pos tahunan pakai tahun');
select is((select count(*)::int from public.expenses where fixed_cost_id = (select id from public.fixed_costs where nama = 'Izin SKP')), 0, 'pos tahunan yg belum jatuh tempo nggak ikut');
select is(public.catat_biaya_tetap((current_date + interval '1 month')::date, (date_trunc('month', current_date) + interval '1 month')::date), 3,
  'bulan depan: dua pos bulanan + Izin SKP');
select is((select count(*)::int from public.expenses where fixed_cost_id = (select id from public.fixed_costs where nama = 'Izin HACCP')), 1, 'Izin HACCP nggak kecatat lagi bulan depan');

-- Kategori kelompok dimatiin admin: pos baru di kelompok itu ditolak dengan pesan jelas.
reset role;
update public.expense_categories set aktif = false where nama = 'Keuangan';
set local role authenticated;
select throws_ok($$select public.simpan_biaya_tetap(null, 'Biaya admin bank', 'keuangan', 'bulanan', 50000, null, true)$$,
  'KT001', 'Kategori biaya "Keuangan" nggak aktif. Aktifin dulu di Pengaturan.', 'kategori kelompok nonaktif ditolak');
reset role;

select * from finish();
rollback;

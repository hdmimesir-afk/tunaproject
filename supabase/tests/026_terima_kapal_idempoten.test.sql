-- 22 Nov 2026: penerimaan anti dobel (kunci permintaan), asal kapal, dan jenis ikan. Jalankan: supabase test db
-- Uji barengan (dua permintaan bersamaan) ada di uji Postgres beneran, bukan di sini, karena pgTAP jalan dalam satu transaksi.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000261', 'qc26@uji.local');
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC 26' where user_id = '00000000-0000-0000-0000-000000000261';
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000261', 'Nelayan Uji 26');
create temp table uji26 (k text primary key, v uuid);
grant all on uji26 to authenticated;

select has_column('public', 'lots', 'kapal', 'kolom asal kapal ada');
select has_column('public', 'lots', 'jenis_ikan', 'kolom jenis ikan ada');
select has_column('public', 'lots', 'kunci_permintaan', 'kolom kunci permintaan ada');
select ok((select indisunique from pg_index where indexrelid = 'public.lots_kunci_permintaan_key'::regclass), 'kunci permintaan unik');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000261", "role": "authenticated", "aal": "aal1"}';

-- ============================================================ kunci sama = satu lot
select lives_ok($$insert into uji26 values ('a1', public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000261', current_date, null, 'truk', null,
  300, 12, null, null, ' KM Sinar Laut ', 'Yellowfin', 'aaaaaaaa-0000-0000-0000-000000000001'))$$, 'terima berat total pakai kunci');
select lives_ok($$insert into uji26 values ('a2', public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000261', current_date, null, 'truk', null,
  300, 12, null, null, 'KM Sinar Laut', 'Yellowfin', 'aaaaaaaa-0000-0000-0000-000000000001'))$$, 'kirim ulang kunci sama nggak error');
select is((select v from uji26 where k = 'a2'), (select v from uji26 where k = 'a1'), 'kirim ulang balikin lot yang sama');
select is((select count(*)::int from public.lots where kunci_permintaan = 'aaaaaaaa-0000-0000-0000-000000000001'), 1, 'cuma satu lot dibuat');
select results_eq($$select kg::text, sisa_kg::text, kapal, jenis_ikan from public.lots where id = (select v from uji26 where k = 'a1')$$,
  $$values ('300.000', '300.000', 'KM Sinar Laut', 'Yellowfin')$$, 'kapal dan jenis tersimpan (spasi dibuang)');
-- Retry dengan isi beda tapi kunci sama: tetap lot pertama, nggak ada yang berubah.
select lives_ok($$insert into uji26 values ('a3', public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000261', current_date, null, 'truk', null,
  999, null, null, null, 'Kapal lain', 'Skipjack', 'aaaaaaaa-0000-0000-0000-000000000001'))$$, 'kunci sama isi beda');
select results_eq($$select kg::text, kapal from public.lots where id = (select v from uji26 where k = 'a3')$$,
  $$values ('300.000', 'KM Sinar Laut')$$, 'lot pertama nggak ketimpa');

-- ============================================================ data persis sama, kunci beda = dua lot
select lives_ok($$insert into uji26 values ('b1', public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000261', current_date, null, 'truk', null,
  300, 12, null, null, 'KM Sinar Laut', 'Yellowfin', 'bbbbbbbb-0000-0000-0000-000000000001'))$$, 'penerimaan kedua yang beneran');
select isnt((select v from uji26 where k = 'b1'), (select v from uji26 where k = 'a1'), 'data sama kunci beda = lot baru');
select lives_ok($$insert into uji26 values ('c1', public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000261', current_date, null, 'truk', null, 300))$$,
  'pemanggil lama tanpa kunci tetap jalan');
select results_eq($$select kapal, jenis_ikan, kunci_permintaan is null from public.lots where id = (select v from uji26 where k = 'c1')$$,
  $$values ('', '', true)$$, 'tanpa kapal dan kunci: kosong');

-- ============================================================ gagal di tengah: nggak ada sisa, kunci bisa dipakai lagi
select throws_ok($$select public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000261', current_date, null, '', null, null, null,
  jsonb_build_array(jsonb_build_object('no_tag', 'X1', 'kg', 10, 'grade_id', (select id from public.grades where kode = 'AB')),
                    jsonb_build_object('no_tag', 'X2', 'kg', 10)), null, 'KM Gagal', '', 'dddddddd-0000-0000-0000-000000000001')$$,
  'KT001', null, 'gagal di tengah (grade setengah)');
select is((select count(*)::int from public.lots where kunci_permintaan = 'dddddddd-0000-0000-0000-000000000001' or kapal = 'KM Gagal'), 0, 'gagal = nggak ada lot nyangkut');
select lives_ok($$insert into uji26 values ('d1', public.terima_ikan_lengkap('10000000-0000-0000-0000-000000000261', current_date, null, '', null, null, null,
  jsonb_build_array(jsonb_build_object('no_tag', 'X1', 'kg', 10, 'spesies', 'Yellowfin'), jsonb_build_object('no_tag', 'X2', 'kg', 12, 'spesies', 'Bigeye')),
  null, 'KM Gagal', 'Skipjack', 'dddddddd-0000-0000-0000-000000000001'))$$, 'dicoba lagi pakai kunci sama, sekarang masuk');
-- Per ekor: jenis ada di tiap ekor (boleh campur), jenis lot nggak diisi biar nggak dobel.
select results_eq($$select l.kg::text, l.kapal, l.jenis_ikan, (select string_agg(e.spesies, ',' order by e.no_tag) from public.lot_ekor e where e.lot_id = l.id)
  from public.lots l where l.id = (select v from uji26 where k = 'd1')$$,
  $$values ('22.000', 'KM Gagal', '', 'Yellowfin,Bigeye')$$, 'per ekor: jenis dari ekor, campur boleh');

-- ============================================================ koreksi kapal dan jenis
select lives_ok($$select public.koreksi_lot((select v from uji26 where k = 'b1'), 300, current_date, '10000000-0000-0000-0000-000000000261', null, 'truk', 'salah ketik kapal',
  'KM Bahari', 'Bigeye')$$, 'koreksi kapal dan jenis');
select lives_ok($$select public.koreksi_lot((select v from uji26 where k = 'b1'), 310, current_date, '10000000-0000-0000-0000-000000000261', null, 'truk', 'timbang ulang')$$,
  'koreksi cara lama (tanpa kapal) tetap jalan');
select results_eq($$select kg::text, kapal, jenis_ikan from public.lots where id = (select v from uji26 where k = 'b1')$$,
  $$values ('310.000', 'KM Bahari', 'Bigeye')$$, 'kapal dan jenis nggak hilang waktu koreksi tanpa kapal');

select * from finish();
rollback;

-- 22 Nov 2026: upload Excel data master (pemasok, pembeli, produk, barang penunjang). Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000271', 'admin27@uji.local'),
  ('00000000-0000-0000-0000-000000000272', 'petugas27@uji.local'),
  ('00000000-0000-0000-0000-000000000273', 'finance27@uji.local');
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 27' where user_id = '00000000-0000-0000-0000-000000000271';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 27' where user_id = '00000000-0000-0000-0000-000000000272';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance 27' where user_id = '00000000-0000-0000-0000-000000000273';
insert into public.suppliers (nama, kontak, catatan) values ('Nelayan Lama 27', '0811', 'langganan');
insert into public.suppliers (nama, kontak, aktif) values ('Nelayan Nonaktif 27', '0812', false);
create temp table uji27 (k text primary key, v jsonb);
grant all on uji27 to authenticated;

select has_table('public', 'impor_master_log', 'tabel log upload ada');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.impor_master_log'::regclass), 'RLS log upload aktif dan dipaksa');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000271", "role": "authenticated", "aal": "aal2"}';

-- ============================================================ pratinjau: nggak nulis apa-apa
insert into uji27 values ('p1', public.impor_master('suppliers', '[
  {"_no": 2, "nama": "Nelayan Baru 27", "kontak": "0821"},
  {"_no": 3, "nama": "nelayan lama 27", "kontak": "0811"},
  {"_no": 4, "nama": "Nelayan Lama 27", "kontak": "0899"},
  {"_no": 5, "nama": "", "kontak": "0800"},
  {"_no": 6, "nama": "Nelayan Nonaktif 27"}
]'::jsonb));
select is((select v ->> 'baru' from uji27 where k = 'p1'), '1', 'pratinjau: 1 baru');
select is((select v ->> 'sama' from uji27 where k = 'p1'), '1', 'pratinjau: nama sama beda huruf besar = data yg sama');
select is((select v ->> 'ubah' from uji27 where k = 'p1'), '1', 'pratinjau: yg nonaktif diaktifin lagi = diubah');
select is((select v ->> 'salah' from uji27 where k = 'p1'), '2', 'pratinjau: nama kosong dan nama dobel di file = salah');
select is((select x ->> 'pesan' from uji27, jsonb_array_elements(v -> 'baris') x where k = 'p1' and x ->> 'no' = '4'), 'Nama ini dobel di file, udah ada di baris sebelumnya.', 'pesan nama dobel nunjuk baris yg bener');
select is((select count(*)::int from public.suppliers where nama like 'Nelayan Baru 27'), 0, 'pratinjau nggak nyimpen apa-apa');

-- ============================================================ simpan: semua atau nggak sama sekali
select throws_ok($$select public.impor_master('suppliers', '[{"nama": "Nelayan Baru 27"}, {"nama": ""}]'::jsonb, true, 'aaaaaaaa-0000-0000-0000-000000000027')$$,
  'KT001', null, 'ada baris salah: ditolak');
select is((select count(*)::int from public.suppliers where nama = 'Nelayan Baru 27'), 0, 'ditolak = baris yg bener juga nggak masuk');

insert into uji27 values ('s1', public.impor_master('suppliers', '[
  {"_no": 2, "nama": "Nelayan Baru 27", "kontak": "0821", "catatan": "dari excel"},
  {"_no": 3, "nama": "Nelayan Lama 27", "kontak": ""},
  {"_no": 4, "nama": "Nelayan Nonaktif 27"}
]'::jsonb, true, 'bbbbbbbb-0000-0000-0000-000000000027', 'pemasok.xlsx'));
select results_eq($$select v ->> 'baru', v ->> 'ubah', v ->> 'sama' from uji27 where k = 's1'$$, $$values ('1', '1', '1')$$, 'simpan: 1 baru, 1 diaktifin, 1 sama');
select results_eq($$select kontak, catatan from public.suppliers where nama = 'Nelayan Baru 27'$$, $$values ('0821', 'dari excel')$$, 'data baru masuk ke kolom yg bener');
select results_eq($$select kontak, catatan from public.suppliers where nama = 'Nelayan Lama 27'$$, $$values ('0811', 'langganan')$$, 'sel kosong di file nggak ngehapus data lama');
select is((select aktif from public.suppliers where nama = 'Nelayan Nonaktif 27'), true, 'pemasok nonaktif diaktifin lagi');
select is((select count(*)::int from public.impor_master_log where kunci = 'bbbbbbbb-0000-0000-0000-000000000027' and nama_file = 'pemasok.xlsx'), 1, 'upload kecatat di log');

-- Kirim ulang (kunci sama): nggak diproses dua kali.
select is((public.impor_master('suppliers', '[{"nama": "Nelayan Kedua 27"}]'::jsonb, true, 'bbbbbbbb-0000-0000-0000-000000000027') ->> 'sudah'), 'true', 'kunci sama = ringkasan upload pertama');
select is((select count(*)::int from public.suppliers where nama = 'Nelayan Kedua 27'), 0, 'kunci sama nggak nambah data');
-- Upload ulang file yg sama (kunci baru): semuanya sama, nggak ada yg dobel.
select is((public.impor_master('suppliers', '[{"nama": "Nelayan Baru 27", "kontak": "0821"}]'::jsonb, true, 'cccccccc-0000-0000-0000-000000000027') ->> 'sama'), '1', 'file yg sama diupload lagi = dilewati');
select is((select count(*)::int from public.suppliers where lower(nama) = 'nelayan baru 27'), 1, 'pemasok tetep satu');

-- ============================================================ pembeli dan produk
select is((public.impor_master('buyers', '[{"nama": "PT Uji 27", "tempo_hari": "2 minggu"}]'::jsonb) -> 'baris' -> 0 ->> 'status'), 'salah', 'tempo bukan angka = salah');
select lives_ok($$select public.impor_master('buyers', '[{"nama": "PT Uji 27", "kontak": "021"}, {"nama": "CV Uji 27", "tempo_hari": "30"}]'::jsonb, true, 'dddddddd-0000-0000-0000-000000000027')$$, 'pembeli masuk');
select results_eq($$select nama, tempo_hari from public.buyers where nama in ('PT Uji 27', 'CV Uji 27') order by nama$$,
  $$values ('CV Uji 27', 30), ('PT Uji 27', 14)$$, 'tempo kosong = 14 hari, tempo diisi = sesuai file');
select is((public.impor_master('products', '[{"nama": "Produk Uji 27", "kelompok": "ikan asin"}]'::jsonb) -> 'baris' -> 0 ->> 'status'), 'salah', 'kelompok produk nggak dikenal = salah');
select lives_ok($$select public.impor_master('products', '[{"nama": "Toro Uji 27", "kelompok": "Hasil samping"}, {"nama": "Loin Uji 27"}]'::jsonb, true, 'eeeeeeee-0000-0000-0000-000000000027')$$, 'produk masuk');
select results_eq($$select nama, satuan, kelompok from public.products where nama in ('Toro Uji 27', 'Loin Uji 27') order by nama$$,
  $$values ('Loin Uji 27', 'kg', 'loin'), ('Toro Uji 27', 'kg', 'hasil_samping')$$, 'kelompok dan satuan bawaan masuk ke tempatnya');
select throws_ok($$insert into public.impor_master_log (kunci, jenis) values (gen_random_uuid(), 'suppliers')$$, '42501', null, 'log nggak bisa ditulis langsung');

-- ============================================================ barang penunjang (petugas, izin stok)
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000272", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$select public.impor_master('supply_items', '[
  {"kategori": "Penunjang kerja", "nama": "Es balok uji 27", "satuan": "balok", "stok_minimum": "2,5", "lokasi": "Gudang"},
  {"kategori": "penunjang pekerja", "nama": "Sarung tangan uji 27"}]'::jsonb, true, 'ffffffff-0000-0000-0000-000000000027')$$, 'petugas upload barang penunjang');
select results_eq($$select kategori, satuan, stok_minimum::text, lokasi from public.supply_items where nama in ('Es balok uji 27', 'Sarung tangan uji 27') order by nama$$,
  $$values ('kerja', 'balok', '2.500', 'Gudang'), ('pekerja', 'pcs', '0.000', '')$$, 'kategori, satuan, minimum (koma jadi titik) masuk ke tempatnya');
select throws_ok($$select public.impor_master('suppliers', '[{"nama": "x"}]'::jsonb)$$, '42501', null, 'petugas nggak bisa upload pemasok');

-- ============================================================ finance nggak boleh
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000273", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.impor_master('buyers', '[{"nama": "x"}]'::jsonb)$$, '42501', null, 'finance nggak bisa upload pembeli');

select * from finish();
rollback;

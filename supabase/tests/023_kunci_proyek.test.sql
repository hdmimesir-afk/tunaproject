-- Meeting 18 Nov 2026 poin 4: tiap transaksi dan produksi nyambung ke proyek, data antarproyek nggak kecampur. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000231', 'admin23@uji.local'),
  ('00000000-0000-0000-0000-000000000232', 'qc23@uji.local');
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 23' where user_id = '00000000-0000-0000-0000-000000000231';
update public.profiles set role_id = 'kepala_produksi', aktif = true, nama = 'QC 23' where user_id = '00000000-0000-0000-0000-000000000232';
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000231', 'Nelayan Uji 23');
insert into public.cycles (id, nama) values
  ('30000000-0000-0000-0000-000000000231', 'Bongkaran A 23'),
  ('30000000-0000-0000-0000-000000000232', 'Bongkaran B 23');
create temp table uji23 (k text primary key, v uuid);
grant all on uji23 to authenticated;

-- ============================================================ QC: terima dan grading
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000232", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.terima_ikan('10000000-0000-0000-0000-000000000231', 100)$$,
  'KT001', 'Pilih proyeknya, atau bikin proyek baru.', 'terima ikan tanpa proyek ditolak');
insert into uji23 values ('a1', public.terima_ikan('10000000-0000-0000-0000-000000000231', 100, current_date, '30000000-0000-0000-0000-000000000231', ''));
insert into uji23 values ('a2', public.terima_ikan('10000000-0000-0000-0000-000000000231', 80, current_date, '30000000-0000-0000-0000-000000000231', ''));
insert into uji23 values ('b1', public.terima_ikan('10000000-0000-0000-0000-000000000231', 60, current_date, '30000000-0000-0000-0000-000000000232', ''));
select public.cek_mutu_grade(v, 'lulus', jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'kg', 50)), '')
from uji23 where k in ('a1', 'a2', 'b1');

-- ============================================================ produksi
select throws_ok($$select public.mulai_produksi(jsonb_build_array(jsonb_build_object('lot_id', (select v from uji23 where k = 'a1'), 'kg', 10),
    jsonb_build_object('lot_id', (select v from uji23 where k = 'b1'), 'kg', 10)), current_date, '')$$,
  'KT001', null, 'satu produksi nggak boleh nyampur lot dua proyek');
select throws_ok($$select public.mulai_produksi(jsonb_build_array(jsonb_build_object('lot_id', (select v from uji23 where k = 'a1'), 'kg', 10)),
    current_date, '', '30000000-0000-0000-0000-000000000232')$$,
  'KT001', null, 'produksi proyek B nggak boleh pakai lot proyek A');
select lives_ok($$insert into uji23 values ('prd', public.mulai_produksi(jsonb_build_array(jsonb_build_object('lot_id', (select v from uji23 where k = 'a1'), 'kg', 10)),
    current_date, ''))$$, 'produksi dari lot proyek A');
select results_eq($$select cycle_id from public.productions where id = (select v from uji23 where k = 'prd')$$,
  $$values ('30000000-0000-0000-0000-000000000231'::uuid)$$, 'produksi tanpa pilih proyek ikut proyek lotnya');
select throws_ok($$select public.ubah_alokasi_lot((select v from uji23 where k = 'prd'), (select v from uji23 where k = 'b1'), 5, 'tambah')$$,
  'KT001', null, 'koreksi produksi nggak bisa nambah lot proyek lain');
select throws_ok($$select public.koreksi_produksi((select v from uji23 where k = 'prd'), current_date, '30000000-0000-0000-0000-000000000232', null, '', 'salah proyek')$$,
  'KT001', null, 'proyek produksi nggak bisa dipindah beda dari lotnya');
select throws_ok($$select public.koreksi_lot((select v from uji23 where k = 'a1'), 100, current_date, '10000000-0000-0000-0000-000000000231', '30000000-0000-0000-0000-000000000232', '', 'pindah')$$,
  'KT001', null, 'lot yang udah dipakai produksi nggak bisa pindah proyek');
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000231", "role": "authenticated", "aal": "aal1"}';

-- ============================================================ admin: pengajuan pembelian
select throws_ok($$select public.ajukan_pembelian(array[(select v from uji23 where k = 'a2'), (select v from uji23 where k = 'b1')],
  jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'harga_per_kg', 50000)), true)$$,
  'KT001', null, 'satu pengajuan nggak boleh nyampur lot dua proyek');
select lives_ok($$insert into uji23 values ('po', public.ajukan_pembelian(array[(select v from uji23 where k = 'b1')],
  jsonb_build_array(jsonb_build_object('grade_id', (select id from public.grades where kode = 'AB'), 'harga_per_kg', 50000)), true))$$,
  'pengajuan satu proyek jalan');
select results_eq($$select cycle_id from public.purchase_orders where id = (select v from uji23 where k = 'po')$$,
  $$values ('30000000-0000-0000-0000-000000000232'::uuid)$$, 'pengajuan dapat proyek lotnya');
select lives_ok($$select public.koreksi_pembelian((select v from uji23 where k = 'po'), null, '10000000-0000-0000-0000-000000000231',
  '30000000-0000-0000-0000-000000000231', '', 'salah proyek')$$, 'koreksi proyek pembelian');
select results_eq($$select cycle_id from public.lots where id = (select v from uji23 where k = 'b1')$$,
  $$values ('30000000-0000-0000-0000-000000000231'::uuid)$$, 'lotnya ikut pindah proyek');
reset role;

select * from finish();
rollback;

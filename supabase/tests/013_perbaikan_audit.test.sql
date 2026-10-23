-- Perbaikan audit: biaya terhubung ke PO/produksi dengan siklus yang konsisten; siklus bisa ditutup dan dikunci. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner13@uji.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'finance13@uji.local'),
  ('00000000-0000-0000-0000-0000000000e3', 'admin13@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-0000000000e1';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance Uji' where user_id = '00000000-0000-0000-0000-0000000000e2';
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin Uji' where user_id = '00000000-0000-0000-0000-0000000000e3';

insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-0000000000e1', 'Pemasok Audit');
-- Siklus 1 punya PO lunas; siklus 2 kosong (siap ditutup).
insert into public.cycles (id, ref_po_pembeli) values
  ('c2000000-0000-0000-0000-0000000000e1', 'AUDIT-1'),
  ('c2000000-0000-0000-0000-0000000000e2', 'AUDIT-2');
insert into public.purchase_orders (id, supplier_id, cycle_id, kg, harga_per_kg, status_persetujuan) values
  ('a0000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e1', 'c2000000-0000-0000-0000-0000000000e1', 10, 40000, 'disetujui');
insert into public.payments (po_id, jumlah) values ('a0000000-0000-0000-0000-0000000000e1', 400000);

-- ============================================================ Finance: biaya ke PO
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select public.simpan_biaya(null, (select id from public.expense_categories where nama = 'Bahan baku'), 'Es balok untuk PO audit', 150000, current_date, null, 'a0000000-0000-0000-0000-0000000000e1')$$,
  'biaya dihubungkan ke PO tanpa memilih siklus');
select is((select cycle_id::text from public.expenses where uraian = 'Es balok untuk PO audit'), 'c2000000-0000-0000-0000-0000000000e1', 'siklus biaya diambil dari PO-nya');
select is((select po_kode is not null from public.v_expenses where uraian = 'Es balok untuk PO audit'), true, 'daftar biaya menampilkan kode PO');
select throws_ok(
  $$select public.simpan_biaya(null, (select id from public.expense_categories where nama = 'Bahan baku'), 'salah siklus', 1000, current_date, 'c2000000-0000-0000-0000-0000000000e2', 'a0000000-0000-0000-0000-0000000000e1')$$,
  'KT001', null, 'siklus biaya yang berbeda dengan siklus PO ditolak');
select throws_ok(
  $$select public.simpan_biaya(null, (select id from public.expense_categories where nama = 'Bahan baku'), 'produksi fiktif', 1000, current_date, null, null, gen_random_uuid())$$,
  'KT001', null, 'produksi yang tidak ada ditolak');
select throws_ok($$select public.tutup_siklus('c2000000-0000-0000-0000-0000000000e2')$$, '42501', null, 'Finance tidak boleh menutup siklus');

-- ============================================================ Super Admin
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e3", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.tutup_siklus('c2000000-0000-0000-0000-0000000000e2')$$, '42501', null, 'Super Admin tidak boleh menutup siklus');
select throws_ok($$update public.cycles set status = 'ditutup' where id = 'c2000000-0000-0000-0000-0000000000e2'$$, '42501', null, 'status siklus tidak bisa diubah langsung');
select lives_ok($$update public.cycles set catatan = 'kapal A' where id = 'c2000000-0000-0000-0000-0000000000e1'$$, 'keterangan siklus tetap bisa diubah');

-- ============================================================ Owner menutup
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.tutup_siklus('c2000000-0000-0000-0000-0000000000e1')$$, 'KT001', null, 'siklus dengan biaya yang masih draf belum bisa ditutup');
select lives_ok($$select public.tutup_siklus('c2000000-0000-0000-0000-0000000000e2', 'selesai')$$, 'Owner menutup siklus yang sudah beres');
select is((select status || ':' || (ditutup_oleh is not null)::text from public.cycles where id = 'c2000000-0000-0000-0000-0000000000e2'), 'ditutup:true', 'siklus ditutup dan tercatat siapa yang menutup');
select throws_ok($$select public.tutup_siklus('c2000000-0000-0000-0000-0000000000e2')$$, 'KT001', null, 'siklus yang sudah ditutup tidak bisa ditutup lagi');

-- ============================================================ Siklus ditutup terkunci
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select public.simpan_biaya(null, (select id from public.expense_categories where nama = 'Bahan baku'), 'ke siklus tertutup', 1000, current_date, 'c2000000-0000-0000-0000-0000000000e2')$$,
  'KT001', null, 'biaya baru tidak bisa masuk siklus yang ditutup');
select throws_ok($$select public.buka_kembali_siklus('c2000000-0000-0000-0000-0000000000e2', 'salah')$$, '42501', null, 'Finance tidak boleh membuka kembali siklus');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e1", "role": "authenticated", "aal": "aal2"}';
select throws_ok($$select public.buka_kembali_siklus('c2000000-0000-0000-0000-0000000000e2', ' ')$$, 'KT001', null, 'membuka kembali tanpa alasan ditolak');
select lives_ok($$select public.buka_kembali_siklus('c2000000-0000-0000-0000-0000000000e2', 'ada biaya kargo menyusul')$$, 'Owner membuka kembali siklus dengan alasan');
select is((select status from public.cycles where id = 'c2000000-0000-0000-0000-0000000000e2'), 'terbuka', 'siklus kembali terbuka');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$select public.simpan_biaya(null, (select id from public.expense_categories where nama = 'Bahan baku'), 'kargo menyusul', 1000, current_date, 'c2000000-0000-0000-0000-0000000000e2')$$,
  'setelah dibuka kembali, biaya bisa masuk lagi');

select * from finish();
rollback;

-- Notulen 10 Nov 2026 poin 2, 3, 5, 7: nota menyusul, tugas pilihan admin, aturan lampiran, stok per proyek. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

-- ---------------------------------------------------------------- data uji
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000181', 'owner18@uji.local'),
  ('00000000-0000-0000-0000-000000000182', 'finance18@uji.local'),
  ('00000000-0000-0000-0000-000000000183', 'admin18@uji.local'),
  ('00000000-0000-0000-0000-000000000184', 'petugas18@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner 18' where user_id = '00000000-0000-0000-0000-000000000181';
update public.profiles set role_id = 'finance', aktif = true, nama = 'Finance 18' where user_id = '00000000-0000-0000-0000-000000000182';
update public.profiles set role_id = 'super_admin', aktif = true, nama = 'Admin 18' where user_id = '00000000-0000-0000-0000-000000000183';
update public.profiles set role_id = 'petugas_lapangan', aktif = true, nama = 'Petugas 18' where user_id = '00000000-0000-0000-0000-000000000184';

insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000018', 'Nelayan Uji 18');
insert into public.purchase_orders (id, supplier_id, kg, harga_per_kg, catatan) values
  ('a0000000-0000-0000-0000-000000000181', '10000000-0000-0000-0000-000000000018', 100, 40000, 'p18-1'),
  ('a0000000-0000-0000-0000-000000000182', '10000000-0000-0000-0000-000000000018', 50, 40000, 'p18-2'),
  ('a0000000-0000-0000-0000-000000000183', '10000000-0000-0000-0000-000000000018', 20, 40000, 'p18-3');
insert into public.lots (id, kode, po_id, po_kode, supplier_id, kg, sisa_kg) values
  ('c0000000-0000-0000-0000-000000000181', 'LOT-T181', 'a0000000-0000-0000-0000-000000000181', 'PO-T18', '10000000-0000-0000-0000-000000000018', 100, 100);

select has_table('public', 'role_tugas', 'tabel tugas per peran ada');
select has_table('public', 'document_rules', 'tabel aturan lampiran ada');
select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class
  where oid in ('public.role_tugas'::regclass, 'public.document_rules'::regclass, 'public.tugas_pilihan'::regclass)), 'RLS aktif dan dipaksa di tiga tabel baru');

-- ============================================================ Finance: tugas bawaan
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000182", "role": "authenticated", "aal": "aal2"}';
select ok((public.sesi_saya() -> 'izin') ? 'persetujuan.periksa', 'finance tetap memegang tugas memeriksa PO');
select ok((public.sesi_saya() -> 'izin') ? 'nota.susulan', 'finance memegang tugas nota susulan bawaan');
select ok(not ((public.sesi_saya() -> 'izin') ? 'persetujuan.setuju'), 'finance belum memegang tugas menyetujui');
select throws_ok($$select public.atur_tugas('finance', 'persetujuan.setuju', true)$$, '42501', null, 'finance tidak boleh mengatur tugas');

-- ============================================================ Admin: ajukan PO dengan nota menyusul
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000183", "role": "authenticated", "aal": "aal1"}';
select throws_ok($$select public.ajukan_po('a0000000-0000-0000-0000-000000000181')$$, 'KT001',
  'Lampirkan nota, atau tandai "Nota menyusul" bila notanya belum ada.', 'tanpa nota dan tanpa tanda ditolak');
select lives_ok($$select public.ajukan_po('a0000000-0000-0000-0000-000000000181', true)$$, 'ajukan dengan nota menyusul');
select results_eq($$select nota_menyusul, jml_nota from public.v_purchase_orders where id = 'a0000000-0000-0000-0000-000000000181'$$,
  $$values (true, 0)$$, 'PO bertanda nota menyusul, belum ada nota');
select results_eq($$select nota_menyusul from public.v_persetujuan where ref_id = 'a0000000-0000-0000-0000-000000000181'$$,
  array[true], 'kartu persetujuan menampilkan nota menyusul');

-- Admin mengatur tugas.
select lives_ok($$select public.atur_tugas('finance', 'persetujuan.setuju', true)$$, 'admin memberi Finance tugas menyetujui');
select throws_ok($$select public.atur_tugas('super_admin', 'persetujuan.setuju', true)$$, '42501', null, 'admin tidak boleh memberi tugas ke perannya sendiri');
select throws_ok($$select public.atur_tugas('owner', 'persetujuan.setuju', false)$$, 'KT001', null, 'tugas Owner tidak bisa dicabut');
select throws_ok($$select public.atur_tugas('finance', 'pembelian.write', true)$$, 'KT001', null, 'hanya tugas pilihan yang bisa diatur');
select throws_ok($$insert into public.role_tugas (role_id, aksi) values ('petugas_lapangan', 'persetujuan.setuju')$$, '42501', null, 'tugas tidak bisa diisi langsung');
select results_eq($$select string_agg(role_nama, ', ' order by role_nama) from public.pemegang_tugas() where aksi = 'persetujuan.setuju'$$,
  array['Finance, Owner'], 'daftar pemegang tugas menyetujui');

-- ============================================================ Petugas: nota susulan ditolak, foto timbang boleh
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000184", "role": "authenticated", "aal": "aal1"}';
select throws_ok(
  $$insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe) values ('purchase_orders', 'a0000000-0000-0000-0000-000000000181', 'nota', 'po/181/a.jpg', 'a.jpg', 10, 'image/jpeg')$$,
  '42501', null, 'tanpa tugas nota susulan, nota untuk PO yang sudah diajukan ditolak');
select results_eq($$select jenis from public.document_rules where ref_tabel = 'lots' and wajib$$,
  array['foto_timbangan'], 'bawaan: foto timbangan wajib untuk setiap penerimaan');
select lives_ok(
  $$insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe) values ('lots', 'c0000000-0000-0000-0000-000000000181', 'foto_timbangan', 'lots/181/t.jpg', 't.jpg', 10, 'image/jpeg')$$,
  'petugas melampirkan foto timbangan');
select is_empty($$update public.document_rules set wajib = false where ref_tabel = 'lots' returning id$$, 'petugas tidak bisa mengubah aturan lampiran');
select ok(not ((public.sesi_saya() -> 'izin') ? 'persetujuan.setuju'), 'petugas tidak memegang tugas menyetujui');

-- ============================================================ Finance: nota susulan dan menyetujui langsung
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000182", "role": "authenticated", "aal": "aal2"}';
select lives_ok(
  $$insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe) values ('purchase_orders', 'a0000000-0000-0000-0000-000000000181', 'nota', 'po/181/n.jpg', 'n.jpg', 10, 'image/jpeg')$$,
  'finance melampirkan nota susulan');
select results_eq($$select jml_nota from public.v_purchase_orders where id = 'a0000000-0000-0000-0000-000000000181'$$, array[1], 'nota susulan terhitung');
select results_eq(
  $$select (public.setujui_persetujuan(array[(select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000181')], 4000000) ->> 'jumlah')::int$$,
  array[1], 'finance pemegang tugas menyetujui langsung tanpa menunggu diperiksa');
select results_eq($$select status_persetujuan from public.v_purchase_orders where id = 'a0000000-0000-0000-0000-000000000181'$$, array['disetujui'], 'PO disetujui');

-- ============================================================ Admin mencabut, mengubah aturan lampiran
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000183", "role": "authenticated", "aal": "aal1"}';
select lives_ok($$select public.atur_tugas('finance', 'persetujuan.setuju', false)$$, 'admin mencabut tugas menyetujui dari Finance');
select results_eq($$select aktif from public.role_tugas where role_id = 'finance' and aksi = 'persetujuan.setuju'$$, array[false], 'baris tugas tidak dihapus, hanya nonaktif');
select lives_ok($$select public.ajukan_po('a0000000-0000-0000-0000-000000000182', true)$$, 'admin mengajukan PO kedua');
select results_eq($$update public.document_rules set wajib = false where ref_tabel = 'purchase_orders' and jenis = 'nota' returning wajib$$,
  array[false], 'admin menjadikan nota PO opsional');
select lives_ok($$select public.ajukan_po('a0000000-0000-0000-0000-000000000183')$$, 'nota opsional: PO bisa diajukan tanpa tanda');
select results_eq($$select nota_menyusul from public.purchase_orders where id = 'a0000000-0000-0000-0000-000000000183'$$, array[false], 'tanpa tanda, nota menyusul tetap false');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000182", "role": "authenticated", "aal": "aal2"}';
select throws_ok(
  $$select public.setujui_persetujuan(array[(select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000182')], 2000000)$$,
  '42501', null, 'setelah dicabut, finance tidak bisa menyetujui');

-- ============================================================ Owner: yang mengajukan tidak menyetujui sendiri
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000181", "role": "authenticated", "aal": "aal2"}';
select lives_ok($$select public.atur_tugas('super_admin', 'persetujuan.setuju', true)$$, 'owner boleh memberi tugas ke peran mana pun');
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000183", "role": "authenticated", "aal": "aal1"}';
select throws_ok(
  $$select public.setujui_persetujuan(array[(select id from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000182')], 2000000)$$,
  'KT001', null, 'admin tidak boleh menyetujui PO yang diajukannya sendiri');

-- ============================================================ stok ikut proyek produksinya
reset role;
insert into public.cycles (id) values ('d0000000-0000-0000-0000-000000000181');
insert into public.productions (id, cycle_id) values ('e0000000-0000-0000-0000-000000000181', 'd0000000-0000-0000-0000-000000000181');
insert into public.products (id, nama) values ('f0000000-0000-0000-0000-000000000181', 'Loin Uji 18');
insert into public.storage_units (id, product_id, product_nama, kondisi, production_id, kg_masuk, sisa_kg, sisa_dasar_masuk) values
  ('b0000000-0000-0000-0000-000000000181', 'f0000000-0000-0000-0000-000000000181', 'Loin Uji 18', 'beku', 'e0000000-0000-0000-0000-000000000181', 10, 10, 10),
  ('b0000000-0000-0000-0000-000000000182', 'f0000000-0000-0000-0000-000000000181', 'Loin Uji 18', 'beku', null, 5, 5, 5);
select results_eq($$select cycle_id::text from public.storage_units where id = 'b0000000-0000-0000-0000-000000000181'$$,
  array['d0000000-0000-0000-0000-000000000181'], 'stok dari produksi otomatis ikut proyeknya');
select results_eq($$select cycle_id from public.storage_units where id = 'b0000000-0000-0000-0000-000000000182'$$,
  array[null::uuid], 'stok tanpa produksi tidak punya proyek');
select throws_ok($$delete from public.role_tugas$$, '42501', null, 'tugas tidak bisa dihapus');

select * from finish();
rollback;

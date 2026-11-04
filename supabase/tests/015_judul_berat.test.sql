-- Judul persetujuan PO menulis berat dengan format Indonesia. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select is(private.teks_kg(700), '700', 'berat bulat tanpa desimal');
select is(private.teks_kg(1500), '1.500', 'ribuan memakai titik');
select is(private.teks_kg(1234.5), '1.234,5', 'desimal memakai koma');
select is(private.teks_kg(0.25), '0,25', 'di bawah satu kg');
select is(private.teks_kg(1000000), '1.000.000', 'jutaan');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000151', 'owner15@uji.local');
update public.profiles set role_id = 'owner', aktif = true, nama = 'Owner Uji' where user_id = '00000000-0000-0000-0000-000000000151';
insert into public.suppliers (id, nama) values ('10000000-0000-0000-0000-000000000015', 'Pemasok Judul Uji');
insert into public.purchase_orders (id, supplier_id, kg, harga_per_kg)
values ('a0000000-0000-0000-0000-000000000151', '10000000-0000-0000-0000-000000000015', 700, 40000);
insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe)
values ('purchase_orders', 'a0000000-0000-0000-0000-000000000151', 'nota', 'uji/nota-15.pdf', 'nota.pdf', 1024, 'application/pdf');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000151", "role": "authenticated", "aal": "aal1"}';
select public.ajukan_po('a0000000-0000-0000-0000-000000000151');
select is((select judul from public.approvals where ref_id = 'a0000000-0000-0000-0000-000000000151'), 'Beli ikan 700 kg', 'PO 700 kg tidak terbaca 700.000 kg');

select * from finish();
rollback;

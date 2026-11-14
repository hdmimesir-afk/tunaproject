-- SAMAKAN NAMA PEMBELI DI TRANSAKSI LAMA.
-- Pesanan, invoice, stok titipan, dan tagihan jasa nyimpen nama pembeli waktu dibuat.
-- Kalau nama pembeli udah diganti di Pengaturan, baris lama masih nampilin nama lama yang berakhiran "(Demo)".
-- Skrip ini nyamain nama di baris itu dengan nama pembeli yang sekarang. Cuma nyentuh nama yang berakhiran "(Demo)".
-- Cara pakai: Supabase Dashboard > SQL Editor > tempel seluruh berkas ini > Run.

begin;

update public.sales_orders o set buyer_nama = b.nama
  from public.buyers b where b.id = o.buyer_id and o.buyer_nama like '%(Demo)' and b.nama not like '%(Demo)';

update public.invoices i set buyer_nama = b.nama
  from public.buyers b where b.id = i.buyer_id and i.buyer_nama like '%(Demo)' and b.nama not like '%(Demo)';

update public.storage_units u set pemilik_nama = b.nama
  from public.buyers b where b.id = u.buyer_id and u.pemilik_nama like '%(Demo)' and b.nama not like '%(Demo)';

update public.service_charges c set pemilik_nama = b.nama
  from public.buyers b where b.id = c.buyer_id and c.pemilik_nama like '%(Demo)' and b.nama not like '%(Demo)';

commit;

-- Sisa nama "(Demo)" di transaksi. Hasilnya harus kosong (0 baris).
select 'pesanan' as data, kode, buyer_nama as nama from public.sales_orders where buyer_nama like '%(Demo)'
union all select 'invoice', kode, buyer_nama from public.invoices where buyer_nama like '%(Demo)'
union all select 'stok', kode, pemilik_nama from public.storage_units where pemilik_nama like '%(Demo)'
union all select 'tagihan jasa', null, pemilik_nama from public.service_charges where pemilik_nama like '%(Demo)';

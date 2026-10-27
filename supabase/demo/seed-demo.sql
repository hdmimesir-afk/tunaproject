-- DATA CONTOH untuk presentasi ke Owner (KATALIS ERP).
--
-- Cara pakai: Supabase Dashboard > SQL Editor > tempel seluruh berkas ini > Run. Sekali jalan, semuanya masuk atau tidak sama sekali.
-- Cara hapus : jalankan supabase/demo/hapus-demo.sql.
--
-- Skrip ini TIDAK menulis tabel secara mentah untuk alur utama; ia memanggil fungsi asli aplikasi (ajukan_po, setujui_persetujuan,
-- terima_po, cek_mutu, mulai_produksi, simpan_loin, masukkan_hasil_produksi, simpan_pesanan, kirim_pesanan, terbitkan_invoice,
-- terima_pembayaran, ajukan_biaya, ...) seolah-olah Owner yang mengerjakannya, jadi buku kas, stok, persetujuan, dan jejak
-- perubahan terisi persis seperti pemakaian sungguhan. Tanggal digeser ke 18 hari terakhir supaya grafik dan laporan terlihat hidup.
--
-- Penanda data contoh (dipakai hapus-demo.sql): nama pemasok dan pembeli berakhiran "(Demo)", catatan siklus diawali "[DEMO]",
-- uraian biaya dan label jadwal berakhiran "(Demo)", berkas dokumen berawalan "demo/".
-- Catatan: nota dan bukti transfer contoh hanya baris dokumen; berkas aslinya tidak ada di penyimpanan, jadi tidak bisa dibuka.

-- ------------------------------------------------------------------ pembantu (hanya hidup selama sesi ini)
create or replace function pg_temp.d_dok(p_tabel text, p_id uuid, p_jenis text, p_nama text)
returns void language sql as $$
  insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe)
  values (p_tabel, p_id, p_jenis, 'demo/' || p_tabel || '/' || p_id::text || '-' || p_jenis || '.pdf', p_nama, 98304, 'application/pdf');
$$;

-- p_langkah: 0 = draf, 1 = diajukan (menunggu Owner), 2 = disetujui
create or replace function pg_temp.d_po(p_sup uuid, p_cyc uuid, p_tgl date, p_kg numeric, p_harga numeric, p_cat text, p_nota boolean, p_langkah int)
returns uuid language plpgsql as $$
declare
  id_po uuid;
  id_apv uuid;
  tot numeric;
begin
  insert into public.purchase_orders (supplier_id, cycle_id, tanggal, kg, harga_per_kg, catatan)
  values (p_sup, p_cyc, p_tgl, p_kg, p_harga, p_cat) returning id, total into id_po, tot;
  if p_nota then
    perform pg_temp.d_dok('purchase_orders', id_po, 'nota', 'Nota pembelian ikan (contoh).pdf');
  end if;
  if p_langkah >= 1 then
    id_apv := public.ajukan_po(id_po);
    update public.purchase_orders set diajukan_pada = (p_tgl + time '09:00') at time zone 'Asia/Jakarta' where id = id_po;
    update public.approvals set diajukan_pada = (p_tgl + time '09:00') at time zone 'Asia/Jakarta' where id = id_apv;
    if p_langkah >= 2 then
      perform public.setujui_persetujuan(array[id_apv], tot);
      update public.approvals
      set diperiksa_pada = (p_tgl + time '09:40') at time zone 'Asia/Jakarta', disetujui_pada = (p_tgl + time '10:15') at time zone 'Asia/Jakarta'
      where id = id_apv;
    end if;
  end if;
  return id_po;
end;
$$;

-- p_langkah: 0 = draf, 1 = diajukan (menunggu Owner), 2 = disetujui (masuk buku kas)
create or replace function pg_temp.d_biaya(p_kat text, p_uraian text, p_jumlah numeric, p_tgl date, p_cyc uuid, p_prd uuid, p_langkah int)
returns uuid language plpgsql as $$
declare
  k uuid;
  id_e uuid;
begin
  select id into k from public.expense_categories where lower(nama) = lower(p_kat) and aktif limit 1;
  if k is null then
    select id into k from public.expense_categories where aktif order by urutan limit 1;
  end if;
  id_e := public.simpan_biaya(null, k, p_uraian || ' (Demo)', p_jumlah, p_tgl, p_cyc, null, p_prd);
  if p_langkah >= 1 then
    perform pg_temp.d_dok('expenses', id_e, 'nota', 'Nota ' || p_uraian || ' (contoh).pdf');
    perform public.ajukan_biaya(id_e);
    if p_langkah >= 2 then
      perform public.putuskan_biaya(id_e, true, '');
    end if;
  end if;
  return id_e;
end;
$$;

-- ------------------------------------------------------------------ data
do $demo$
declare
  hari date := (now() at time zone 'Asia/Jakarta')::date;
  v_owner uuid;
  -- master
  s1 uuid; s2 uuid; s3 uuid;
  b_pasifik uuid; b_segara uuid; b_hotel uuid;
  g_a uuid; g_b uuid; g_c uuid;
  p_loin uuid;
  partner uuid;
  -- siklus A (selesai diolah, sebagian besar sudah laku) dan B (sedang berjalan)
  cyc_a uuid; cyc_b uuid;
  po1 uuid; po2 uuid; po3 uuid; po4 uuid; po5 uuid;
  lot1 uuid; lot2 uuid; lot3 uuid; lot4 uuid;
  prd_a uuid; prd_b uuid;
  loin_json jsonb; ekor_json jsonb; samping_json jsonb;
  unit_a uuid; unit_b uuid; unit_c uuid;
  ka numeric;
  o1 uuid; o2 uuid; o3 uuid;
  i1 uuid; i2 uuid; i3 uuid;
  t_pasifik uuid; t_segara uuid; t_hotel uuid;
  charge_id uuid;
  hasil jsonb;
  r record;
begin
  -- Pelaku: Owner pertama yang aktif. Klaim sesi ditiru supaya fungsi aplikasi (auth.uid, MFA aal2) menganggapnya Owner.
  select user_id into v_owner from public.profiles where role_id = 'owner' and aktif order by dibuat_pada limit 1;
  if v_owner is null then
    raise exception 'Tidak ada akun Owner yang aktif. Buat dulu dengan npm run buat-owner.';
  end if;
  if exists (select 1 from public.cycles where catatan like '[DEMO]%') then
    raise exception 'Data contoh sudah ada. Jalankan hapus-demo.sql dulu bila ingin membuatnya ulang.';
  end if;
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_owner, 'role', 'authenticated', 'aal', 'aal2')::text, true);

  -- Data acuan yang harus sudah ada (dari migrasi).
  select id into g_a from public.grades where upper(kode) = 'A-SO' and aktif;
  select id into g_b from public.grades where upper(kode) = 'B-SO' and aktif;
  select id into g_c from public.grades where upper(kode) = 'C-SO' and aktif;
  select id into p_loin from public.products where lower(nama) = 'loin tuna' and aktif;
  if g_a is null or g_b is null or g_c is null or p_loin is null then
    raise exception 'Grade A-SO/B-SO/C-SO atau produk "Loin tuna" tidak ditemukan atau nonaktif.';
  end if;
  select id into partner from public.partners where aktif order by nama limit 1;

  -- ---------------------------------------------------------------- master
  insert into public.suppliers (nama, kontak, catatan) values
    ('CV Mina Laut Jaya (Demo)', '0812-1000-0001', '[DEMO] Pemasok tuna dari Bitung') returning id into s1;
  insert into public.suppliers (nama, kontak, catatan) values
    ('UD Samudra Timur (Demo)', '0812-1000-0002', '[DEMO] Pemasok tuna dari Kendari') returning id into s2;
  insert into public.suppliers (nama, kontak, catatan) values
    ('PT Nusantara Bahari (Demo)', '0812-1000-0003', '[DEMO] Pemasok tuna dari Ambon') returning id into s3;
  insert into public.buyers (nama, kontak, tempo_hari) values ('PT Pasifik Seafood Ekspor (Demo)', '0813-2000-0001', 30) returning id into b_pasifik;
  insert into public.buyers (nama, kontak, tempo_hari) values ('CV Segara Prima (Demo)', '0813-2000-0002', 7) returning id into b_segara;
  insert into public.buyers (nama, kontak, tempo_hari) values ('Hotel dan Resto Bahari (Demo)', '0813-2000-0003', 14) returning id into b_hotel;

  insert into public.cycles (tanggal_bongkar, ref_po_pembeli, no_bongkar, catatan)
  values (hari - 18, 'PO-PSF-2026-014', 'BK-DEMO-01', '[DEMO] Siklus contoh: sudah diolah dan hampir lunas') returning id into cyc_a;
  insert into public.cycles (tanggal_bongkar, ref_po_pembeli, no_bongkar, catatan)
  values (hari - 3, 'PO-PSF-2026-015', 'BK-DEMO-02', '[DEMO] Siklus contoh: bongkar terbaru, produksi berjalan') returning id into cyc_b;

  -- ---------------------------------------------------------------- siklus A: beli
  po1 := pg_temp.d_po(s1, cyc_a, hari - 18, 1200, 41000, 'Tuna sirip kuning, bongkar pagi (contoh)', true, 2);
  po2 := pg_temp.d_po(s2, cyc_a, hari - 17, 800, 39500, 'Tuna campur ukuran sedang (contoh)', true, 2);

  lot1 := public.terima_po(po1, 1200, 'Diterima lengkap, suhu aman (contoh)', false);
  lot2 := public.terima_po(po2, 800, 'Diterima lengkap (contoh)', false);
  update public.lots set tanggal_terima = hari - 17 where id = lot1;
  update public.lots set tanggal_terima = hari - 16 where id = lot2;
  perform public.cek_mutu(lot1, 'lulus', g_a, 'Daging merah cerah, tekstur baik (contoh)');
  perform public.cek_mutu(lot2, 'lulus', g_b, 'Sebagian warna agak pucat (contoh)');
  update public.lots set qc_pada = ((tanggal_terima) + time '16:00') at time zone 'Asia/Jakarta' where id in (lot1, lot2);

  perform public.catat_bayar(po1, 30000000, hari - 16, 'Uang muka (contoh)');
  perform public.catat_bayar(po1, 19200000, hari - 12, 'Pelunasan (contoh)');
  perform public.catat_bayar(po2, 31600000, hari - 15, 'Lunas (contoh)');

  -- ---------------------------------------------------------------- siklus A: produksi
  prd_a := public.mulai_produksi(jsonb_build_array(
    jsonb_build_object('lot_id', lot1, 'kg', 1200), jsonb_build_object('lot_id', lot2, 'kg', 800)), hari - 14, 'Produksi loin siklus contoh');
  -- 40 potong loin: 24 grade A, 10 grade B, 6 grade C; 2 potong per ekor.
  select jsonb_agg(jsonb_build_object(
           'id', gen_random_uuid(), 'no_ekor', (i + 1) / 2, 'no_loin', i,
           'grade_id', case when i <= 24 then g_a when i <= 34 then g_b else g_c end,
           'kg', 24.5 + ((i * 37) % 13)) order by i)
  into loin_json from generate_series(1, 40) i;
  perform public.simpan_loin(prd_a, loin_json);
  select jsonb_agg(jsonb_build_object('no_ekor', e, 'berat_utuh_kg', round(s / 0.62, 1)) order by e)
  into ekor_json from (select no_ekor as e, sum(kg) as s from public.production_items where production_id = prd_a group by no_ekor) x;
  perform public.simpan_ekor(prd_a, ekor_json);
  select jsonb_agg(jsonb_build_object('category_id', c.id, 'kg', (array[60, 140, 90, 45])[c.rn]) order by c.rn)
  into samping_json
  from (select id, row_number() over (order by urutan, nama) as rn from public.component_categories where komponen = 'hasil_samping' and aktif limit 4) c;
  perform public.simpan_komponen(prd_a, samping_json, 370, 60);
  perform public.selesaikan_produksi(prd_a);
  perform public.periksa_produksi(prd_a, 'Selisih kecil, wajar untuk penirisan es dan darah (contoh)');
  perform public.setujui_produksi(prd_a, false);
  update public.productions
  set selesai_pada = (tanggal + time '17:00') at time zone 'Asia/Jakarta', qc_pada = (tanggal + time '18:00') at time zone 'Asia/Jakarta',
      owner_pada = ((tanggal + 1) + time '08:30') at time zone 'Asia/Jakarta'
  where id = prd_a;
  update public.production_items set dibuat_pada = (hari - 14 + time '13:00') at time zone 'Asia/Jakarta' where production_id = prd_a;

  -- ---------------------------------------------------------------- siklus A: stok dan penjualan
  for r in select grade_id, sum(kg) as kg from public.production_items where production_id = prd_a and not batal group by grade_id loop
    perform public.masukkan_hasil_produksi(prd_a, p_loin, r.grade_id, 'beku', r.kg,
      case when r.grade_id = g_a then 'Cold Storage 1, rak A' when r.grade_id = g_b then 'Cold Storage 1, rak B' else 'Cold Storage 1, rak C' end,
      false, 'Hasil produksi siklus contoh');
  end loop;
  select id into unit_a from public.storage_units where production_id = prd_a and grade_id = g_a;
  select id into unit_b from public.storage_units where production_id = prd_a and grade_id = g_b;
  select id into unit_c from public.storage_units where production_id = prd_a and grade_id = g_c;
  update public.storage_units set masuk_pada = ((hari - 13) + time '09:00') at time zone 'Asia/Jakarta' where production_id = prd_a;
  update public.storage_movements set waktu = ((hari - 13) + time '09:00') at time zone 'Asia/Jakarta'
  where unit_id in (unit_a, unit_b, unit_c) and jenis = 'masuk';

  select sisa_kg into ka from public.storage_units where id = unit_a;
  -- Pesanan 1: ekspor, grade A hampir semua (sisakan 85 kg di stok).
  o1 := public.simpan_pesanan(null, b_pasifik, cyc_a, hari - 12, 'Kiriman ekspor batch 1 (contoh)',
    jsonb_build_array(jsonb_build_object('unit_id', unit_a, 'kg', ka - 85, 'harga', 128000)));
  perform public.kirim_pesanan(o1, (select jsonb_agg(jsonb_build_object('id', id, 'kg_kirim', kg_pesan, 'kg_diterima', null)) from public.sale_allocations where order_id = o1 and not batal));
  -- Pesanan 2: lokal, grade B dan C. Berat diterima pembeli grade B lebih kecil 2 kg dari berat kirim.
  o2 := public.simpan_pesanan(null, b_segara, cyc_a, hari - 12, 'Pesanan lokal Surabaya (contoh)', jsonb_build_array(
    jsonb_build_object('unit_id', unit_b, 'kg', (select sisa_kg from public.storage_units where id = unit_b), 'harga', 98000),
    jsonb_build_object('unit_id', unit_c, 'kg', (select sisa_kg from public.storage_units where id = unit_c), 'harga', 71000)));
  perform public.kirim_pesanan(o2, (select jsonb_agg(jsonb_build_object('id', id, 'kg_kirim', kg_pesan,
    'kg_diterima', case when grade_kode = 'B-SO' then kg_pesan - 2 end)) from public.sale_allocations where order_id = o2 and not batal));
  update public.sales_orders set tanggal = hari - 12, dikirim_pada = ((hari - 12) + time '14:00') at time zone 'Asia/Jakarta' where id in (o1, o2);

  i1 := public.terbitkan_invoice(o1);
  i2 := public.terbitkan_invoice(o2);
  update public.invoices i
  set tanggal = hari - 12, jatuh_tempo = (hari - 12) + (select tempo_hari from public.sales_orders where id = i.order_id)
  where id in (i1, i2);
  -- Invoice 1 lunas. Invoice 2 baru dibayar 60% dan sudah lewat jatuh tempo (contoh piutang terlambat).
  perform public.terima_pembayaran(i1, (select total from public.invoices where id = i1), hari - 4, 'Transfer penuh (contoh)');
  perform public.terima_pembayaran(i2, round((select total from public.invoices where id = i2) * 0.6, 2), hari - 8, 'Pembayaran sebagian (contoh)');

  -- Pesanan 3: masih draf (belum dikirim) dari sisa stok grade A.
  o3 := public.simpan_pesanan(null, b_hotel, cyc_a, hari - 1, 'Pesanan hotel, kirim besok (contoh)',
    jsonb_build_array(jsonb_build_object('unit_id', unit_a, 'kg', 60, 'harga', 135000)));
  update public.sales_orders set tanggal = hari - 1 where id = o3;

  -- Koreksi stok yang menunggu keputusan Owner.
  perform public.ajukan_koreksi_stok(unit_a, -3.5, 'Selisih timbang ulang saat opname (contoh)');

  -- ---------------------------------------------------------------- biaya siklus A
  perform pg_temp.d_biaya('Produksi', 'Upah tenaga potong dan timbang', 6000000, hari - 14, cyc_a, prd_a, 2);
  perform pg_temp.d_biaya('Pengemasan dan pengiriman', 'Kemasan dan ongkos kirim loin', 8500000, hari - 12, cyc_a, prd_a, 2);
  perform pg_temp.d_biaya('Operasional rutin', 'Listrik dan solar cold storage', 4200000, hari - 6, cyc_a, null, 2);

  -- ---------------------------------------------------------------- siklus B: berjalan
  po3 := pg_temp.d_po(s3, cyc_b, hari - 3, 1500, 42500, 'Tuna besar, bongkar malam (contoh)', true, 2);
  po4 := pg_temp.d_po(s2, cyc_b, hari - 1, 700, 40000, 'Menunggu persetujuan Owner (contoh)', true, 1);
  po5 := pg_temp.d_po(s1, cyc_b, hari, 500, 41500, 'Draf, nota belum dilampirkan (contoh)', false, 0);

  lot3 := public.terima_po(po3, 900, 'Penerimaan pertama (contoh)', false);
  lot4 := public.terima_po(po3, 600, 'Penerimaan kedua, menunggu cek mutu (contoh)', false);
  update public.lots set tanggal_terima = hari - 3 where id = lot3;
  update public.lots set tanggal_terima = hari - 2 where id = lot4;
  perform public.cek_mutu(lot3, 'lulus', g_a, 'Lulus, kualitas baik (contoh)');
  perform public.catat_bayar(po3, 31875000, hari - 2, 'Bayar separuh (contoh)');

  prd_b := public.mulai_produksi(jsonb_build_array(jsonb_build_object('lot_id', lot3, 'kg', 400)), hari - 1, 'Produksi sedang berjalan (contoh)');
  select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'no_ekor', (i + 1) / 2, 'no_loin', i, 'grade_id', g_a, 'kg', 26.5 + ((i * 5) % 7)) order by i)
  into loin_json from generate_series(1, 8) i;
  perform public.simpan_loin(prd_b, loin_json);
  perform pg_temp.d_biaya('Produksi', 'Upah harian bongkar muat', 1800000, hari - 3, cyc_b, null, 2);
  perform pg_temp.d_biaya('Perawatan dan perbaikan', 'Servis mesin ABF', 3800000, hari - 2, null, null, 1);
  perform pg_temp.d_biaya('Aset', 'Timbangan digital 300 kg', 2750000, hari - 1, null, null, 0);

  -- ---------------------------------------------------------------- gudang dingin (titipan) dan jadwal
  t_pasifik := public.terima_titipan(b_pasifik, p_loin, g_a, 'beku', 1500, 'Cold Storage 2', false, 'Titipan loin beku (contoh)');
  t_segara := public.terima_titipan(b_segara, p_loin, g_b, 'fresh', 800, 'ABF, ruang pembekuan', true, 'Titipan fresh untuk dibekukan (contoh)');
  t_hotel := public.terima_titipan(b_hotel, p_loin, g_a, 'beku', 120, 'Cold Storage 2', false, 'Titipan kecil (contoh)');
  update public.storage_units set masuk_pada = ((hari - 12) + time '09:30') at time zone 'Asia/Jakarta' where id = t_pasifik;
  update public.storage_units set masuk_pada = ((hari - 2) + time '15:00') at time zone 'Asia/Jakarta' where id = t_segara;
  update public.storage_units set masuk_pada = ((hari - 5) + time '11:00') at time zone 'Asia/Jakarta' where id = t_hotel;
  update public.storage_movements set waktu = su.masuk_pada from public.storage_units su
  where storage_movements.unit_id = su.id and su.id in (t_pasifik, t_segara, t_hotel) and storage_movements.jenis = 'masuk';
  update public.service_charges set masuk_pada = su.masuk_pada from public.storage_units su
  where service_charges.unit_id = su.id and su.id = t_segara;
  -- Pasifik mengambil 600 kg: tagihan simpan dihitung sistem, lalu diterbitkan sebagai invoice jasa.
  hasil := public.ambil_stok(t_pasifik, 600, 'Diambil pemilik (contoh)');
  charge_id := (hasil ->> 'charge_id')::uuid;
  i3 := public.terbitkan_invoice_jasa(b_pasifik, array[charge_id], 'Jasa simpan titipan (contoh)');

  perform public.buat_booking('produksi', null, 'Produksi siklus B (Demo)',
    (((hari + 1) + time '08:00') at time zone 'Asia/Jakarta'), (((hari + 1) + time '14:00') at time zone 'Asia/Jakarta'), 400, 'Contoh jadwal');
  perform public.buat_booking('abf', partner, 'ABF titipan CV Segara 800 kg (Demo)',
    (((hari + 1) + time '15:00') at time zone 'Asia/Jakarta'), (((hari + 2) + time '03:00') at time zone 'Asia/Jakarta'), 800, 'Contoh jadwal');

  -- ---------------------------------------------------------------- bukti transfer contoh untuk semua pembayaran contoh
  insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe)
  select 'payments', p.id, 'bukti_transfer', 'demo/payments/' || p.id::text || '-bukti.pdf', 'Bukti transfer ' || p.kode || ' (contoh).pdf', 65536, 'application/pdf'
  from public.payments p join public.purchase_orders po on po.id = p.po_id where po.cycle_id in (cyc_a, cyc_b);
  insert into public.documents (ref_tabel, ref_id, jenis, path, nama_asli, ukuran, tipe)
  select 'customer_payments', c.id, 'bukti_transfer', 'demo/customer_payments/' || c.id::text || '-bukti.pdf', 'Bukti transfer ' || c.kode || ' (contoh).pdf', 65536, 'application/pdf'
  from public.customer_payments c join public.invoices i on i.id = c.invoice_id where i.buyer_id in (b_pasifik, b_segara, b_hotel);
end;
$demo$;

-- Ringkasan hasil (muncul sebagai tabel di SQL Editor).
select 'pemasok' as data, count(*)::int as jumlah from public.suppliers where nama like '%(Demo)'
union all select 'pembeli', count(*) from public.buyers where nama like '%(Demo)'
union all select 'siklus', count(*) from public.cycles where catatan like '[DEMO]%'
union all select 'PO', count(*) from public.purchase_orders where cycle_id in (select id from public.cycles where catatan like '[DEMO]%')
union all select 'lot', count(*) from public.lots where cycle_id in (select id from public.cycles where catatan like '[DEMO]%')
union all select 'produksi', count(*) from public.productions where cycle_id in (select id from public.cycles where catatan like '[DEMO]%')
union all select 'pesanan', count(*) from public.sales_orders where cycle_id in (select id from public.cycles where catatan like '[DEMO]%')
union all select 'invoice', count(*) from public.invoices where buyer_id in (select id from public.buyers where nama like '%(Demo)')
union all select 'baris buku kas', count(*) from public.ledger where cycle_id in (select id from public.cycles where catatan like '[DEMO]%') or ref_id in (select id from public.invoices where false)
union all select 'unit stok', count(*) from public.storage_units where production_id in (select id from public.productions where cycle_id in (select id from public.cycles where catatan like '[DEMO]%')) or buyer_id in (select id from public.buyers where nama like '%(Demo)');

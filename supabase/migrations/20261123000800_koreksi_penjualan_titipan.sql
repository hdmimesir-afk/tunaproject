-- 23 Nov 2026: koreksi di tiap step (permintaan tim Katalis), lanjutan koreksi biaya. Semua wajib alasan dan kecatat.
--   1. Uang masuk dari pembeli: koreksi (jumlah, tanggal, catatan) langsung berlaku, buku kasnya ikut dibenerin;
--      hapus permanen buat yg salah input/dobel (kecatat di log hapus).
--   2. Pesanan yg udah dikirim: koreksi berat kirim, berat diterima pembeli, harga, tanggal, catatan. Stok ikut disesuaikan
--      (yg dikurangin balik ke stok, yg ditambah diambil dari stok). Kalau invoice-nya udah terbit, isinya dihitung ulang;
--      total baru nggak boleh di bawah yg udah dibayar.
--   3. Titipan gudang: koreksi pemilik, produk, grade, kondisi, berat masuk, proyek, catatan. Berat nggak boleh di bawah yg
--      udah keluar. Pemilik cuma bisa diganti selama belum ada tagihan simpan.
--   4. Hapus data dobel per item (permanen, kecatat di log hapus), selama belum dipakai di step berikutnya:
--      lot (belum diajukan dan belum diproduksi), titipan (masih utuh, belum ditagih), pesanan (draf atau batal).
-- Bulan yg udah tutup buku tetap terkunci buat uang masuk.

-- ============================================================ catatan koreksi
alter table public.koreksi_data drop constraint koreksi_data_tabel_check;
alter table public.koreksi_data add constraint koreksi_data_tabel_check
  check (tabel in ('lots', 'purchase_orders', 'payments', 'productions', 'cycles', 'expenses', 'sales_orders', 'customer_payments', 'storage_units'));
drop policy "koreksi terbaca" on public.koreksi_data;
create policy "koreksi terbaca" on public.koreksi_data for select to authenticated using (
  case when tabel in ('purchase_orders', 'payments') then (select private.has_permission('pembelian.read'))
       when tabel = 'expenses' then (select private.has_permission('keuangan.read'))
       when tabel in ('sales_orders', 'customer_payments') then (select private.has_permission('penjualan.read'))
       when tabel = 'storage_units' then (select private.has_permission('gudang.read'))
       else (select private.has_permission('mutu.read')) or (select private.has_permission('produksi.read')) or (select private.has_permission('pembelian.read'))
  end
);

-- Bantu: cek alasan dan catat log hapus satu item.
create or replace function private.cek_alasan(p_alasan text, p_pesan text default 'Tulis alasannya.')
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception '%', p_pesan using errcode = 'KT001';
  end if;
  if length(trim(p_alasan)) > 500 then
    raise exception 'Alasannya kepanjangan, maksimal 500 huruf.' using errcode = 'KT001';
  end if;
end;
$$;
revoke all on function private.cek_alasan(text, text) from public, anon, authenticated;

create or replace function private.log_hapus_satu(p_bagian text, p_alasan text, p_rincian jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  nama text;
  total int;
  id_log bigint;
begin
  select coalesce(nullif(p.nama, ''), 'pengguna') into nama from public.profiles p where p.user_id = (select auth.uid());
  select coalesce(sum((e ->> 'jumlah')::int), 0) into total from jsonb_array_elements(p_rincian) e;
  insert into public.hapus_data_log (oleh, oleh_nama, bagian, alasan, rincian, total)
  values ((select auth.uid()), coalesce(nama, 'pengguna'), array[p_bagian], trim(p_alasan), p_rincian, total)
  returning id into id_log;
  return id_log;
end;
$$;
revoke all on function private.log_hapus_satu(text, text, jsonb) from public, anon, authenticated;

-- Baris rincian log: {tabel, label, jumlah, kode[]}. Jumlah 0 nggak ikut.
create or replace function private.baris_log(p_tabel text, p_label text, p_jumlah int, p_kode text[] default '{}')
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when p_jumlah > 0
    then jsonb_build_array(jsonb_build_object('tabel', p_tabel, 'label', p_label, 'jumlah', p_jumlah, 'kode', to_jsonb(p_kode)))
    else '[]'::jsonb end;
$$;
revoke all on function private.baris_log(text, text, int, text[]) from public, anon, authenticated;

-- ============================================================ 1. uang masuk dari pembeli
create or replace function public.koreksi_uang_masuk(p_payment uuid, p_jumlah numeric, p_tanggal date, p_catatan text, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.customer_payments;
  i public.invoices;
  lain numeric(16,2);
  tgl date;
begin
  perform private.wajib_izin('terima_bayar.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan koreksinya.');
  select * into c from public.customer_payments where id = p_payment for update;
  if not found then
    raise exception 'Uang masuk nggak ketemu.' using errcode = 'KT001';
  end if;
  select * into i from public.invoices where id = c.invoice_id for update;
  if p_jumlah is null or p_jumlah <= 0 or round(p_jumlah, 2) <> p_jumlah then
    raise exception 'Jumlah bayar harus lebih dari nol dengan paling banyak dua desimal.' using errcode = 'KT001';
  end if;
  tgl := coalesce(p_tanggal, c.tanggal);
  if private.periode_ditutup(c.tanggal) or private.periode_ditutup(tgl) then
    raise exception 'Buku bulan % udah ditutup, jadi uang masuk % nggak bisa dikoreksi.',
      to_char(case when private.periode_ditutup(c.tanggal) then c.tanggal else tgl end, 'YYYY-MM'), c.kode using errcode = 'KT001';
  end if;
  select coalesce(sum(jumlah), 0) into lain from public.customer_payments where invoice_id = c.invoice_id and id <> c.id;
  if lain + p_jumlah > i.total then
    raise exception 'Pembayaran melebihi tagihan %. Maksimal %.', i.kode, (i.total - lain)::text using errcode = 'KT001';
  end if;
  update public.customer_payments set jumlah = p_jumlah, tanggal = tgl, catatan = coalesce(trim(p_catatan), '') where id = c.id;
  update public.ledger set jumlah = p_jumlah, tanggal = tgl where ref_tabel = 'customer_payments' and ref_id = c.id;
  perform private.catat_koreksi('customer_payments', c.id, c.kode, p_alasan,
    jsonb_build_object('jumlah', c.jumlah, 'tanggal', c.tanggal, 'catatan', c.catatan),
    jsonb_build_object('jumlah', p_jumlah, 'tanggal', tgl, 'catatan', coalesce(trim(p_catatan), '')));
end;
$$;

create or replace function public.hapus_uang_masuk(p_payment uuid, p_alasan text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.customer_payments;
  i public.invoices;
  n_dok int;
  n_kas int;
  n_kor int;
begin
  perform private.wajib_izin('terima_bayar.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan kenapa uang masuknya dihapus.');
  select * into c from public.customer_payments where id = p_payment for update;
  if not found then
    raise exception 'Uang masuk nggak ketemu.' using errcode = 'KT001';
  end if;
  if private.periode_ditutup(c.tanggal) then
    raise exception 'Buku bulan % udah ditutup, jadi uang masuk % nggak bisa dihapus.', to_char(c.tanggal, 'YYYY-MM'), c.kode using errcode = 'KT001';
  end if;
  select * into i from public.invoices where id = c.invoice_id;
  select count(*) into n_dok from public.documents where ref_tabel = 'customer_payments' and ref_id = c.id;
  select count(*) into n_kas from public.ledger where ref_tabel = 'customer_payments' and ref_id = c.id;
  select count(*) into n_kor from public.koreksi_data where tabel = 'customer_payments' and ref_id = c.id;
  perform set_config('katalis.hapus_resmi', 'ya', true);
  delete from public.documents where ref_tabel = 'customer_payments' and ref_id = c.id;
  delete from public.ledger where ref_tabel = 'customer_payments' and ref_id = c.id;
  delete from public.koreksi_data where tabel = 'customer_payments' and ref_id = c.id;
  delete from public.customer_payments where id = c.id;
  perform set_config('katalis.hapus_resmi', '', true);
  return private.log_hapus_satu('uang_masuk', p_alasan,
    private.baris_log('customer_payments', 'Uang masuk', 1,
      array[c.kode || ' · ' || coalesce(i.kode, '') || ' · ' || coalesce(i.buyer_nama, '') || ' · Rp' || to_char(c.jumlah, 'FM999G999G999G990D00')])
    || private.baris_log('documents', 'Bukti bayar', n_dok)
    || private.baris_log('ledger', 'Baris buku kas', n_kas)
    || private.baris_log('koreksi_data', 'Riwayat koreksi', n_kor));
end;
$$;

-- ============================================================ 2. pesanan yg udah dikirim
-- p_baris: [{"id": alokasi, "kg_kirim": 49.5, "kg_diterima": null, "harga_per_kg": 85000}, ...]. Baris yg nggak dikirim nggak berubah.
create or replace function public.koreksi_pesanan_terkirim(p_order uuid, p_tanggal date, p_catatan text, p_baris jsonb, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  a public.sale_allocations;
  u public.storage_units;
  inv public.invoices;
  r record;
  selisih numeric(12,3);
  dipesan numeric(12,3);
  sebelum jsonb := '[]'::jsonb;
  sesudah jsonb := '[]'::jsonb;
  baris_inv jsonb;
  total_baru numeric(16,2);
  dibayar numeric(16,2);
begin
  perform private.wajib_izin('penjualan.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan koreksinya.');
  select * into o from public.sales_orders where id = p_order for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'KT001';
  end if;
  if o.status <> 'terkirim' then
    raise exception 'Pesanan % masih %. Yg belum dikirim cukup diubah lewat Ubah pesanan.', o.kode, o.status using errcode = 'KT001';
  end if;
  if p_baris is not null and jsonb_typeof(p_baris) <> 'array' then
    raise exception 'Isian barisnya nggak valid.' using errcode = 'KT001';
  end if;

  -- Kunci unit yg kena, urut id (sama kayak kirim_pesanan) biar nggak saling kunci.
  perform 1 from public.storage_units
  where id in (select unit_id from public.sale_allocations where order_id = o.id and not batal)
  order by id for update;

  for r in select * from jsonb_to_recordset(coalesce(p_baris, '[]'::jsonb)) as x(id uuid, kg_kirim numeric, kg_diterima numeric, harga_per_kg numeric) order by id loop
    select * into a from public.sale_allocations where id = r.id and order_id = o.id and not batal;
    if not found then
      raise exception 'Baris pesanan tidak ditemukan.' using errcode = 'KT001';
    end if;
    perform private.valid_kg(r.kg_kirim, 'Berat kirim');
    if r.kg_diterima is not null then
      perform private.valid_kg(r.kg_diterima, 'Berat diterima pembeli');
      if r.kg_diterima > r.kg_kirim then
        raise exception 'Berat diterima pembeli nggak boleh lebih dari berat kirim.' using errcode = 'KT001';
      end if;
    end if;
    if r.harga_per_kg is null or r.harga_per_kg <= 0 or round(r.harga_per_kg, 2) <> r.harga_per_kg then
      raise exception 'Harga per kg harus lebih dari nol.' using errcode = 'KT001';
    end if;

    selisih := round(r.kg_kirim, 3) - a.kg_kirim;
    if selisih <> 0 then
      select * into u from public.storage_units where id = a.unit_id;
      if selisih > 0 then
        dipesan := private.kg_dipesan(u.id);
        if selisih > u.sisa_kg - dipesan then
          raise exception 'Stok % tinggal % kg%, jadi berat kirim cuma bisa ditambah % kg.',
            u.kode, trim_scale(u.sisa_kg)::text,
            case when dipesan > 0 then format(', %s kg di antaranya udah dipesan %s', trim_scale(dipesan), private.pesanan_pemegang(u.id)) else '' end,
            trim_scale(greatest(u.sisa_kg - dipesan, 0))::text using errcode = 'KT001';
        end if;
      end if;
      update public.storage_units
      set sisa_kg = sisa_kg - selisih, sisa_dasar_masuk = greatest(sisa_dasar_masuk - selisih, 0),
          status = case when sisa_kg - selisih > 0 then 'aktif' else 'habis' end
      where id = u.id;
      insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan)
      values (u.id, 'koreksi', -selisih, -selisih, 'Koreksi penjualan ' || o.kode || ': ' || trim(p_alasan));
    end if;

    sebelum := sebelum || jsonb_build_array(jsonb_build_object('unit', a.unit_kode, 'kg_kirim', a.kg_kirim, 'kg_diterima', a.kg_diterima, 'harga', a.harga_per_kg));
    sesudah := sesudah || jsonb_build_array(jsonb_build_object('unit', a.unit_kode, 'kg_kirim', round(r.kg_kirim, 3), 'kg_diterima', r.kg_diterima, 'harga', r.harga_per_kg));
    update public.sale_allocations set kg_kirim = round(r.kg_kirim, 3), kg_diterima = r.kg_diterima, harga_per_kg = r.harga_per_kg where id = a.id;
  end loop;

  update public.sales_orders set tanggal = coalesce(p_tanggal, o.tanggal), catatan = coalesce(trim(p_catatan), o.catatan) where id = o.id;

  -- Invoice yg udah terbit dihitung ulang (rumusnya sama kayak terbitkan_invoice).
  select * into inv from public.invoices where order_id = o.id and status = 'terbit' for update;
  if found then
    select jsonb_agg(jsonb_build_object(
             'uraian', x.product_nama || coalesce(' ' || x.grade_kode, ''), 'unit', x.unit_kode, 'kelompok', x.kelompok,
             'kg', coalesce(x.kg_diterima, x.kg_kirim), 'dasar', case when x.kg_diterima is not null then 'diterima pembeli' else 'dikirim' end,
             'harga_per_kg', x.harga_per_kg, 'jumlah', round(coalesce(x.kg_diterima, x.kg_kirim) * x.harga_per_kg, 2)) order by x.dibuat_pada, x.id),
           sum(round(coalesce(x.kg_diterima, x.kg_kirim) * x.harga_per_kg, 2))
    into baris_inv, total_baru
    from public.sale_allocations x where x.order_id = o.id and not x.batal;
    select coalesce(sum(jumlah), 0) into dibayar from public.customer_payments where invoice_id = inv.id;
    if total_baru < dibayar then
      raise exception 'Total baru % lebih kecil dari yg udah dibayar %. Koreksi atau hapus uang masuknya dulu.', total_baru::text, dibayar::text using errcode = 'KT001';
    end if;
    update public.invoices set baris = baris_inv, total = total_baru where id = inv.id;
  end if;

  perform private.catat_koreksi('sales_orders', o.id, o.kode, p_alasan,
    jsonb_build_object('tanggal', o.tanggal, 'catatan', o.catatan, 'baris', sebelum),
    jsonb_build_object('tanggal', coalesce(p_tanggal, o.tanggal), 'catatan', coalesce(trim(p_catatan), o.catatan), 'baris', sesudah));
end;
$$;

create or replace function public.hapus_pesanan(p_order uuid, p_alasan text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.sales_orders;
  n_baris int;
  n_dok int;
  n_kor int;
begin
  perform private.wajib_izin('penjualan.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan kenapa pesanannya dihapus.');
  select * into o from public.sales_orders where id = p_order for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = 'KT001';
  end if;
  if o.status = 'terkirim' or exists (select 1 from public.invoices where order_id = o.id) then
    raise exception 'Pesanan % udah dikirim, jadi nggak bisa dihapus. Pakai Koreksi aja.', o.kode using errcode = 'KT001';
  end if;
  select count(*) into n_baris from public.sale_allocations where order_id = o.id;
  select count(*) into n_dok from public.documents where ref_tabel = 'sales_orders' and ref_id = o.id;
  select count(*) into n_kor from public.koreksi_data where tabel = 'sales_orders' and ref_id = o.id;
  perform set_config('katalis.hapus_resmi', 'ya', true);
  delete from public.documents where ref_tabel = 'sales_orders' and ref_id = o.id;
  delete from public.koreksi_data where tabel = 'sales_orders' and ref_id = o.id;
  delete from public.sale_allocations where order_id = o.id;
  delete from public.sales_orders where id = o.id;
  perform set_config('katalis.hapus_resmi', '', true);
  return private.log_hapus_satu('pesanan', p_alasan,
    private.baris_log('sales_orders', 'Pesanan', 1, array[o.kode || ' · ' || o.buyer_nama || ' · ' || o.status])
    || private.baris_log('sale_allocations', 'Isi pesanan', n_baris)
    || private.baris_log('documents', 'Lampiran', n_dok)
    || private.baris_log('koreksi_data', 'Riwayat koreksi', n_kor));
end;
$$;

-- ============================================================ 3. titipan gudang
create or replace function public.koreksi_titipan(
  p_unit uuid, p_buyer uuid, p_product uuid, p_grade uuid, p_kondisi text, p_kg_masuk numeric, p_cycle uuid, p_catatan text, p_alasan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u public.storage_units;
  b public.buyers;
  prod public.products;
  kode_grade text;
  keluar numeric(12,3);
  selisih numeric(12,3);
  isi numeric;
  kap numeric;
  ada_tagihan boolean;
  abf_ditagih boolean;
begin
  perform private.wajib_izin('gudang.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan koreksinya.');
  select * into u from public.storage_units where id = p_unit for update;
  if not found or u.buyer_id is null then
    raise exception 'Titipan nggak ketemu.' using errcode = 'KT001';
  end if;
  perform private.valid_kg(p_kg_masuk, 'Berat masuk');
  select * into b from public.buyers where id = p_buyer;
  if not found then
    raise exception 'Pilih pelanggan pemilik titipan.' using errcode = 'KT001';
  end if;
  select * into prod from public.products where id = p_product;
  if not found then
    raise exception 'Pilih produk.' using errcode = 'KT001';
  end if;
  if p_kondisi not in ('fresh', 'beku') then
    raise exception 'Kondisi harus fresh atau beku.' using errcode = 'KT001';
  end if;
  if u.perlu_abf and p_kondisi <> 'fresh' then
    raise exception 'Titipan ini masuk ABF, jadi kondisinya tetap fresh.' using errcode = 'KT001';
  end if;
  if p_grade is not null then
    select g.kode into kode_grade from public.grades g where g.id = p_grade;
    if kode_grade is null then
      raise exception 'Grade nggak dikenal.' using errcode = 'KT001';
    end if;
  end if;
  if p_cycle is not null and p_cycle is distinct from u.cycle_id
     and not exists (select 1 from public.cycles c where c.id = p_cycle and c.status = 'terbuka') then
    raise exception 'Proyeknya nggak ketemu atau udah ditutup.' using errcode = 'KT001';
  end if;

  ada_tagihan := exists (select 1 from public.service_charges where unit_id = u.id and jenis <> 'abf');
  abf_ditagih := exists (select 1 from public.service_charges where unit_id = u.id and jenis = 'abf' and invoice_id is not null);
  if p_buyer <> u.buyer_id and (ada_tagihan or abf_ditagih) then
    raise exception 'Titipan % udah ada tagihannya, jadi pemiliknya nggak bisa diganti.', u.kode using errcode = 'KT001';
  end if;

  keluar := u.kg_masuk - u.sisa_kg;
  selisih := round(p_kg_masuk, 3) - u.kg_masuk;
  if p_kg_masuk < keluar then
    raise exception 'Titipan % udah keluar % kg, jadi berat masuknya nggak bisa kurang dari itu.', u.kode, trim_scale(keluar)::text using errcode = 'KT001';
  end if;
  if selisih <> 0 and abf_ditagih then
    raise exception 'Biaya ABF titipan % udah ditagih, jadi beratnya nggak bisa diubah.', u.kode using errcode = 'KT001';
  end if;
  if selisih > 0 then
    perform pg_advisory_xact_lock(hashtext('kapasitas_gudang'));
    select coalesce(sum(sisa_kg), 0) into isi from public.storage_units where status = 'aktif';
    kap := private.kapasitas_total();
    if isi + selisih > kap then
      raise exception 'Kapasitas gudang % kg nggak cukup: terisi % kg, tambahan % kg.', kap::text, isi::text, selisih::text using errcode = 'KT001';
    end if;
    if u.room_id is not null then
      perform private.cek_ruangan(u.room_id, selisih);
    end if;
  end if;

  update public.storage_units
  set buyer_id = b.id, pemilik_nama = b.nama, product_id = prod.id, product_nama = prod.nama, grade_id = p_grade, grade_kode = kode_grade,
      kondisi = p_kondisi, kg_masuk = round(p_kg_masuk, 3), sisa_kg = sisa_kg + selisih, sisa_dasar_masuk = greatest(sisa_dasar_masuk + selisih, 0),
      status = case when sisa_kg + selisih > 0 then 'aktif' else 'habis' end, cycle_id = p_cycle, catatan = coalesce(trim(p_catatan), '')
  where id = u.id;
  if selisih <> 0 then
    insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan)
    values (u.id, 'koreksi', selisih, selisih, 'Koreksi titipan: ' || trim(p_alasan));
  end if;
  -- Biaya ABF yg belum ditagih ikut pemilik dan berat baru.
  update public.service_charges
  set buyer_id = b.id, pemilik_nama = b.nama, kg_dasar = round(p_kg_masuk, 3), jumlah = round(round(p_kg_masuk, 3) * tarif_per_kg, 2)
  where unit_id = u.id and jenis = 'abf' and invoice_id is null;

  perform private.catat_koreksi('storage_units', u.id, u.kode, p_alasan,
    jsonb_build_object('pemilik', u.pemilik_nama, 'produk', u.product_nama, 'grade', u.grade_kode, 'kondisi', u.kondisi, 'kg', u.kg_masuk, 'cycle_id', u.cycle_id, 'catatan', u.catatan),
    jsonb_build_object('pemilik', b.nama, 'produk', prod.nama, 'grade', kode_grade, 'kondisi', p_kondisi, 'kg', round(p_kg_masuk, 3), 'cycle_id', p_cycle, 'catatan', coalesce(trim(p_catatan), '')));
end;
$$;

create or replace function public.hapus_titipan(p_unit uuid, p_alasan text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  u public.storage_units;
  n_gerak int;
  n_tagih int;
  n_dok int;
  n_kor int;
begin
  perform private.wajib_izin('gudang.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan kenapa titipannya dihapus.');
  select * into u from public.storage_units where id = p_unit for update;
  if not found or u.buyer_id is null then
    raise exception 'Titipan nggak ketemu.' using errcode = 'KT001';
  end if;
  if exists (select 1 from public.storage_movements where unit_id = u.id and jenis not in ('masuk', 'koreksi'))
     or exists (select 1 from public.sale_allocations where unit_id = u.id) then
    raise exception 'Titipan % udah ada yg keluar, jadi nggak bisa dihapus. Pakai Koreksi aja.', u.kode using errcode = 'KT001';
  end if;
  if exists (select 1 from public.service_charges where unit_id = u.id and (jenis <> 'abf' or invoice_id is not null)) then
    raise exception 'Titipan % udah ada tagihannya, jadi nggak bisa dihapus.', u.kode using errcode = 'KT001';
  end if;
  select count(*) into n_gerak from public.storage_movements where unit_id = u.id;
  select count(*) into n_tagih from public.service_charges where unit_id = u.id;
  select count(*) into n_dok from public.documents where ref_tabel = 'storage_units' and ref_id = u.id;
  select count(*) into n_kor from public.koreksi_data where tabel = 'storage_units' and ref_id = u.id;
  perform set_config('katalis.hapus_resmi', 'ya', true);
  delete from public.service_charges where unit_id = u.id;
  delete from public.storage_movements where unit_id = u.id;
  delete from public.documents where ref_tabel = 'storage_units' and ref_id = u.id;
  delete from public.koreksi_data where tabel = 'storage_units' and ref_id = u.id;
  delete from public.storage_units where id = u.id;
  perform set_config('katalis.hapus_resmi', '', true);
  return private.log_hapus_satu('titipan', p_alasan,
    private.baris_log('storage_units', 'Titipan', 1,
      array[u.kode || ' · ' || u.pemilik_nama || ' · ' || u.product_nama || coalesce(' ' || u.grade_kode, '') || ' · ' || trim_scale(u.kg_masuk)::text || ' kg'])
    || private.baris_log('storage_movements', 'Catatan stok', n_gerak)
    || private.baris_log('service_charges', 'Biaya ABF (belum ditagih)', n_tagih)
    || private.baris_log('documents', 'Lampiran', n_dok)
    || private.baris_log('koreksi_data', 'Riwayat koreksi', n_kor));
end;
$$;

-- ============================================================ 4. lot dobel
create or replace function public.hapus_lot(p_lot uuid, p_alasan text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lots;
  n_ekor int;
  n_grade int;
  n_dok int;
  n_kor int;
begin
  perform private.wajib_izin('penerimaan.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan kenapa lotnya dihapus.');
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
  end if;
  if l.po_id is not null then
    raise exception 'Lot % udah diajukan pembeliannya, jadi nggak bisa dihapus. Pakai Koreksi aja.', l.kode using errcode = 'KT001';
  end if;
  if exists (select 1 from public.lot_allocations where lot_id = l.id) then
    raise exception 'Lot % udah dipakai produksi, jadi nggak bisa dihapus. Pakai Koreksi aja.', l.kode using errcode = 'KT001';
  end if;
  select count(*) into n_ekor from public.lot_ekor where lot_id = l.id;
  select count(*) into n_grade from public.lot_grades where lot_id = l.id;
  select count(*) into n_dok from public.documents where ref_tabel = 'lots' and ref_id = l.id;
  select count(*) into n_kor from public.koreksi_data where tabel = 'lots' and ref_id = l.id;
  perform set_config('katalis.hapus_resmi', 'ya', true);
  delete from public.lot_ekor where lot_id = l.id;
  delete from public.lot_grades where lot_id = l.id;
  delete from public.documents where ref_tabel = 'lots' and ref_id = l.id;
  delete from public.koreksi_data where tabel = 'lots' and ref_id = l.id;
  delete from public.lots where id = l.id;
  perform set_config('katalis.hapus_resmi', '', true);
  return private.log_hapus_satu('lot', p_alasan,
    private.baris_log('lots', 'Lot', 1, array[l.kode || ' · ' || trim_scale(l.kg)::text || ' kg · ' || to_char(l.tanggal_terima, 'YYYY-MM-DD')])
    || private.baris_log('lot_ekor', 'Ekor', n_ekor)
    || private.baris_log('lot_grades', 'Grading', n_grade)
    || private.baris_log('documents', 'Lampiran', n_dok)
    || private.baris_log('koreksi_data', 'Riwayat koreksi', n_kor));
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.koreksi_uang_masuk(uuid, numeric, date, text, text)', 'public.hapus_uang_masuk(uuid, text)',
    'public.koreksi_pesanan_terkirim(uuid, date, text, jsonb, text)', 'public.hapus_pesanan(uuid, text)',
    'public.koreksi_titipan(uuid, uuid, uuid, uuid, text, numeric, uuid, text, text)', 'public.hapus_titipan(uuid, text)',
    'public.hapus_lot(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

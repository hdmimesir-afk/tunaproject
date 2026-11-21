-- 22 Nov 2026: fitur Hapus data di Pengaturan (permintaan user). Pengecualian dari aturan "tidak ada hapus", dengan pengaman:
--   1. Cuma pemegang izin data.hapus (Owner, karena Owner pegang semua izin). Peran lain nggak punya izin ini.
--   2. Pengguna tetap nggak punya hak DELETE di tabel mana pun. Hapus cuma lewat fungsi public.hapus_data
--      (security definer), yang nyalain penanda katalis.hapus_resmi selama transaksinya aja.
--   3. Wajib alasan dan ngetik HAPUS. Tiap hapus kecatat di hapus_data_log (siapa, kapan, bagian, alasan,
--      jumlah per jenis data, dan kode yang kehapus). Log ini nggak bisa diubah atau dihapus.
--   4. Data yang nyambung ikut kehapus biar nggak bolong: hapus penerimaan ikut produksi dari lot itu, hapus produksi ikut
--      stok hasilnya dan penjualan dari stok itu. Hapus penjualan aja: stoknya balik lagi. Hapus produksi aja: sisa lot balik lagi.
--   5. Data master (pemasok, pembeli, produk, grade, ruangan, tarif, akun, barang penunjang) nggak pernah ikut kehapus.
--      Jejak perubahan (activity_log) juga nggak dihapus. Berkas foto di penyimpanan nggak dihapus, cuma baris lampirannya.

-- ============================================================ penjaga hapus
-- Hapus ditolak, kecuali dari fungsi hapus resmi (penanda transaksi lokal, cuma bisa dipasang fungsi security definer
-- karena pengguna nggak punya hak DELETE sama sekali).
create or replace function private.tolak_hapus()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('katalis.hapus_resmi', true) = 'ya' then
    return old;
  end if;
  raise exception 'Data % tidak boleh dihapus. Batalkan atau koreksi dengan alasan.', tg_table_name
    using errcode = '42501';
end;
$$;

-- Jejak perubahan dan log hapus: nggak pernah boleh dihapus, termasuk dari fungsi hapus resmi.
create or replace function private.tolak_hapus_mutlak()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Data % tidak boleh dihapus.', tg_table_name using errcode = '42501';
end;
$$;
revoke all on function private.tolak_hapus_mutlak() from public, anon, authenticated;
drop trigger activity_log_tolak_hapus on public.activity_log;
create trigger activity_log_tolak_hapus before delete on public.activity_log
  for each row execute function private.tolak_hapus_mutlak();

-- ============================================================ log hapus
create table public.hapus_data_log (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  oleh uuid default auth.uid(),
  oleh_nama text not null default '',
  bagian text[] not null,
  alasan text not null check (length(trim(alasan)) between 1 and 500),
  rincian jsonb not null default '[]'::jsonb,
  total int not null default 0
);
create index hapus_data_log_waktu_idx on public.hapus_data_log (waktu desc);
alter table public.hapus_data_log enable row level security;
alter table public.hapus_data_log force row level security;
revoke all on public.hapus_data_log from anon;
revoke insert, update, delete, truncate on public.hapus_data_log from authenticated;
grant select on public.hapus_data_log to authenticated;
create policy hapus_data_log_baca on public.hapus_data_log for select to authenticated
  using ((select private.has_permission('data.hapus')));
create trigger hapus_data_log_tolak_hapus before delete on public.hapus_data_log
  for each row execute function private.tolak_hapus_mutlak();
create trigger hapus_data_log_tolak_ubah before update on public.hapus_data_log
  for each row execute function private.tolak_ubah_jejak();

-- ============================================================ rencana hapus
-- Ngisi tabel sementara rencana_hapus (tabel, id, kode) dengan semua baris yang bakal dihapus, termasuk yang ikut kehapus.
create or replace function private.rencana_hapus(p_bagian text[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  semua_bagian text[] := array['pembelian', 'produksi', 'penjualan', 'titipan', 'keuangan', 'absensi', 'penunjang', 'proyek'];
  b text[];
  x text;
begin
  if p_bagian is null or cardinality(p_bagian) = 0 then
    raise exception 'Pilih minimal satu bagian yang mau dihapus.' using errcode = 'KT001';
  end if;
  b := case when 'semua' = any(p_bagian) then semua_bagian else p_bagian end;
  foreach x in array b loop
    if not x = any(semua_bagian) then
      raise exception 'Bagian "%" nggak dikenal.', x using errcode = 'KT001';
    end if;
  end loop;

  drop table if exists pg_temp.rencana_hapus;
  create temp table rencana_hapus (tabel text not null, id text not null, kode text, primary key (tabel, id));

  -- 1. Penerimaan dan pembelian.
  if 'pembelian' = any(b) then
    insert into rencana_hapus select 'lots', id::text, kode from public.lots;
    insert into rencana_hapus select 'lot_grades', id::text, null from public.lot_grades;
    insert into rencana_hapus select 'lot_ekor', id::text, no_tag from public.lot_ekor;
    insert into rencana_hapus select 'purchase_orders', id::text, coalesce(kode, 'pengajuan belum terbit') from public.purchase_orders;
    insert into rencana_hapus select 'purchase_order_lines', id::text, null from public.purchase_order_lines;
    insert into rencana_hapus select 'payments', id::text, kode from public.payments;
  end if;

  -- 2. Produksi: semua (kalau dipilih) ditambah produksi yang pakai lot yang dihapus.
  if 'produksi' = any(b) then
    insert into rencana_hapus select 'productions', id::text, kode from public.productions;
  end if;
  insert into rencana_hapus select 'productions', p.id::text, p.kode from public.productions p
  where exists (select 1 from public.lot_allocations a join rencana_hapus r on r.tabel = 'lots' and r.id = a.lot_id::text where a.production_id = p.id)
  on conflict do nothing;
  insert into rencana_hapus select 'lot_allocations', a.id::text, a.lot_kode from public.lot_allocations a
  where a.production_id::text in (select id from rencana_hapus where tabel = 'productions');
  insert into rencana_hapus select 'production_items', i.id::text, null from public.production_items i
  where i.production_id::text in (select id from rencana_hapus where tabel = 'productions');
  insert into rencana_hapus select 'production_items_history', h.id::text, null from public.production_items_history h
  where h.production_id::text in (select id from rencana_hapus where tabel = 'productions');
  insert into rencana_hapus select 'production_loin_totals', t.id::text, null from public.production_loin_totals t
  where t.production_id::text in (select id from rencana_hapus where tabel = 'productions');
  insert into rencana_hapus select 'production_components', c.id::text, null from public.production_components c
  where c.production_id::text in (select id from rencana_hapus where tabel = 'productions');
  insert into rencana_hapus select 'production_fish', f.id::text, null from public.production_fish f
  where f.production_id::text in (select id from rencana_hapus where tabel = 'productions');

  -- 3. Stok: hasil dari produksi yang dihapus, ditambah titipan (kalau dipilih).
  insert into rencana_hapus select 'storage_units', u.id::text, u.kode from public.storage_units u
  where u.production_id::text in (select id from rencana_hapus where tabel = 'productions');
  if 'titipan' = any(b) then
    insert into rencana_hapus select 'storage_units', u.id::text, u.kode from public.storage_units u
    where u.buyer_id is not null and u.production_id is null
    on conflict do nothing;
    insert into rencana_hapus select 'bookings', id::text, label from public.bookings;
  end if;

  -- 4. Penjualan: semua (kalau dipilih) ditambah pesanan yang pakai stok yang dihapus.
  if 'penjualan' = any(b) then
    insert into rencana_hapus select 'sales_orders', id::text, kode from public.sales_orders;
  end if;
  insert into rencana_hapus select 'sales_orders', o.id::text, o.kode from public.sales_orders o
  where exists (
    select 1 from public.sale_allocations a
    where a.order_id = o.id
      and (a.unit_id::text in (select id from rencana_hapus where tabel = 'storage_units')
        or a.production_id::text in (select id from rencana_hapus where tabel = 'productions'))
  )
  on conflict do nothing;
  insert into rencana_hapus select 'sale_allocations', a.id::text, null from public.sale_allocations a
  where a.order_id::text in (select id from rencana_hapus where tabel = 'sales_orders');
  insert into rencana_hapus select 'invoices', i.id::text, i.kode from public.invoices i
  where i.order_id::text in (select id from rencana_hapus where tabel = 'sales_orders');
  if 'titipan' = any(b) then
    -- Invoice jasa gudang (tanpa pesanan jual).
    insert into rencana_hapus select 'invoices', i.id::text, i.kode from public.invoices i where i.order_id is null
    on conflict do nothing;
  end if;
  insert into rencana_hapus select 'customer_payments', c.id::text, c.kode from public.customer_payments c
  where c.invoice_id::text in (select id from rencana_hapus where tabel = 'invoices');

  -- Gerakan stok: semua gerakan unit yang dihapus, ditambah gerakan keluar dari penjualan yang dihapus (stoknya dibalikin).
  insert into rencana_hapus select 'storage_movements', m.id::text, null from public.storage_movements m
  where m.unit_id::text in (select id from rencana_hapus where tabel = 'storage_units');
  insert into rencana_hapus select 'storage_movements', m.id::text, null from public.storage_movements m
  where m.jenis = 'keluar'
    and m.alasan in (select 'Penjualan ' || o.kode from public.sales_orders o where o.id::text in (select id from rencana_hapus where tabel = 'sales_orders'))
  on conflict do nothing;

  -- Tagihan jasa gudang dari unit yang dihapus, atau semua kalau titipan dipilih.
  insert into rencana_hapus select 'service_charges', s.id::text, s.kode from public.service_charges s
  where s.unit_id::text in (select id from rencana_hapus where tabel = 'storage_units')
     or s.movement_id::text in (select id from rencana_hapus where tabel = 'storage_movements')
     or 'titipan' = any(b);

  -- 5. Keuangan.
  if 'keuangan' = any(b) then
    insert into rencana_hapus select 'expenses', id::text, kode from public.expenses;
    insert into rencana_hapus select 'ledger', id::text, kode from public.ledger;
    insert into rencana_hapus select 'accounting_periods', id::text, bulan::text from public.accounting_periods;
  end if;
  -- Buku kas yang nyambung ke transaksi yang dihapus.
  insert into rencana_hapus select 'ledger', l.id::text, l.kode from public.ledger l
  where l.ref_id is not null and exists (select 1 from rencana_hapus r where r.tabel = l.ref_tabel and r.id = l.ref_id::text)
  on conflict do nothing;

  -- 6. Absensi dan barang penunjang.
  if 'absensi' = any(b) then
    insert into rencana_hapus select 'attendance', id::text, null from public.attendance;
    insert into rencana_hapus select 'leave_requests', id::text, null from public.leave_requests;
  end if;
  if 'penunjang' = any(b) then
    insert into rencana_hapus select 'supply_movements', id::text, null from public.supply_movements;
  end if;

  -- Persetujuan, lampiran, dan riwayat koreksi yang nyambung ke baris yang dihapus.
  insert into rencana_hapus select 'approvals', a.id::text, a.kode from public.approvals a
  where exists (select 1 from rencana_hapus r where r.tabel = a.ref_tabel and r.id = a.ref_id::text)
  on conflict do nothing;
  insert into rencana_hapus select 'documents', d.id::text, d.nama_asli from public.documents d
  where exists (select 1 from rencana_hapus r where r.tabel = d.ref_tabel and r.id = d.ref_id::text)
  on conflict do nothing;
  insert into rencana_hapus select 'koreksi_data', k.id::text, k.kode from public.koreksi_data k
  where exists (select 1 from rencana_hapus r where r.tabel = k.tabel and r.id = k.ref_id::text)
  on conflict do nothing;

  -- 7. Proyek: cuma yang udah nggak dipakai data mana pun yang tersisa.
  if 'proyek' = any(b) then
    insert into rencana_hapus select 'cycles', c.id::text, c.kode from public.cycles c
    where not exists (select 1 from public.lots t where t.cycle_id = c.id and t.id::text not in (select id from rencana_hapus where tabel = 'lots'))
      and not exists (select 1 from public.purchase_orders t where t.cycle_id = c.id and t.id::text not in (select id from rencana_hapus where tabel = 'purchase_orders'))
      and not exists (select 1 from public.productions t where t.cycle_id = c.id and t.id::text not in (select id from rencana_hapus where tabel = 'productions'))
      and not exists (select 1 from public.storage_units t where t.cycle_id = c.id and t.id::text not in (select id from rencana_hapus where tabel = 'storage_units'))
      and not exists (select 1 from public.sales_orders t where t.cycle_id = c.id and t.id::text not in (select id from rencana_hapus where tabel = 'sales_orders'))
      and not exists (select 1 from public.invoices t where t.cycle_id = c.id and t.id::text not in (select id from rencana_hapus where tabel = 'invoices'))
      and not exists (select 1 from public.expenses t where t.cycle_id = c.id and t.id::text not in (select id from rencana_hapus where tabel = 'expenses'))
      and not exists (select 1 from public.ledger t where t.cycle_id = c.id and t.id::text not in (select id from rencana_hapus where tabel = 'ledger'));
  end if;
  return b;
end;
$$;

-- Nama yang gampang dibaca buat tiap jenis data, urut sesuai alur.
create or replace function private.label_hapus(p_tabel text)
returns table (label text, urut int)
language sql
immutable
set search_path = ''
as $$
  select v.label, v.urut from (values
    ('cycles', 'Proyek', 1), ('lots', 'Lot ikan (penerimaan)', 2), ('lot_ekor', 'Data per ekor', 3), ('lot_grades', 'Grading lot', 4),
    ('purchase_orders', 'Pembelian (PO)', 5), ('purchase_order_lines', 'Rincian harga PO', 6), ('payments', 'Bayar ke pemasok', 7),
    ('approvals', 'Persetujuan', 8), ('productions', 'Produksi', 9), ('lot_allocations', 'Pemakaian lot di produksi', 10),
    ('production_loin_totals', 'Loin total per grade', 11), ('production_items', 'Timbangan loin per potong', 12),
    ('production_items_history', 'Riwayat timbangan', 13), ('production_components', 'Hasil samping dan limbah', 14),
    ('production_fish', 'Berat per ekor produksi', 15), ('storage_units', 'Stok dan titipan', 16), ('storage_movements', 'Gerakan stok', 17),
    ('service_charges', 'Tagihan jasa gudang', 18), ('bookings', 'Jadwal ABF dan mesin', 19), ('sales_orders', 'Pesanan jual', 20),
    ('sale_allocations', 'Isi pesanan', 21), ('invoices', 'Invoice', 22), ('customer_payments', 'Uang masuk', 23),
    ('expenses', 'Biaya', 24), ('ledger', 'Buku kas', 25), ('accounting_periods', 'Tutup buku', 26),
    ('attendance', 'Absen', 27), ('leave_requests', 'Izin dan sakit', 28), ('supply_movements', 'Gerakan barang penunjang', 29),
    ('documents', 'Lampiran', 30), ('koreksi_data', 'Riwayat koreksi', 31)
  ) v(tabel, label, urut) where v.tabel = p_tabel;
$$;

-- Ringkasan rencana: per jenis data, jumlah dan contoh kodenya.
create or replace function private.ringkas_rencana()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return (select coalesce(jsonb_agg(jsonb_build_object('tabel', x.tabel, 'label', x.label, 'jumlah', x.jumlah, 'kode', x.kode) order by x.urut), '[]'::jsonb)
  from (
    select r.tabel, coalesce(l.label, r.tabel) as label, coalesce(l.urut, 99) as urut, count(*)::int as jumlah,
      coalesce((array_agg(r.kode order by r.kode) filter (where r.kode is not null))[1:300], array[]::text[]) as kode
    from pg_temp.rencana_hapus r
    left join lateral private.label_hapus(r.tabel) l on true
    group by r.tabel, l.label, l.urut
  ) x);
end;
$$;

-- ============================================================ pratinjau dan hapus
-- Pratinjau: nggak ngubah apa pun, cuma ngitung yang bakal kehapus.
create or replace function public.pratinjau_hapus_data(p_bagian text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  hasil jsonb;
begin
  perform private.wajib_izin('data.hapus');
  perform private.rencana_hapus(p_bagian);
  hasil := private.ringkas_rencana();
  drop table if exists pg_temp.rencana_hapus;
  return hasil;
end;
$$;

create or replace function public.hapus_data(p_bagian text[], p_alasan text, p_konfirmasi text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  b text[];
  rincian jsonb;
  total int;
  id_log bigint;
  nama text;
  kosong boolean;
  s record;
begin
  perform private.wajib_izin('data.hapus');
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan kenapa datanya dihapus.' using errcode = 'KT001';
  end if;
  if length(trim(p_alasan)) > 500 then
    raise exception 'Alasannya kepanjangan, maksimal 500 huruf.' using errcode = 'KT001';
  end if;
  if coalesce(trim(p_konfirmasi), '') <> 'HAPUS' then
    raise exception 'Ketik HAPUS (huruf besar semua) buat konfirmasi.' using errcode = 'KT001';
  end if;

  b := private.rencana_hapus(p_bagian);
  rincian := private.ringkas_rencana();
  select coalesce(sum((e ->> 'jumlah')::int), 0) into total from jsonb_array_elements(rincian) e;
  if total = 0 then
    drop table if exists pg_temp.rencana_hapus;
    raise exception 'Nggak ada data yang bisa dihapus di bagian yang dipilih.' using errcode = 'KT001';
  end if;

  perform set_config('katalis.hapus_resmi', 'ya', true);

  -- Balikin yang tersisa: stok yang terjual lewat pesanan yang dihapus, sisa lot yang dipakai produksi yang dihapus.
  update public.storage_units u
  set sisa_kg = u.sisa_kg + g.kg, sisa_dasar_masuk = u.sisa_dasar_masuk + g.kg_dasar, status = 'aktif'
  from (
    select m.unit_id, sum(abs(m.kg)) as kg, sum(abs(m.kg_dasar)) as kg_dasar
    from public.storage_movements m
    where m.id::text in (select id from pg_temp.rencana_hapus where tabel = 'storage_movements') and m.jenis = 'keluar' and m.status = 'disetujui'
    group by m.unit_id
  ) g
  where u.id = g.unit_id and u.id::text not in (select id from pg_temp.rencana_hapus where tabel = 'storage_units');
  update public.lots l
  set sisa_kg = l.sisa_kg + g.kg
  from (
    select a.lot_id, sum(a.kg) as kg from public.lot_allocations a
    where a.id::text in (select id from pg_temp.rencana_hapus where tabel = 'lot_allocations')
    group by a.lot_id
  ) g
  where l.id = g.lot_id and l.id::text not in (select id from pg_temp.rencana_hapus where tabel = 'lots');

  -- Putus sambungan dari data yang tetap ke data yang dihapus.
  update public.service_charges set invoice_id = null
  where invoice_id::text in (select id from pg_temp.rencana_hapus where tabel = 'invoices')
    and id::text not in (select id from pg_temp.rencana_hapus where tabel = 'service_charges');
  update public.expenses set po_id = null
  where po_id::text in (select id from pg_temp.rencana_hapus where tabel = 'purchase_orders')
    and id::text not in (select id from pg_temp.rencana_hapus where tabel = 'expenses');
  update public.expenses set production_id = null
  where production_id::text in (select id from pg_temp.rencana_hapus where tabel = 'productions')
    and id::text not in (select id from pg_temp.rencana_hapus where tabel = 'expenses');

  -- Hapus: anak dulu, baru induknya.
  for s in select unnest(array[
    'customer_payments', 'service_charges', 'sale_allocations', 'invoices', 'sales_orders', 'storage_movements', 'storage_units',
    'lot_allocations', 'production_items_history', 'production_items', 'production_loin_totals', 'production_components',
    'production_fish', 'expenses', 'productions', 'lot_grades', 'lot_ekor', 'lots', 'purchase_order_lines', 'payments',
    'purchase_orders', 'ledger', 'accounting_periods', 'approvals', 'documents', 'koreksi_data', 'attendance', 'leave_requests',
    'supply_movements', 'bookings', 'cycles'
  ]) as tabel loop
    execute format('delete from public.%I where id::text in (select id from pg_temp.rencana_hapus where tabel = %L)', s.tabel, s.tabel);
  end loop;

  -- Kode mulai lagi dari awal buat tabel yang udah kosong.
  for s in select * from (values
    ('po_kode_seq', 'purchase_orders'), ('lot_kode_seq', 'lots'), ('approval_kode_seq', 'approvals'), ('payment_kode_seq', 'payments'),
    ('production_kode_seq', 'productions'), ('storage_unit_kode_seq', 'storage_units'), ('service_charge_kode_seq', 'service_charges'),
    ('sales_order_kode_seq', 'sales_orders'), ('invoice_kode_seq', 'invoices'), ('customer_payment_kode_seq', 'customer_payments'),
    ('expense_kode_seq', 'expenses'), ('ledger_kode_seq', 'ledger'), ('cycles_kode_seq', 'cycles')
  ) v(urutan, tabel) loop
    if to_regclass('public.' || s.urutan) is not null then
      execute format('select not exists (select 1 from public.%I)', s.tabel) into kosong;
      if kosong then
        execute format('alter sequence public.%I restart with 1', s.urutan);
      end if;
    end if;
  end loop;

  perform set_config('katalis.hapus_resmi', '', true);
  drop table if exists pg_temp.rencana_hapus;

  select coalesce(nullif(p.nama, ''), 'pengguna') into nama from public.profiles p where p.user_id = (select auth.uid());
  select coalesce(sum((e ->> 'jumlah')::int), 0) into total from jsonb_array_elements(rincian) e;
  insert into public.hapus_data_log (oleh, oleh_nama, bagian, alasan, rincian, total)
  values ((select auth.uid()), coalesce(nama, 'pengguna'), b, trim(p_alasan), rincian, total)
  returning id into id_log;
  return id_log;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['private.rencana_hapus(text[])', 'private.label_hapus(text)', 'private.ringkas_rencana()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
  execute 'revoke all on function public.pratinjau_hapus_data(text[]) from public, anon';
  execute 'grant execute on function public.pratinjau_hapus_data(text[]) to authenticated';
  execute 'revoke all on function public.hapus_data(text[], text, text) from public, anon';
  execute 'grant execute on function public.hapus_data(text[], text, text) to authenticated';
end;
$$;

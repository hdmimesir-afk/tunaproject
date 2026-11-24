-- Jalanin sekali di Supabase SQL Editor (produksi), SEBELUM push. Isinya sama persis dengan migrasi:
--   20261126000100_kode_tanggal: semua kode jadi XXX/YY/MM/DD/NNN (NNN mulai lagi tiap bulan), kode lama dinomori ulang
--   20261126000200_hapus_produksi: hapus record produksi (per baris dan satu produksi utuh)
-- Satu transaksi: kalau ada yg gagal, nggak ada yg berubah. Aman dijalanin ulang (kode yg udah format baru nggak diubah lagi).
-- PERHATIAN: kode lama (PRD-001, PO-0001, LOT-002, dst) diganti semua. Log hapus sama jejak perubahan tetap nyimpen kode lama.
-- Versi 2 (26 Nov): nomor ulang nggak pakai tabel bantu lagi (versi 1 error "relation private.kode_peta does not exist").

begin;

-- =====================================================================
-- 20261126000100_kode_tanggal
-- =====================================================================
-- 26 Nov 2026 (permintaan tim Katalis, tahap 3): semua kode jadi XXX/YY/MM/DD/NNN, contoh PRD/26/11/24/001.
--   Tanggalnya tanggal catatan itu (tanggal produksi, tanggal terima lot, tanggal bayar, dst), NNN mulai lagi dari 001
--   tiap bulan per jenis kode. Kode lama dinomori ulang ngikut tanggalnya (urut tanggal, terus urutan kode lama), dan teks
--   yang nyimpen kode lama (kode PO di lot, kode lot di pemakaian produksi, uraian buku kas, judul persetujuan, alasan gerak
--   stok, isi invoice, riwayat koreksi) ikut diganti. Log hapus dan jejak perubahan nggak bisa diubah, jadi kode lama tetap
--   kebaca di sana.
--   Kode PO tetap baru terbit waktu pembeliannya disetujui (pakai tanggal PO).

-- ============================================================ penghitung per bulan
create table if not exists private.kode_counter (
  prefix text not null,
  bulan text not null,
  terakhir int not null check (terakhir > 0),
  primary key (prefix, bulan)
);
revoke all on private.kode_counter from public, anon, authenticated;

create or replace function private.kode_baru(p_prefix text, p_tanggal date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  t date := coalesce(p_tanggal, (now() at time zone 'Asia/Jakarta')::date);
  n int;
begin
  insert into private.kode_counter (prefix, bulan, terakhir) values (p_prefix, to_char(t, 'YYYY-MM'), 1)
  on conflict (prefix, bulan) do update set terakhir = private.kode_counter.terakhir + 1
  returning terakhir into n;
  return p_prefix || '/' || to_char(t, 'YY/MM/DD') || '/' || lpad(n::text, greatest(3, length(n::text)), '0');
end;
$$;
revoke all on function private.kode_baru(text, date) from public, anon, authenticated;

-- Isi kode pas insert kalau kosong. Argumen trigger: prefix, nama kolom tanggal.
create or replace function private.isi_kode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v text;
  t date;
begin
  if new.kode is null or new.kode = '' then
    v := to_jsonb(new) ->> tg_argv[1];
    t := case when v is null then null
              when length(v) <= 10 then v::date
              else (v::timestamptz at time zone 'Asia/Jakarta')::date end;
    new.kode := private.kode_baru(tg_argv[0], t);
  end if;
  return new;
end;
$$;
revoke all on function private.isi_kode() from public, anon, authenticated;

-- PO: kodenya diisi setujui_persetujuan pakai format lama; diganti format baru pakai tanggal PO.
create or replace function private.kode_po_terbit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.kode is null and new.kode is not null and position('/' in new.kode) = 0 then
    new.kode := private.kode_baru('PO', new.tanggal);
  end if;
  return new;
end;
$$;
revoke all on function private.kode_po_terbit() from public, anon, authenticated;

-- ============================================================ nomor ulang kode lama
-- Semua dikerjain di satu blok (tanpa tabel bantu), petanya disimpen di variabel jsonb {kode lama: kode baru}.

-- Ganti kode lama di dalam teks pakai peta (cuma kode yang utuh, PO-0001 nggak kena di PO-00010).
create or replace function private.ganti_kode_lama(t text, peta jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  m text;
  hasil text := t;
begin
  if t is null then
    return t;
  end if;
  for m in select distinct x[1] from regexp_matches(t, '\m((?:SIK|PO|LOT|APV|BYR|PRD|STK|JSA|PJ|INV|TRM|BYA|KAS|BRG)-[0-9]+)\M', 'g') as x loop
    if peta ? m then
      hasil := regexp_replace(hasil, '\m' || m || '\M', peta ->> m, 'g');
    end if;
  end loop;
  return hasil;
end;
$$;

do $$
declare
  r record;
  t text;
  m jsonb;
  peta jsonb := '{}'::jsonb;
  pola text := '(SIK|PO|LOT|APV|BYR|PRD|STK|JSA|PJ|INV|TRM|BYA|KAS|BRG)-[0-9]';
  semua text[] := array['cycles', 'purchase_orders', 'lots', 'approvals', 'payments', 'productions', 'storage_units', 'service_charges',
    'sales_orders', 'invoices', 'customer_payments', 'expenses', 'ledger', 'supply_items', 'lot_allocations', 'sale_allocations',
    'koreksi_data', 'storage_movements'];
begin
  -- Pemicu jejak, kunci tutup buku, buku kas, dan larangan ubah dimatiin sebentar: ini cuma ganti nama kode, bukan ubah transaksi.
  foreach t in array semua loop
    execute format('alter table public.%I disable trigger user', t);
  end loop;

  for r in select * from (values
    ('cycles', 'SIK', '(dibuat_pada at time zone ''Asia/Jakarta'')::date'),
    ('purchase_orders', 'PO', 'tanggal'),
    ('lots', 'LOT', 'tanggal_terima'),
    ('approvals', 'APV', '(dibuat_pada at time zone ''Asia/Jakarta'')::date'),
    ('payments', 'BYR', 'tanggal'),
    ('productions', 'PRD', 'tanggal'),
    ('storage_units', 'STK', '(masuk_pada at time zone ''Asia/Jakarta'')::date'),
    ('service_charges', 'JSA', '(dibuat_pada at time zone ''Asia/Jakarta'')::date'),
    ('sales_orders', 'PJ', 'tanggal'),
    ('invoices', 'INV', 'tanggal'),
    ('customer_payments', 'TRM', 'tanggal'),
    ('expenses', 'BYA', 'tanggal'),
    ('ledger', 'KAS', 'tanggal'),
    ('supply_items', 'BRG', '(dibuat_pada at time zone ''Asia/Jakarta'')::date')
  ) v(tabel, prefix, tgl) loop
    -- Nomor urut per bulan ngikut tanggal, terus urutan kode lama (angkanya, biar LOT-1000 nggak duluan dari LOT-999).
    execute format($q$
      select coalesce(jsonb_object_agg(lama, %L || '/' || to_char(tgl, 'YY/MM/DD') || '/' || lpad(rn::text, greatest(3, length(rn::text)), '0')), '{}'::jsonb)
      from (
        select kode as lama, %s as tgl,
               row_number() over (partition by to_char(%s, 'YYYY-MM') order by %s, nullif(regexp_replace(kode, '\D', '', 'g'), '')::bigint nulls last, kode) as rn
        from public.%I where kode is not null and position('/' in kode) = 0
      ) x
    $q$, r.prefix, r.tgl, r.tgl, r.tgl, r.tabel) into m;
    if m <> '{}'::jsonb then
      execute format('update public.%I set kode = $1 ->> kode where kode is not null and $1 ? kode', r.tabel) using m;
      -- Penghitung bulan-bulan lama mulai dari nomor terakhir hasil nomor ulang.
      insert into private.kode_counter (prefix, bulan, terakhir)
      select r.prefix, '20' || substr(v, length(r.prefix) + 2, 2) || '-' || substr(v, length(r.prefix) + 5, 2), max(split_part(v, '/', 5)::int)
      from jsonb_each_text(m) as e(k, v) group by 2
      on conflict (prefix, bulan) do update set terakhir = greatest(private.kode_counter.terakhir, excluded.terakhir);
      peta := peta || m;
    end if;
  end loop;

  if peta <> '{}'::jsonb then
    update public.lots set po_kode = private.ganti_kode_lama(po_kode, peta) where po_kode ~ pola;
    update public.lot_allocations set lot_kode = private.ganti_kode_lama(lot_kode, peta) where lot_kode ~ pola;
    update public.storage_units set production_kode = private.ganti_kode_lama(production_kode, peta) where production_kode ~ pola;
    update public.storage_units set catatan = private.ganti_kode_lama(catatan, peta) where catatan ~ pola;
    update public.sale_allocations set unit_kode = private.ganti_kode_lama(unit_kode, peta) where unit_kode ~ pola;
    update public.koreksi_data set kode = private.ganti_kode_lama(kode, peta) where kode ~ pola;
    update public.approvals set judul = private.ganti_kode_lama(judul, peta) where judul ~ pola;
    update public.approvals set payload = private.ganti_kode_lama(payload::text, peta)::jsonb where payload::text ~ pola;
    update public.ledger set uraian = private.ganti_kode_lama(uraian, peta) where uraian ~ pola;
    update public.storage_movements set alasan = private.ganti_kode_lama(alasan, peta) where alasan ~ pola;
    update public.invoices set baris = private.ganti_kode_lama(baris::text, peta)::jsonb where baris::text ~ pola;
  end if;

  foreach t in array semua loop
    execute format('alter table public.%I enable trigger user', t);
  end loop;
end;
$$;

drop function private.ganti_kode_lama(text, jsonb);

-- ============================================================ kode baru otomatis
do $$
declare
  r record;
begin
  for r in select * from (values
    ('cycles', 'SIK', 'dibuat_pada'), ('lots', 'LOT', 'tanggal_terima'), ('approvals', 'APV', 'dibuat_pada'), ('payments', 'BYR', 'tanggal'),
    ('productions', 'PRD', 'tanggal'), ('storage_units', 'STK', 'masuk_pada'), ('service_charges', 'JSA', 'dibuat_pada'),
    ('sales_orders', 'PJ', 'tanggal'), ('invoices', 'INV', 'tanggal'), ('customer_payments', 'TRM', 'tanggal'),
    ('expenses', 'BYA', 'tanggal'), ('ledger', 'KAS', 'tanggal'), ('supply_items', 'BRG', 'dibuat_pada')
  ) v(tabel, prefix, kolom) loop
    execute format('alter table public.%I alter column kode drop default', r.tabel);
    execute format('drop trigger if exists %I on public.%I', r.tabel || '_kode', r.tabel);
    execute format('create trigger %I before insert on public.%I for each row execute function private.isi_kode(%L, %L)', r.tabel || '_kode', r.tabel, r.prefix, r.kolom);
  end loop;
end;
$$;
drop trigger if exists purchase_orders_kode_terbit on public.purchase_orders;
create trigger purchase_orders_kode_terbit before update of kode on public.purchase_orders for each row execute function private.kode_po_terbit();

-- =====================================================================
-- 20261126000200_hapus_produksi
-- =====================================================================
-- 26 Nov 2026 (permintaan tim Katalis, tahap 3): hapus record di produksi, buat yang kecatat dobel. Permanen, wajib alasan,
-- kecatat di log hapus (sama kayak hapus lot, pesanan, titipan).
--   1. hapus_baris_produksi: satu baris di produksi yang masih berjalan (pemakaian lot, loin per potong, ekor, komponen,
--      loin total per grade). Pemakaian lot yang dihapus, beratnya balik ke sisa lot. Produksi yang udah selesai dibuka lagi
--      dulu (Buka lagi), biar nggak ngubah yang udah diperiksa diam-diam.
--   2. hapus_produksi: satu produksi utuh. Ditolak kalau hasilnya udah dijual, diambil, atau ditagih. Kalau hasilnya udah
--      masuk stok (otomatis) tapi belum kemana-mana, stoknya ikut kehapus. Berat lot balik, biaya yg nyambung dilepas.

create or replace function public.hapus_baris_produksi(p_tabel text, p_id uuid, p_alasan text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
  p public.productions;
  label text;
  rincian text;
  a public.lot_allocations;
  n_riwayat int := 0;
begin
  perform private.wajib_izin('produksi.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan kenapa barisnya dihapus.');
  if p_tabel not in ('lot_allocations', 'production_items', 'production_fish', 'production_components', 'production_loin_totals') then
    raise exception 'Jenis baris produksi nggak dikenal.' using errcode = 'KT001';
  end if;
  execute format('select production_id from public.%I where id = $1', p_tabel) into pid using p_id;
  if pid is null then
    raise exception 'Barisnya nggak ketemu.' using errcode = 'KT001';
  end if;
  select * into p from public.productions where id = pid for update;
  if p.status <> 'berjalan' then
    raise exception 'Produksi % udah %. Pencet Buka lagi dulu kalau mau hapus barisnya.', p.kode, replace(p.status, '_', ' ') using errcode = 'KT001';
  end if;

  perform set_config('katalis.hapus_resmi', 'ya', true);
  if p_tabel = 'lot_allocations' then
    select * into a from public.lot_allocations where id = p_id for update;
    if (select count(*) from public.lot_allocations where production_id = pid) <= 1 and coalesce(p.kg_masuk_pt, 0) = 0 then
      perform set_config('katalis.hapus_resmi', '', true);
      raise exception 'Ini lot satu-satunya di produksi %. Kalau produksinya dobel, hapus produksinya aja.', p.kode using errcode = 'KT001';
    end if;
    update public.lots set sisa_kg = sisa_kg + a.kg where id = a.lot_id;
    delete from public.lot_allocations where id = p_id;
    label := 'Pemakaian lot';
    rincian := a.lot_kode || ' · ' || trim_scale(a.kg)::text || ' kg';
  elsif p_tabel = 'production_items' then
    select count(*) into n_riwayat from public.production_items_history where item_id = p_id;
    select 'Loin no ' || coalesce(i.no_loin::text, '?') || ' · ' || trim_scale(i.kg)::text || ' kg' into rincian from public.production_items i where i.id = p_id;
    delete from public.production_items_history where item_id = p_id;
    delete from public.production_items where id = p_id;
    label := 'Loin per potong';
  elsif p_tabel = 'production_fish' then
    select 'Ekor no ' || f.no_ekor || ' · ' || trim_scale(f.berat_utuh_kg)::text || ' kg' into rincian from public.production_fish f where f.id = p_id;
    delete from public.production_fish where id = p_id;
    label := 'Berat per ekor';
  elsif p_tabel = 'production_components' then
    select coalesce(k.nama, 'Komponen') || ' · ' || coalesce(trim_scale(c.kg)::text, '-') || ' kg' into rincian
    from public.production_components c left join public.component_categories k on k.id = c.category_id where c.id = p_id;
    delete from public.production_components where id = p_id;
    label := 'Hasil samping, limbah, susut';
  else
    select coalesce(g.kode, 'Grade') || ' · ' || trim_scale(t.kg)::text || ' kg' into rincian
    from public.production_loin_totals t left join public.grades g on g.id = t.grade_id where t.id = p_id;
    delete from public.production_loin_totals where id = p_id;
    label := 'Loin total per grade';
  end if;
  perform set_config('katalis.hapus_resmi', '', true);

  return private.log_hapus_satu('produksi', p_alasan,
    private.baris_log(p_tabel, label || ' di ' || p.kode, 1, array[coalesce(rincian, '')])
    || private.baris_log('production_items_history', 'Riwayat timbangan', n_riwayat));
end;
$$;

create or replace function public.hapus_produksi(p_production uuid, p_alasan text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  unit_ids uuid[];
  n_lot int; n_item int; n_riwayat int; n_ekor int; n_komp int; n_total int; n_unit int; n_gerak int; n_kor int;
begin
  perform private.wajib_izin('produksi.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan kenapa produksinya dihapus.');
  select * into p from public.productions where id = p_production for update;
  if not found then
    raise exception 'Produksi nggak ketemu.' using errcode = 'KT001';
  end if;
  select coalesce(array_agg(id), '{}') into unit_ids from public.storage_units where production_id = p.id;
  if exists (select 1 from public.sale_allocations where (unit_id = any(unit_ids) or production_id = p.id) and not batal) then
    raise exception 'Hasil produksi % udah masuk pesanan jual, jadi nggak bisa dihapus. Pakai Koreksi aja.', p.kode using errcode = 'KT001';
  end if;
  if exists (select 1 from public.storage_movements where unit_id = any(unit_ids) and jenis = 'keluar')
     or exists (select 1 from public.service_charges where unit_id = any(unit_ids)) then
    raise exception 'Hasil produksi % udah ada yang diambil dari gudang, jadi nggak bisa dihapus. Pakai Koreksi aja.', p.kode using errcode = 'KT001';
  end if;

  select count(*) into n_lot from public.lot_allocations where production_id = p.id;
  select count(*) into n_item from public.production_items where production_id = p.id;
  select count(*) into n_riwayat from public.production_items_history where production_id = p.id;
  select count(*) into n_ekor from public.production_fish where production_id = p.id;
  select count(*) into n_komp from public.production_components where production_id = p.id;
  select count(*) into n_total from public.production_loin_totals where production_id = p.id;
  n_unit := cardinality(unit_ids);
  select count(*) into n_gerak from public.storage_movements where unit_id = any(unit_ids);
  select count(*) into n_kor from public.koreksi_data where tabel = 'productions' and ref_id = p.id;

  perform set_config('katalis.hapus_resmi', 'ya', true);
  update public.lots l set sisa_kg = l.sisa_kg + g.kg
  from (select lot_id, sum(kg) as kg from public.lot_allocations where production_id = p.id group by lot_id) g
  where l.id = g.lot_id;
  update public.expenses set production_id = null where production_id = p.id;
  update public.sale_allocations set production_id = null where production_id = p.id;
  delete from public.storage_movements where unit_id = any(unit_ids);
  delete from public.storage_units where id = any(unit_ids);
  delete from public.lot_allocations where production_id = p.id;
  delete from public.production_items_history where production_id = p.id;
  delete from public.production_items where production_id = p.id;
  delete from public.production_loin_totals where production_id = p.id;
  delete from public.production_components where production_id = p.id;
  delete from public.production_fish where production_id = p.id;
  delete from public.koreksi_data where tabel = 'productions' and ref_id = p.id;
  delete from public.productions where id = p.id;
  perform set_config('katalis.hapus_resmi', '', true);

  return private.log_hapus_satu('produksi', p_alasan,
    private.baris_log('productions', 'Produksi', 1, array[p.kode || ' · ' || to_char(p.tanggal, 'YYYY-MM-DD') || ' · ' || replace(p.status, '_', ' ')])
    || private.baris_log('lot_allocations', 'Pemakaian lot (beratnya balik ke lot)', n_lot)
    || private.baris_log('production_loin_totals', 'Loin total per grade', n_total)
    || private.baris_log('production_items', 'Loin per potong', n_item)
    || private.baris_log('production_items_history', 'Riwayat timbangan', n_riwayat)
    || private.baris_log('production_components', 'Hasil samping, limbah, susut', n_komp)
    || private.baris_log('production_fish', 'Berat per ekor', n_ekor)
    || private.baris_log('storage_units', 'Stok hasil produksi', n_unit)
    || private.baris_log('storage_movements', 'Gerakan stok', n_gerak)
    || private.baris_log('koreksi_data', 'Riwayat koreksi', n_kor));
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.hapus_baris_produksi(text, uuid, text)', 'public.hapus_produksi(uuid, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Catat migrasinya biar Supabase tahu udah jalan.
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261126000100', 'kode_tanggal'),
  ('20261126000200', 'hapus_produksi')
on conflict do nothing;

commit;

-- Cek abis jalan (cuma baca): harus keluar 2 baris migrasi, terus contoh kode baru.
select version, name from supabase_migrations.schema_migrations where version in ('20261126000100', '20261126000200');
select kode, tanggal from public.productions order by tanggal desc limit 5;
notify pgrst, 'reload schema';
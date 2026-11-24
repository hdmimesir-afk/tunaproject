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

-- Masukan training 17 November 2026.
--   1. Alur baru: ikan diterima dulu (tanpa PO), digrading, harga per grade diisi lalu diajukan. PO baru terbit (dapat kode)
--      setelah disetujui, terus dibayar. Alur lama (PO dulu) tidak dipakai lagi di aplikasi, fungsinya tetap ada.
--   2. Grading tuna utuh menentukan harga ke nelayan. Status di layar cuma Menunggu dan Ditahan (gugur/bau);
--      nilai 'lulus' di database artinya "sudah digrading". Lot Menunggu boleh langsung diolah.
--   3. Koreksi di setiap data penerimaan, pembelian, dan produksi: wajib alasan, sebelum-sesudahnya dicatat di koreksi_data.
--      Kalau total uang PO yang sudah disetujui berubah, PO balik ke antrean persetujuan.
--   4. Proyek punya nama, lini bisnis (jual / jasa / titip), dan PT pemilik ikan. Produksi jasa memakai ikan dari PT
--      (tanpa lot) dan hasilnya jadi milik PT. Proyek titip tidak diproduksi; barangnya masuk lewat titipan gudang.

-- ============================================================ catatan koreksi
create table public.koreksi_data (
  id uuid primary key default gen_random_uuid(),
  tabel text not null check (tabel in ('lots', 'purchase_orders', 'payments', 'productions', 'cycles')),
  ref_id uuid not null,
  kode text not null default '',
  alasan text not null check (length(trim(alasan)) > 0 and length(alasan) <= 500),
  sebelum jsonb not null default '{}'::jsonb,
  sesudah jsonb not null default '{}'::jsonb,
  oleh uuid default auth.uid(),
  pada timestamptz not null default now()
);
create index koreksi_data_ref_idx on public.koreksi_data (tabel, ref_id, pada desc);
select private.pasang_aturan_tabel('public.koreksi_data', false);
revoke insert, update on public.koreksi_data from authenticated;
-- Koreksi PO dan pembayaran memuat harga, jadi cuma yang boleh lihat pembelian yang bisa baca.
create policy "koreksi terbaca" on public.koreksi_data for select to authenticated using (
  case when tabel in ('purchase_orders', 'payments') then (select private.has_permission('pembelian.read'))
       else (select private.has_permission('mutu.read')) or (select private.has_permission('produksi.read')) or (select private.has_permission('pembelian.read'))
  end
);

create or replace function private.catat_koreksi(p_tabel text, p_ref uuid, p_kode text, p_alasan text, p_sebelum jsonb, p_sesudah jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan koreksinya.' using errcode = 'KT001';
  end if;
  if p_sebelum is distinct from p_sesudah then
    insert into public.koreksi_data (tabel, ref_id, kode, alasan, sebelum, sesudah)
    values (p_tabel, p_ref, coalesce(p_kode, ''), trim(p_alasan), coalesce(p_sebelum, '{}'::jsonb), coalesce(p_sesudah, '{}'::jsonb));
  end if;
end;
$$;
revoke all on function private.catat_koreksi(text, uuid, text, text, jsonb, jsonb) from public, anon, authenticated;

-- ============================================================ proyek
alter table public.cycles add column nama text not null default '' check (length(nama) <= 120);
alter table public.cycles add column lini_bisnis text not null default 'jual' check (lini_bisnis in ('jual', 'jasa', 'titip'));
alter table public.cycles add column pt_id uuid references public.buyers (id);
alter table public.cycles add constraint cycles_pt_wajib check (lini_bisnis = 'jual' or pt_id is not null);

create or replace function private.buat_proyek_inti(p_nama text, p_lini text, p_pt uuid, p_tanggal date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_c uuid;
begin
  if length(trim(coalesce(p_nama, ''))) = 0 then
    raise exception 'Tulis nama proyeknya.' using errcode = 'KT001';
  end if;
  if coalesce(p_lini, '') not in ('jual', 'jasa', 'titip') then
    raise exception 'Pilih lini bisnisnya.' using errcode = 'KT001';
  end if;
  if p_lini <> 'jual' and not exists (select 1 from public.buyers b where b.id = p_pt and b.aktif) then
    raise exception 'Pilih PT pemilik ikannya.' using errcode = 'KT001';
  end if;
  insert into public.cycles (nama, lini_bisnis, pt_id, tanggal_bongkar)
  values (trim(p_nama), p_lini, case when p_lini = 'jual' then null else p_pt end, coalesce(p_tanggal, current_date))
  returning id into id_c;
  return id_c;
end;
$$;
revoke all on function private.buat_proyek_inti(text, text, uuid, date) from public, anon, authenticated;

-- Proyek baru bisa dibikin dari penerimaan, produksi, atau gudang (titip), jadi izinnya salah satu dari itu.
create or replace function private.wajib_boleh_proyek()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('siklus.write') or private.has_permission('produksi.write')
          or private.has_permission('penerimaan.write') or private.has_permission('gudang.write')) then
    raise exception 'Peran ini nggak boleh bikin proyek baru.' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.wajib_boleh_proyek() from public, anon, authenticated;

create or replace function public.buat_proyek(p_nama text, p_lini text, p_pt uuid default null, p_tanggal date default current_date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.wajib_boleh_proyek();
  return private.buat_proyek_inti(p_nama, p_lini, p_pt, p_tanggal);
end;
$$;

create or replace function public.koreksi_proyek(p_cycle uuid, p_nama text, p_lini text, p_pt uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.cycles;
  baru public.cycles;
begin
  perform private.wajib_boleh_proyek();
  select * into c from public.cycles where id = p_cycle for update;
  if not found then
    raise exception 'Proyeknya nggak ketemu.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_nama, ''))) = 0 then
    raise exception 'Tulis nama proyeknya.' using errcode = 'KT001';
  end if;
  if coalesce(p_lini, '') not in ('jual', 'jasa', 'titip') then
    raise exception 'Pilih lini bisnisnya.' using errcode = 'KT001';
  end if;
  if p_lini <> 'jual' and not exists (select 1 from public.buyers b where b.id = p_pt and b.aktif) then
    raise exception 'Pilih PT pemilik ikannya.' using errcode = 'KT001';
  end if;
  if p_lini = 'titip' and exists (select 1 from public.productions p where p.cycle_id = c.id) then
    raise exception 'Proyek % udah punya produksi, jadi nggak bisa jadi Titip saja.', c.kode using errcode = 'KT001';
  end if;
  if p_lini = 'jasa' and exists (select 1 from public.productions p join public.lot_allocations a on a.production_id = p.id where p.cycle_id = c.id) then
    raise exception 'Produksi di proyek % pakai ikan dari lot pembelian, jadi nggak bisa jadi jasa produksi.', c.kode using errcode = 'KT001';
  end if;
  if p_lini <> 'jasa' and exists (select 1 from public.productions p where p.cycle_id = c.id and p.kg_masuk_pt is not null) then
    raise exception 'Produksi di proyek % pakai ikan dari PT, jadi lini bisnisnya harus jasa produksi.', c.kode using errcode = 'KT001';
  end if;
  update public.cycles set nama = trim(p_nama), lini_bisnis = p_lini, pt_id = case when p_lini = 'jual' then null else p_pt end
  where id = c.id returning * into baru;
  perform private.catat_koreksi('cycles', c.id, c.kode, p_alasan,
    jsonb_build_object('nama', c.nama, 'lini_bisnis', c.lini_bisnis, 'pt_id', c.pt_id),
    jsonb_build_object('nama', baru.nama, 'lini_bisnis', baru.lini_bisnis, 'pt_id', baru.pt_id));
end;
$$;

-- ============================================================ penerimaan tanpa PO
alter table public.lots alter column po_id drop not null;
alter table public.lots alter column po_kode drop not null;

create or replace function public.terima_ikan(
  p_supplier uuid, p_kg numeric, p_tanggal date default current_date, p_cycle uuid default null,
  p_catatan text default '', p_proyek_baru text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_lot uuid;
  proyek uuid := p_cycle;
begin
  perform private.wajib_izin('penerimaan.write');
  perform private.valid_kg(p_kg, 'Berat ikan');
  if not exists (select 1 from public.suppliers s where s.id = p_supplier and s.aktif) then
    raise exception 'Pilih pemasok atau nelayannya.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_proyek_baru, ''))) > 0 then
    proyek := private.buat_proyek_inti(p_proyek_baru, 'jual', null, p_tanggal);
  elsif proyek is not null and not exists (select 1 from public.cycles c where c.id = proyek and c.status = 'terbuka') then
    raise exception 'Proyeknya nggak ketemu atau udah ditutup.' using errcode = 'KT001';
  end if;
  insert into public.lots (supplier_id, cycle_id, kg, sisa_kg, tanggal_terima, catatan)
  values (p_supplier, proyek, round(p_kg, 3), round(p_kg, 3), coalesce(p_tanggal, current_date), coalesce(p_catatan, ''))
  returning id into id_lot;
  return id_lot;
end;
$$;

-- ============================================================ baris PO per grade
-- Kode boleh kosong: PO dari penerimaan baru dapat kode waktu disetujui. PO cara lama tetap dapat kode bawaan.
alter table public.purchase_orders alter column kode drop not null;
alter table public.purchase_orders alter column total drop expression;

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders (id),
  grade_id uuid not null references public.grades (id),
  kg numeric(12,3) not null check (kg >= 0),
  harga_per_kg numeric(16,2) not null check (harga_per_kg > 0),
  jumlah numeric(16,2) generated always as (round(kg * harga_per_kg, 2)) stored,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  unique (po_id, grade_id)
);
select private.pasang_aturan_tabel('public.purchase_order_lines');
revoke insert, update on public.purchase_order_lines from authenticated;
create policy "baris PO terbaca" on public.purchase_order_lines for select to authenticated using ((select private.has_permission('pembelian.read')));

-- PO tanpa baris per grade (cara lama) tetap: total = berat x harga. PO dengan baris per grade diisi hitung_ulang_po.
create or replace function private.total_po_lama()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.purchase_order_lines pl where pl.po_id = new.id) then
    new.total := round(new.kg * new.harga_per_kg, 2);
  end if;
  return new;
end;
$$;
revoke all on function private.total_po_lama() from public, anon, authenticated;
create trigger purchase_orders_total before insert or update of kg, harga_per_kg on public.purchase_orders
  for each row execute function private.total_po_lama();

-- PO dari penerimaan (punya baris per grade) ikut dihitung ulang kalau lotnya berubah.
create or replace function private.po_per_grade(p_po uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_po is not null and exists (select 1 from public.purchase_order_lines pl where pl.po_id = p_po);
$$;
revoke all on function private.po_per_grade(uuid) from public, anon, authenticated;

-- Hitung ulang baris per grade, berat, rata-rata harga, dan total PO dari grading lot-lotnya.
-- p_harga: [{"grade_id": uuid, "harga_per_kg": 45000}] atau null (pakai harga yang udah ada).
-- Status:
--   draf          : cuma dihitung (dipakai waktu pengajuan pertama).
--   diajukan/diperiksa : angka di pengajuan yang lagi jalan ikut diperbarui; yang udah diperiksa balik ke diajukan.
--   perlu_revisi  : diajukan lagi.
--   disetujui     : kalau total berubah, balik ke antrean persetujuan dengan judul "Koreksi".
create or replace function private.hitung_ulang_po(p_po uuid, p_harga jsonb, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  po public.purchase_orders;
  r record;
  harga numeric(16,2);
  kg_baru numeric(12,3);
  total_baru numeric(16,2);
  dibayar numeric(16,2);
  aktif public.approvals;
  rincian jsonb;
  pemasok text;
begin
  select * into po from public.purchase_orders where id = p_po for update;
  if p_harga is not null and jsonb_typeof(p_harga) <> 'array' then
    raise exception 'Data harga nggak valid.' using errcode = 'KT001';
  end if;

  -- Grade yang ada di lot-lot PO ini.
  for r in
    select lg.grade_id, g.kode, sum(lg.kg)::numeric(12,3) as kg
    from public.lots l join public.lot_grades lg on lg.lot_id = l.id and lg.kg > 0
    join public.grades g on g.id = lg.grade_id
    where l.po_id = po.id and l.qc = 'lulus'
    group by lg.grade_id, g.kode
  loop
    harga := null;
    if p_harga is not null then
      select round((x ->> 'harga_per_kg')::numeric, 2) into harga
      from jsonb_array_elements(p_harga) x where (x ->> 'grade_id')::uuid = r.grade_id limit 1;
    end if;
    if harga is null then
      select pl.harga_per_kg into harga from public.purchase_order_lines pl where pl.po_id = po.id and pl.grade_id = r.grade_id;
    end if;
    if harga is null or harga <= 0 then
      raise exception 'Isi harga per kg buat grade %.', r.kode using errcode = 'KT001';
    end if;
    insert into public.purchase_order_lines (po_id, grade_id, kg, harga_per_kg)
    values (po.id, r.grade_id, r.kg, harga)
    on conflict (po_id, grade_id) do update set kg = excluded.kg, harga_per_kg = excluded.harga_per_kg
      where public.purchase_order_lines.kg <> excluded.kg or public.purchase_order_lines.harga_per_kg <> excluded.harga_per_kg;
  end loop;

  -- Grade yang udah nggak ada di lot dikosongkan (kg 0), nggak dihapus.
  update public.purchase_order_lines pl set kg = 0
  where pl.po_id = po.id and pl.kg <> 0
    and not exists (
      select 1 from public.lots l join public.lot_grades lg on lg.lot_id = l.id and lg.kg > 0
      where l.po_id = po.id and l.qc = 'lulus' and lg.grade_id = pl.grade_id
    );

  select coalesce(sum(kg), 0), coalesce(sum(jumlah), 0) into kg_baru, total_baru
  from public.purchase_order_lines where po_id = po.id;
  if kg_baru <= 0 then
    raise exception 'Belum ada ikan yang digrading di pembelian ini.' using errcode = 'KT001';
  end if;
  select coalesce(sum(jumlah), 0) into dibayar from public.payments where po_id = po.id and not batal;
  if total_baru < dibayar then
    raise exception 'Total baru (Rp%) lebih kecil dari yang udah dibayar (Rp%). Batalkan dulu pembayarannya.', total_baru::text, dibayar::text using errcode = 'KT001';
  end if;

  update public.purchase_orders
  set kg = kg_baru, total = total_baru, harga_per_kg = round(total_baru / kg_baru, 2)
  where id = po.id;

  select coalesce(jsonb_agg(jsonb_build_object('grade', g.kode, 'kg', pl.kg, 'harga_per_kg', pl.harga_per_kg, 'jumlah', pl.jumlah) order by g.urutan, g.kode), '[]'::jsonb)
  into rincian
  from public.purchase_order_lines pl join public.grades g on g.id = pl.grade_id
  where pl.po_id = po.id and pl.kg > 0;
  select s.nama into pemasok from public.suppliers s where s.id = po.supplier_id;

  if po.status_persetujuan in ('diajukan') then
    select * into aktif from public.approvals
    where ref_tabel = 'purchase_orders' and ref_id = po.id and status in ('diajukan', 'diperiksa') for update;
    if found then
      update public.approvals
      set jumlah = total_baru,
          status = 'diajukan', diperiksa_oleh = null, diperiksa_pada = null, catatan_periksa = '',
          judul = case when po.kode is null then 'Beli ikan ' else 'Koreksi ' || po.kode || ': beli ikan ' end
                  || private.teks_kg(kg_baru) || ' kg dari ' || coalesce(pemasok, '-'),
          payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('harga_per_kg', round(total_baru / kg_baru, 2), 'baris', rincian)
      where id = aktif.id;
    end if;
  elsif po.status_persetujuan = 'perlu_revisi'
     or (po.status_persetujuan = 'disetujui' and total_baru is distinct from po.total) then
    update public.purchase_orders set status_persetujuan = 'diajukan', diajukan_pada = now() where id = po.id;
    insert into public.approvals (jenis, ref_tabel, ref_id, judul, jumlah, payload, diajukan_oleh)
    values (
      'pembelian', 'purchase_orders', po.id,
      case when po.kode is null then 'Beli ikan ' else 'Koreksi ' || po.kode || ': beli ikan ' end
        || private.teks_kg(kg_baru) || ' kg dari ' || coalesce(pemasok, '-'),
      total_baru,
      jsonb_build_object('harga_per_kg', round(total_baru / kg_baru, 2), 'harga_acuan', po.harga_acuan,
        'nota_menyusul', po.nota_menyusul, 'baris', rincian, 'koreksi', po.kode is not null,
        'alasan', coalesce(p_alasan, ''), 'total_lama', po.total),
      (select auth.uid())
    );
  end if;
end;
$$;
revoke all on function private.hitung_ulang_po(uuid, jsonb, text) from public, anon, authenticated;

-- Pembayaran bisa dibatalkan (dengan alasan); pembayaran batal nggak dihitung.
alter table public.payments add column batal boolean not null default false;
alter table public.payments add column alasan_batal text not null default '';
alter table public.payments add column dibatalkan_oleh uuid;
alter table public.payments add column dibatalkan_pada timestamptz;
alter table public.payments add constraint payments_alasan_batal check (not batal or length(trim(alasan_batal)) > 0);

-- ============================================================ ajukan pembelian dari lot
create or replace function public.ajukan_pembelian(p_lots uuid[], p_harga jsonb, p_nota_menyusul boolean default false, p_catatan text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lots;
  ids uuid[];
  pemasok uuid;
  proyek uuid;
  id_po uuid;
  po public.purchase_orders;
  acuan numeric(16,2);
  ada_nota boolean;
  menyusul boolean;
  nama_pemasok text;
  rincian jsonb;
  kode_lot text;
begin
  perform private.wajib_izin('pembelian.write');
  select array_agg(distinct x) into ids from unnest(coalesce(p_lots, array[]::uuid[])) x;
  if ids is null or cardinality(ids) = 0 then
    raise exception 'Pilih minimal satu lot.' using errcode = 'KT001';
  end if;
  for l in select * from public.lots where id = any(ids) order by kode for update loop
    if l.po_id is not null then
      raise exception 'Lot % udah masuk pembelian lain.', l.kode using errcode = 'KT001';
    end if;
    if l.qc = 'ditahan' then
      raise exception 'Lot % ditahan (gugur/bau), nggak bisa diajukan.', l.kode using errcode = 'KT001';
    end if;
    if l.qc <> 'lulus' then
      raise exception 'Lot % belum digrading. Grading dulu biar harganya bisa dihitung.', l.kode using errcode = 'KT001';
    end if;
    if pemasok is not null and pemasok <> l.supplier_id then
      raise exception 'Satu pengajuan cuma buat satu pemasok. Lot % beda pemasok.', l.kode using errcode = 'KT001';
    end if;
    pemasok := l.supplier_id;
    proyek := coalesce(proyek, l.cycle_id);
  end loop;
  if (select count(*) from public.lots where id = any(ids)) <> cardinality(ids) then
    raise exception 'Sebagian lot nggak ketemu. Muat ulang daftarnya.' using errcode = 'KT001';
  end if;

  -- PO dibuat tanpa kode; kodenya keluar waktu disetujui.
  insert into public.purchase_orders (kode, supplier_id, cycle_id, kg, harga_per_kg, catatan, status_persetujuan)
  values (null, pemasok, proyek, 1, 1, coalesce(p_catatan, ''), 'draf')
  returning id into id_po;
  update public.lots set po_id = id_po where id = any(ids);
  perform private.hitung_ulang_po(id_po, p_harga, null);
  select * into po from public.purchase_orders where id = id_po;

  ada_nota := exists (select 1 from public.documents d where d.jenis = 'nota'
    and ((d.ref_tabel = 'purchase_orders' and d.ref_id = id_po) or (d.ref_tabel = 'lots' and d.ref_id = any(ids))));
  menyusul := not ada_nota and coalesce(p_nota_menyusul, false);
  if not ada_nota and not menyusul
     and exists (select 1 from public.document_rules r where r.ref_tabel = 'purchase_orders' and r.jenis = 'nota' and r.wajib) then
    raise exception 'Lampirkan nota di lotnya, atau centang "Nota menyusul" kalau notanya belum ada.' using errcode = 'KT001';
  end if;

  select p.harga_per_kg into acuan
  from public.purchase_orders p
  where p.supplier_id = pemasok and p.id <> id_po and p.status_persetujuan = 'disetujui'
  order by p.diajukan_pada desc nulls last, p.dibuat_pada desc
  limit 1;

  update public.purchase_orders
  set status_persetujuan = 'diajukan', harga_acuan = acuan, diajukan_pada = now(), nota_menyusul = menyusul
  where id = id_po;

  select s.nama into nama_pemasok from public.suppliers s where s.id = pemasok;
  select coalesce(jsonb_agg(jsonb_build_object('grade', g.kode, 'kg', pl.kg, 'harga_per_kg', pl.harga_per_kg, 'jumlah', pl.jumlah) order by g.urutan, g.kode), '[]'::jsonb)
  into rincian
  from public.purchase_order_lines pl join public.grades g on g.id = pl.grade_id
  where pl.po_id = id_po and pl.kg > 0;
  select string_agg(kode, ', ' order by kode) into kode_lot from public.lots where id = any(ids);

  insert into public.approvals (jenis, ref_tabel, ref_id, judul, jumlah, payload, diajukan_oleh)
  values (
    'pembelian', 'purchase_orders', id_po,
    'Beli ikan ' || private.teks_kg(po.kg) || ' kg dari ' || coalesce(nama_pemasok, '-'),
    po.total,
    jsonb_build_object('harga_per_kg', po.harga_per_kg, 'harga_acuan', acuan, 'nota_menyusul', menyusul,
      'baris', rincian, 'lot', kode_lot, 'koreksi', false),
    (select auth.uid())
  );
  return id_po;
end;
$$;

-- ============================================================ persetujuan
-- Kode PO keluar waktu disetujui. Lot di PO ikut dapat kode PO-nya.
create or replace function public.setujui_persetujuan(p_ids uuid[], p_total_konfirmasi numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals;
  ids uuid[];
  n int := 0;
  total numeric(16,2) := 0;
  bid uuid;
  pelaku uuid := (select auth.uid());
begin
  select array_agg(distinct x) into ids from unnest(coalesce(p_ids, array[]::uuid[])) x;
  if ids is null or cardinality(ids) = 0 then
    raise exception 'Pilih minimal satu persetujuan.' using errcode = 'KT001';
  end if;
  if cardinality(ids) > 1 then
    bid := gen_random_uuid();
  end if;

  for a in select * from public.approvals where id = any(ids) order by id for update loop
    perform private.wajib_izin((private.aturan(a.jenis)).penyetuju_aksi);
    if a.status not in ('diajukan', 'diperiksa') then
      raise exception 'Persetujuan % udah diputuskan (status %).', a.kode, a.status using errcode = 'KT001';
    end if;
    if a.diajukan_oleh = pelaku and not private.punya_semua_izin() then
      raise exception 'Persetujuan % diajukan sendiri, jadi harus disetujui pemegang tugas lain.', a.kode using errcode = 'KT001';
    end if;
    n := n + 1;
    total := total + a.jumlah;
  end loop;

  if n <> cardinality(ids) then
    raise exception 'Sebagian persetujuan nggak ketemu. Muat ulang daftarnya.' using errcode = 'KT001';
  end if;
  if total is distinct from p_total_konfirmasi then
    raise exception 'Total berubah dari yang dikonfirmasi. Muat ulang daftarnya, terus konfirmasi lagi.' using errcode = 'KT001';
  end if;

  update public.approvals
  set diperiksa_oleh = coalesce(diperiksa_oleh, pelaku),
      diperiksa_pada = coalesce(diperiksa_pada, now()),
      status = 'disetujui', disetujui_oleh = pelaku, disetujui_pada = now(), batch_id = bid
  where id = any(ids);

  update public.purchase_orders
  set status_persetujuan = 'disetujui',
      kode = coalesce(kode, 'PO-' || lpad(nextval('public.po_kode_seq')::text, 4, '0'))
  where id in (select ref_id from public.approvals where id = any(ids) and ref_tabel = 'purchase_orders');

  update public.lots l set po_kode = po.kode
  from public.purchase_orders po
  where l.po_id = po.id and l.po_kode is distinct from po.kode
    and po.id in (select ref_id from public.approvals where id = any(ids) and ref_tabel = 'purchase_orders');

  return jsonb_build_object('jumlah', n, 'total', total);
end;
$$;

-- Ditolak: pengajuan baru (belum punya kode PO) dilepas dari lot-nya biar bisa diajukan lagi.
-- Koreksi PO yang udah terbit balik ke "perlu revisi" biar dikoreksi lagi.
create or replace function public.tolak_persetujuan(p_approval uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals;
  po public.purchase_orders;
begin
  select * into a from public.approvals where id = p_approval for update;
  if not found then
    raise exception 'Persetujuan nggak ketemu.' using errcode = 'KT001';
  end if;
  perform private.wajib_izin((private.aturan(a.jenis)).penyetuju_aksi);
  if a.status not in ('diajukan', 'diperiksa') then
    raise exception 'Persetujuan % udah diputuskan (status %).', a.kode, a.status using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan penolakannya.' using errcode = 'KT001';
  end if;
  update public.approvals set status = 'ditolak', alasan_tolak = trim(p_alasan) where id = a.id;
  if a.ref_tabel = 'purchase_orders' then
    select * into po from public.purchase_orders where id = a.ref_id for update;
    if not exists (select 1 from public.approvals x where x.ref_tabel = 'purchase_orders' and x.ref_id = po.id and x.status = 'disetujui') then
      update public.purchase_orders set status_persetujuan = 'ditolak' where id = po.id;
      if private.po_per_grade(po.id) then
        update public.lots set po_id = null, po_kode = null where po_id = po.id;
      end if;
    else
      update public.purchase_orders set status_persetujuan = 'perlu_revisi' where id = po.id;
      update public.approvals set catatan_revisi = 'Koreksi ditolak: ' || trim(p_alasan) where id = a.id;
    end if;
  end if;
end;
$$;

-- ============================================================ grading
-- Grading boleh diulang kapan aja (cuma ngaruh ke harga). Ditahan cuma boleh kalau lot belum diolah dan belum diajukan.
create or replace function public.cek_mutu_grade(p_lot uuid, p_hasil text, p_baris jsonb default '[]'::jsonb, p_catatan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lots;
  r record;
  total numeric(12,3) := 0;
  utama uuid;
  sebelum jsonb;
  sesudah jsonb;
begin
  perform private.wajib_izin('mutu.write');
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
  end if;
  if p_hasil is null or p_hasil not in ('lulus', 'ditahan') then
    raise exception 'Isi grading-nya, atau tandai ditahan.' using errcode = 'KT001';
  end if;
  if p_hasil = 'ditahan' and l.sisa_kg < l.kg then
    raise exception 'Lot % udah dipakai produksi, jadi nggak bisa ditahan.', l.kode using errcode = 'KT001';
  end if;
  if p_hasil = 'ditahan' and private.po_per_grade(l.po_id) then
    raise exception 'Lot % udah masuk pembelian, jadi nggak bisa ditahan. Koreksi pembeliannya dulu.', l.kode using errcode = 'KT001';
  end if;

  if p_hasil = 'lulus' then
    if p_baris is null or jsonb_typeof(p_baris) <> 'array' or jsonb_array_length(p_baris) = 0 then
      raise exception 'Isi berat buat minimal satu grade.' using errcode = 'KT001';
    end if;
    if (select count(distinct x ->> 'grade_id') from jsonb_array_elements(p_baris) x) <> jsonb_array_length(p_baris) then
      raise exception 'Satu grade cuma boleh diisi sekali.' using errcode = 'KT001';
    end if;
    for r in select * from jsonb_to_recordset(p_baris) as x(grade_id uuid, kg numeric) loop
      if r.kg is null or r.kg <= 0 or round(r.kg, 3) <> r.kg then
        raise exception 'Berat tiap grade harus lebih dari nol, paling banyak tiga angka di belakang koma.' using errcode = 'KT001';
      end if;
      if not exists (select 1 from public.grades g where g.id = r.grade_id and g.aktif) then
        raise exception 'Pilih grade yang masih aktif.' using errcode = 'KT001';
      end if;
      total := total + r.kg;
    end loop;
    if total > l.kg then
      raise exception 'Jumlah berat per grade (% kg) lebih dari berat lot % (% kg).', trim_scale(total)::text, l.kode, trim_scale(l.kg)::text using errcode = 'KT001';
    end if;
  end if;

  select jsonb_build_object('qc', l.qc, 'grade', coalesce(jsonb_object_agg(g.kode, lg.kg) filter (where lg.kg > 0), '{}'::jsonb))
  into sebelum
  from public.lot_grades lg join public.grades g on g.id = lg.grade_id where lg.lot_id = l.id;

  update public.lot_grades lg set kg = 0
  where lg.lot_id = l.id and lg.kg <> 0
    and (p_hasil = 'ditahan' or lg.grade_id not in (select (x ->> 'grade_id')::uuid from jsonb_array_elements(p_baris) x));

  if p_hasil = 'lulus' then
    insert into public.lot_grades (lot_id, grade_id, kg)
    select l.id, x.grade_id, x.kg from jsonb_to_recordset(p_baris) as x(grade_id uuid, kg numeric)
    on conflict (lot_id, grade_id) do update set kg = excluded.kg
      where public.lot_grades.kg <> excluded.kg;
    select lg.grade_id into utama
    from public.lot_grades lg join public.grades g on g.id = lg.grade_id
    where lg.lot_id = l.id and lg.kg > 0
    order by lg.kg desc, g.urutan, g.kode
    limit 1;
  end if;

  update public.lots
  set qc = p_hasil, grade_id = utama,
      qc_oleh = (select auth.uid()), qc_pada = now(), qc_catatan = coalesce(p_catatan, '')
  where id = l.id;

  -- Grading ulang lot yang udah digrading dicatat sebagai koreksi.
  if l.qc <> 'menunggu' then
    select jsonb_build_object('qc', p_hasil, 'grade', coalesce(jsonb_object_agg(g.kode, lg.kg) filter (where lg.kg > 0), '{}'::jsonb))
    into sesudah
    from public.lot_grades lg join public.grades g on g.id = lg.grade_id where lg.lot_id = l.id;
    perform private.catat_koreksi('lots', l.id, l.kode,
      'Grading ulang' || case when length(trim(coalesce(p_catatan, ''))) > 0 then ': ' || trim(p_catatan) else '' end,
      sebelum, sesudah);
  end if;

  if private.po_per_grade(l.po_id) then
    perform private.hitung_ulang_po(l.po_id, null, 'Grading ulang lot ' || l.kode);
  end if;
end;
$$;

-- ============================================================ koreksi lot
create or replace function public.koreksi_lot(
  p_lot uuid, p_kg numeric, p_tanggal date, p_supplier uuid, p_cycle uuid, p_catatan text, p_alasan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lots;
  baru public.lots;
  terpakai numeric(12,3);
  digrade numeric(12,3);
begin
  perform private.wajib_izin('penerimaan.write');
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
  end if;
  perform private.valid_kg(p_kg, 'Berat lot');
  terpakai := l.kg - l.sisa_kg;
  if p_kg < terpakai then
    raise exception 'Lot % udah dipakai produksi % kg, jadi beratnya nggak boleh kurang dari itu.', l.kode, trim_scale(terpakai)::text using errcode = 'KT001';
  end if;
  select coalesce(sum(kg), 0) into digrade from public.lot_grades where lot_id = l.id and l.qc = 'lulus';
  if p_kg < digrade then
    raise exception 'Hasil grading lot % totalnya % kg. Koreksi grading-nya dulu kalau beratnya mau dikurangi.', l.kode, trim_scale(digrade)::text using errcode = 'KT001';
  end if;
  if p_supplier is distinct from l.supplier_id then
    if l.po_id is not null then
      raise exception 'Lot % udah masuk pembelian. Ganti pemasoknya lewat koreksi pembelian.', l.kode using errcode = 'KT001';
    end if;
    if not exists (select 1 from public.suppliers s where s.id = p_supplier and s.aktif) then
      raise exception 'Pilih pemasok atau nelayannya.' using errcode = 'KT001';
    end if;
  end if;
  if p_cycle is distinct from l.cycle_id and p_cycle is not null
     and not exists (select 1 from public.cycles c where c.id = p_cycle and c.status = 'terbuka') then
    raise exception 'Proyeknya nggak ketemu atau udah ditutup.' using errcode = 'KT001';
  end if;

  update public.lots
  set kg = round(p_kg, 3), sisa_kg = round(p_kg, 3) - terpakai,
      tanggal_terima = coalesce(p_tanggal, tanggal_terima), supplier_id = p_supplier, cycle_id = p_cycle,
      catatan = coalesce(p_catatan, '')
  where id = l.id
  returning * into baru;

  perform private.catat_koreksi('lots', l.id, l.kode, p_alasan,
    jsonb_build_object('kg', l.kg, 'tanggal', l.tanggal_terima, 'supplier_id', l.supplier_id, 'cycle_id', l.cycle_id, 'catatan', l.catatan),
    jsonb_build_object('kg', baru.kg, 'tanggal', baru.tanggal_terima, 'supplier_id', baru.supplier_id, 'cycle_id', baru.cycle_id, 'catatan', baru.catatan));
  if private.po_per_grade(l.po_id) then
    perform private.hitung_ulang_po(l.po_id, null, 'Koreksi lot ' || l.kode || ': ' || trim(p_alasan));
  end if;
end;
$$;

-- ============================================================ koreksi pembelian
create or replace function public.koreksi_pembelian(
  p_po uuid, p_harga jsonb, p_supplier uuid, p_cycle uuid, p_catatan text, p_alasan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  po public.purchase_orders;
  baru public.purchase_orders;
  harga_lama jsonb;
  harga_baru jsonb;
begin
  perform private.wajib_izin('pembelian.write');
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then
    raise exception 'Pembelian nggak ketemu.' using errcode = 'KT001';
  end if;
  if po.status_persetujuan = 'ditolak' then
    raise exception 'Pengajuan ini udah ditolak. Ajukan lagi dari lotnya di Mutu dan Penerimaan.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan koreksinya.' using errcode = 'KT001';
  end if;
  if p_supplier is distinct from po.supplier_id
     and not exists (select 1 from public.suppliers s where s.id = p_supplier and s.aktif) then
    raise exception 'Pilih pemasok atau nelayannya.' using errcode = 'KT001';
  end if;
  if p_cycle is distinct from po.cycle_id and p_cycle is not null
     and not exists (select 1 from public.cycles c where c.id = p_cycle and c.status = 'terbuka') then
    raise exception 'Proyeknya nggak ketemu atau udah ditutup.' using errcode = 'KT001';
  end if;

  select coalesce(jsonb_object_agg(g.kode, pl.harga_per_kg) filter (where pl.kg > 0), '{}'::jsonb) into harga_lama
  from public.purchase_order_lines pl join public.grades g on g.id = pl.grade_id where pl.po_id = po.id;

  update public.purchase_orders set supplier_id = p_supplier, cycle_id = p_cycle, catatan = coalesce(p_catatan, '')
  where id = po.id;
  update public.lots set supplier_id = p_supplier where po_id = po.id and supplier_id is distinct from p_supplier;
  perform private.hitung_ulang_po(po.id, p_harga, trim(p_alasan));

  select * into baru from public.purchase_orders where id = po.id;
  select coalesce(jsonb_object_agg(g.kode, pl.harga_per_kg) filter (where pl.kg > 0), '{}'::jsonb) into harga_baru
  from public.purchase_order_lines pl join public.grades g on g.id = pl.grade_id where pl.po_id = po.id;
  perform private.catat_koreksi('purchase_orders', po.id, coalesce(po.kode, ''), p_alasan,
    jsonb_build_object('harga', harga_lama, 'total', po.total, 'supplier_id', po.supplier_id, 'cycle_id', po.cycle_id, 'catatan', po.catatan),
    jsonb_build_object('harga', harga_baru, 'total', baru.total, 'supplier_id', baru.supplier_id, 'cycle_id', baru.cycle_id, 'catatan', baru.catatan));
end;
$$;

-- ============================================================ pembayaran
create or replace function public.catat_bayar(p_po uuid, p_jumlah numeric, p_tanggal date default current_date, p_catatan text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  po public.purchase_orders;
  sudah numeric(16,2);
  id_bayar uuid;
begin
  perform private.wajib_izin('pembayaran.write');
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then
    raise exception 'PO nggak ketemu.' using errcode = 'KT001';
  end if;
  if po.status_persetujuan <> 'disetujui' then
    raise exception 'PO % belum disetujui. Pembayarannya nunggu persetujuan dulu.', coalesce(po.kode, '(belum terbit)') using errcode = 'KT001';
  end if;
  if p_jumlah is null or p_jumlah <= 0 then
    raise exception 'Jumlah bayar harus lebih dari nol.' using errcode = 'KT001';
  end if;
  select coalesce(sum(jumlah), 0) into sudah from public.payments where po_id = po.id and not batal;
  if sudah + round(p_jumlah, 2) > po.total then
    raise exception 'Pembayaran lebih dari total PO. Sisa yang boleh dibayar: %.', (po.total - sudah)::text using errcode = 'KT001';
  end if;
  insert into public.payments (po_id, jumlah, tanggal, catatan)
  values (po.id, round(p_jumlah, 2), coalesce(p_tanggal, current_date), coalesce(p_catatan, ''))
  returning id into id_bayar;
  return id_bayar;
end;
$$;

create or replace function public.batalkan_pembayaran(p_payment uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments;
  po public.purchase_orders;
begin
  perform private.wajib_izin('pembayaran.write');
  select * into p from public.payments where id = p_payment for update;
  if not found then
    raise exception 'Pembayaran nggak ketemu.' using errcode = 'KT001';
  end if;
  if p.batal then
    raise exception 'Pembayaran % udah dibatalkan.', p.kode using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan pembatalannya.' using errcode = 'KT001';
  end if;
  select * into po from public.purchase_orders where id = p.po_id;
  update public.payments
  set batal = true, alasan_batal = trim(p_alasan), dibatalkan_oleh = (select auth.uid()), dibatalkan_pada = now()
  where id = p.id;
  -- Baris pembalik di buku kas: uangnya dianggap balik.
  insert into public.ledger (tanggal, arah, kategori_nama, uraian, jumlah, ref_tabel, ref_id, cycle_id)
  values ((now() at time zone 'Asia/Jakarta')::date, 'masuk', 'Bahan baku',
    'Batal bayar pemasok ' || coalesce(po.kode, '') || ' (' || p.kode || '): ' || trim(p_alasan), p.jumlah, 'payments_batal', p.id, po.cycle_id);
  perform private.catat_koreksi('payments', p.id, p.kode, p_alasan,
    jsonb_build_object('batal', false, 'jumlah', p.jumlah), jsonb_build_object('batal', true, 'jumlah', p.jumlah));
end;
$$;

-- ============================================================ produksi
alter table public.productions add column kg_masuk_pt numeric(12,3) check (kg_masuk_pt is null or kg_masuk_pt > 0);

create or replace view public.v_neraca_produksi with (security_invoker = true) as
select
  p.id as production_id,
  (coalesce(a.masuk, 0) + coalesce(p.kg_masuk_pt, 0))::numeric(12,3) as masuk_kg,
  (coalesce(i.loin, 0) + coalesce(t.loin, 0))::numeric(12,3) as loin_kg,
  coalesce(i.n, 0)::int as jumlah_loin,
  coalesce(c.samping, 0)::numeric(12,3) as samping_kg,
  p.limbah_kg,
  p.susut_kg,
  (coalesce(a.masuk, 0) + coalesce(p.kg_masuk_pt, 0) - coalesce(i.loin, 0) - coalesce(t.loin, 0) - coalesce(c.samping, 0) - coalesce(p.limbah_kg, 0) - coalesce(p.susut_kg, 0))::numeric(12,3) as belum_jelas_kg,
  case when coalesce(a.masuk, 0) + coalesce(p.kg_masuk_pt, 0) > 0
    then round((coalesce(i.loin, 0) + coalesce(t.loin, 0)) / (coalesce(a.masuk, 0) + coalesce(p.kg_masuk_pt, 0)) * 100, 1) else 0 end as hasil_pct,
  case when coalesce(a.masuk, 0) + coalesce(p.kg_masuk_pt, 0) > 0
    then round((coalesce(a.masuk, 0) + coalesce(p.kg_masuk_pt, 0) - coalesce(i.loin, 0) - coalesce(t.loin, 0) - coalesce(c.samping, 0) - coalesce(p.limbah_kg, 0) - coalesce(p.susut_kg, 0))
      / (coalesce(a.masuk, 0) + coalesce(p.kg_masuk_pt, 0)) * 100, 1)
    else 0 end as belum_jelas_pct
from public.productions p
left join lateral (select sum(kg) as masuk from public.lot_allocations where production_id = p.id) a on true
left join lateral (select sum(kg) as loin, count(*) as n from public.production_items where production_id = p.id and not batal) i on true
left join lateral (select sum(kg) as loin from public.production_loin_totals where production_id = p.id) t on true
left join lateral (select sum(kg) as samping from public.production_components where production_id = p.id) c on true;

-- Kolom baru di akhir view supaya kolom lama nggak bergeser.
create or replace view public.v_productions with (security_invoker = true) as
select
  p.id, p.kode, p.tanggal, p.status, p.cycle_id, cy.kode as siklus_kode, p.catatan,
  n.masuk_kg, n.loin_kg, n.jumlah_loin, n.samping_kg, n.limbah_kg, n.susut_kg, n.belum_jelas_kg, n.hasil_pct, n.belum_jelas_pct,
  p.penjelasan_selisih, p.selisih_diterima, p.catatan_perbaikan,
  p.selesai_oleh, p.selesai_pada, p.qc_oleh, p.qc_pada, p.owner_oleh, p.owner_pada, p.dibuat_pada,
  p.kg_masuk_pt, cy.nama as proyek_nama, coalesce(cy.lini_bisnis, 'jual') as lini_bisnis, cy.pt_id, b.nama as pt_nama,
  exists (select 1 from public.storage_units u where u.production_id = p.id) as sudah_stok
from public.productions p
left join public.cycles cy on cy.id = p.cycle_id
left join public.buyers b on b.id = cy.pt_id
left join public.v_neraca_produksi n on n.production_id = p.id;

-- Mulai produksi. Proyek dipilih (p_cycle) atau dibikin (p_proyek_baru: {"nama","lini_bisnis","pt_id"}).
--   jual : ikan dari lot (lot yang nggak ditahan).
--   jasa : ikan dari PT, cukup beratnya (p_kg_pt), tanpa lot.
--   titip: nggak diproduksi; barangnya masuk lewat titipan gudang.
drop function public.mulai_produksi(jsonb, date, text);
create function public.mulai_produksi(
  p_alokasi jsonb, p_tanggal date default current_date, p_catatan text default '',
  p_cycle uuid default null, p_proyek_baru jsonb default null, p_kg_pt numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  l public.lots;
  c public.cycles;
  id_prod uuid;
  proyek uuid := p_cycle;
  lini text := 'jual';
  ada_lot boolean := p_alokasi is not null and jsonb_typeof(p_alokasi) = 'array' and jsonb_array_length(p_alokasi) > 0;
begin
  perform private.wajib_izin('produksi.write');
  if p_proyek_baru is not null then
    proyek := private.buat_proyek_inti(p_proyek_baru ->> 'nama', coalesce(p_proyek_baru ->> 'lini_bisnis', 'jual'),
      nullif(p_proyek_baru ->> 'pt_id', '')::uuid, p_tanggal);
  end if;
  if proyek is not null then
    select * into c from public.cycles where id = proyek;
    if not found or c.status <> 'terbuka' then
      raise exception 'Proyeknya nggak ketemu atau udah ditutup.' using errcode = 'KT001';
    end if;
    lini := c.lini_bisnis;
  end if;

  if lini = 'titip' then
    raise exception 'Proyek titip nggak diproduksi. Terima barangnya lewat Terima titipan di Gudang Dingin.' using errcode = 'KT001';
  end if;
  if lini = 'jasa' then
    if ada_lot then
      raise exception 'Jasa produksi pakai ikan dari PT, jadi nggak pakai lot pembelian.' using errcode = 'KT001';
    end if;
    perform private.valid_kg(p_kg_pt, 'Berat ikan dari PT');
  else
    if not ada_lot then
      raise exception 'Pilih minimal satu lot.' using errcode = 'KT001';
    end if;
    if p_kg_pt is not null then
      raise exception 'Berat ikan dari PT cuma buat jasa produksi.' using errcode = 'KT001';
    end if;
    if (select count(distinct x ->> 'lot_id') from jsonb_array_elements(p_alokasi) x) <> jsonb_array_length(p_alokasi) then
      raise exception 'Satu lot cuma boleh muncul sekali dalam satu produksi.' using errcode = 'KT001';
    end if;
  end if;

  insert into public.productions (tanggal, catatan, cycle_id, kg_masuk_pt)
  values (coalesce(p_tanggal, current_date), coalesce(p_catatan, ''), proyek, case when lini = 'jasa' then round(p_kg_pt, 3) end)
  returning id into id_prod;

  if lini = 'jual' then
    for r in select (x ->> 'lot_id')::uuid as lot_id, (x ->> 'kg')::numeric as kg
             from jsonb_array_elements(p_alokasi) x order by 1 loop
      select * into l from public.lots where id = r.lot_id for update;
      if not found then
        raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
      end if;
      if l.qc = 'ditahan' then
        raise exception 'Lot % ditahan (gugur/bau), nggak bisa diolah.', l.kode using errcode = 'KT001';
      end if;
      if r.kg is null or r.kg <= 0 or round(r.kg, 3) <> r.kg then
        raise exception 'Berat dari lot % harus lebih dari nol, paling banyak tiga angka di belakang koma.', l.kode using errcode = 'KT001';
      end if;
      if r.kg > l.sisa_kg then
        raise exception 'Lot % cuma sisa % kg.', l.kode, l.sisa_kg::text using errcode = 'KT001';
      end if;
      update public.lots set sisa_kg = sisa_kg - r.kg where id = l.id;
      insert into public.lot_allocations (production_id, lot_id, lot_kode, kg) values (id_prod, l.id, l.kode, r.kg);
      proyek := coalesce(proyek, l.cycle_id);
    end loop;
    update public.productions set cycle_id = proyek where id = id_prod;
  end if;
  return id_prod;
end;
$$;

-- Hasil produksi yang udah masuk stok mengunci berat masuk.
create or replace function private.wajib_belum_stok(p public.productions)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.storage_units u where u.production_id = p.id) then
    raise exception 'Hasil produksi % udah masuk stok, jadi berat masuknya nggak bisa dikoreksi lagi.', p.kode using errcode = 'KT001';
  end if;
end;
$$;

create or replace function public.koreksi_produksi(
  p_production uuid, p_tanggal date, p_cycle uuid, p_kg_pt numeric, p_catatan text, p_alasan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  baru public.productions;
  c public.cycles;
  ada_lot boolean;
  balik boolean := false;
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  ada_lot := exists (select 1 from public.lot_allocations a where a.production_id = p.id);
  if p_cycle is not null then
    select * into c from public.cycles where id = p_cycle;
    if not found then
      raise exception 'Proyeknya nggak ketemu.' using errcode = 'KT001';
    end if;
    if p_cycle is distinct from p.cycle_id and c.status <> 'terbuka' then
      raise exception 'Proyek % udah ditutup.', c.kode using errcode = 'KT001';
    end if;
    if c.lini_bisnis = 'titip' then
      raise exception 'Proyek % itu titip saja, nggak bisa dipakai buat produksi.', c.kode using errcode = 'KT001';
    end if;
    if c.lini_bisnis = 'jasa' and ada_lot then
      raise exception 'Produksi ini pakai lot pembelian, jadi nggak bisa masuk proyek jasa produksi %.', c.kode using errcode = 'KT001';
    end if;
    if c.lini_bisnis = 'jual' and p_kg_pt is not null then
      raise exception 'Proyek % itu jual, jadi berat ikan dari PT nggak dipakai.', c.kode using errcode = 'KT001';
    end if;
  end if;
  if p_kg_pt is distinct from p.kg_masuk_pt then
    if ada_lot then
      raise exception 'Produksi ini pakai lot pembelian, jadi berat ikan dari PT nggak dipakai.' using errcode = 'KT001';
    end if;
    perform private.valid_kg(p_kg_pt, 'Berat ikan dari PT');
    perform private.wajib_belum_stok(p);
    balik := p.status <> 'berjalan';
  end if;

  update public.productions
  set tanggal = coalesce(p_tanggal, tanggal), cycle_id = p_cycle, kg_masuk_pt = round(p_kg_pt, 3), catatan = coalesce(p_catatan, ''),
      status = case when balik then 'berjalan' else status end
  where id = p.id
  returning * into baru;
  perform private.cek_tidak_melebihi(p.id);
  perform private.catat_koreksi('productions', p.id, p.kode, p_alasan,
    jsonb_build_object('tanggal', p.tanggal, 'cycle_id', p.cycle_id, 'kg_masuk_pt', p.kg_masuk_pt, 'catatan', p.catatan, 'status', p.status),
    jsonb_build_object('tanggal', baru.tanggal, 'cycle_id', baru.cycle_id, 'kg_masuk_pt', baru.kg_masuk_pt, 'catatan', baru.catatan, 'status', baru.status));
end;
$$;

-- Koreksi berat lot yang dipakai produksi (atau nambah lot). Sisa lot ikut disesuaikan.
create or replace function public.ubah_alokasi_lot(p_production uuid, p_lot uuid, p_kg numeric, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  l public.lots;
  lama numeric(12,3) := 0;
  selisih numeric(12,3);
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  perform private.wajib_belum_stok(p);
  if p.kg_masuk_pt is not null then
    raise exception 'Produksi % pakai ikan dari PT, nggak pakai lot.', p.kode using errcode = 'KT001';
  end if;
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
  end if;
  if l.qc = 'ditahan' then
    raise exception 'Lot % ditahan (gugur/bau), nggak bisa diolah.', l.kode using errcode = 'KT001';
  end if;
  perform private.valid_kg(p_kg, 'Berat dari lot');
  select a.kg into lama from public.lot_allocations a where a.production_id = p.id and a.lot_id = l.id;
  lama := coalesce(lama, 0);
  selisih := round(p_kg, 3) - lama;
  if selisih > l.sisa_kg then
    raise exception 'Lot % cuma sisa % kg.', l.kode, l.sisa_kg::text using errcode = 'KT001';
  end if;
  update public.lots set sisa_kg = sisa_kg - selisih where id = l.id;
  insert into public.lot_allocations (production_id, lot_id, lot_kode, kg) values (p.id, l.id, l.kode, round(p_kg, 3))
  on conflict (production_id, lot_id) do update set kg = excluded.kg;
  if p.status <> 'berjalan' then
    update public.productions set status = 'berjalan' where id = p.id;
  end if;
  perform private.cek_tidak_melebihi(p.id);
  perform private.catat_koreksi('productions', p.id, p.kode, p_alasan,
    jsonb_build_object('lot', l.kode, 'kg', lama, 'status', p.status),
    jsonb_build_object('lot', l.kode, 'kg', round(p_kg, 3), 'status', 'berjalan'));
end;
$$;

create or replace function public.buka_lagi_produksi(p_production uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
begin
  perform private.wajib_izin('produksi.setuju');
  p := private.produksi_terkunci(p_production);
  if p.status = 'berjalan' then
    raise exception 'Produksi % masih berjalan, langsung aja dikoreksi.', p.kode using errcode = 'KT001';
  end if;
  perform private.wajib_belum_stok(p);
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan buka lagi produksinya.' using errcode = 'KT001';
  end if;
  update public.productions set status = 'berjalan', catatan_perbaikan = trim(p_alasan) where id = p.id;
  perform private.catat_koreksi('productions', p.id, p.kode, p_alasan,
    jsonb_build_object('status', p.status), jsonb_build_object('status', 'berjalan'));
end;
$$;

-- Hasil produksi jasa jadi milik PT pemilik ikannya (tercatat seperti titipan).
create or replace function private.isi_proyek_stok()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.cycles;
begin
  if new.cycle_id is null and new.production_id is not null then
    select p.cycle_id into new.cycle_id from public.productions p where p.id = new.production_id;
  end if;
  if new.buyer_id is null and new.production_id is not null and new.cycle_id is not null then
    select * into c from public.cycles where id = new.cycle_id;
    if c.lini_bisnis = 'jasa' and c.pt_id is not null then
      new.buyer_id := c.pt_id;
      select b.nama into new.pemilik_nama from public.buyers b where b.id = c.pt_id;
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================ titipan per proyek
drop function public.terima_titipan(uuid, uuid, uuid, text, numeric, text, boolean, text, uuid);
create function public.terima_titipan(
  p_buyer uuid, p_product uuid, p_grade uuid, p_kondisi text, p_kg numeric,
  p_lokasi text default '', p_perlu_abf boolean default false, p_catatan text default '', p_room uuid default null,
  p_cycle uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.buyers;
  prod public.products;
  gr public.grades;
  kode_grade text;
  isi numeric;
  kap numeric;
  id_unit uuid;
  abf public.tariff_rules;
begin
  perform private.wajib_izin('gudang.write');
  perform private.valid_kg(p_kg, 'Berat titipan');
  select * into b from public.buyers where id = p_buyer and aktif;
  if not found then
    raise exception 'Pilih pelanggan pemilik titipan.' using errcode = 'KT001';
  end if;
  if p_kondisi not in ('fresh', 'beku') then
    raise exception 'Kondisi harus fresh atau beku.' using errcode = 'KT001';
  end if;
  if p_perlu_abf and p_kondisi <> 'fresh' then
    raise exception 'ABF cuma buat ikan fresh yang dibekukan.' using errcode = 'KT001';
  end if;
  select * into prod from public.products where id = p_product and aktif;
  if not found then
    raise exception 'Pilih produk.' using errcode = 'KT001';
  end if;
  if p_grade is not null then
    select * into gr from public.grades where id = p_grade and aktif;
    if not found then
      raise exception 'Grade nggak dikenal.' using errcode = 'KT001';
    end if;
    kode_grade := gr.kode;
  end if;
  if p_cycle is not null and not exists (select 1 from public.cycles c where c.id = p_cycle and c.status = 'terbuka') then
    raise exception 'Proyeknya nggak ketemu atau udah ditutup.' using errcode = 'KT001';
  end if;

  perform pg_advisory_xact_lock(hashtext('kapasitas_gudang'));
  select coalesce(sum(sisa_kg), 0) into isi from public.storage_units where status = 'aktif';
  kap := private.kapasitas_total();
  if isi + p_kg > kap then
    raise exception 'Kapasitas gudang % kg nggak cukup: terisi % kg, titipan baru % kg.', kap::text, isi::text, p_kg::text using errcode = 'KT001';
  end if;
  if p_room is not null then
    perform private.cek_ruangan(p_room, p_kg);
  end if;

  insert into public.storage_units (
    buyer_id, pemilik_nama, product_id, product_nama, grade_id, grade_kode, kondisi, lokasi,
    kg_masuk, sisa_kg, sisa_dasar_masuk, perlu_abf, catatan, room_id, cycle_id
  ) values (
    b.id, b.nama, prod.id, prod.nama, p_grade, kode_grade, p_kondisi, coalesce(p_lokasi, ''),
    p_kg, p_kg, p_kg, coalesce(p_perlu_abf, false), coalesce(p_catatan, ''), p_room, p_cycle
  ) returning id into id_unit;

  insert into public.storage_movements (unit_id, jenis, kg, kg_dasar, alasan)
  values (id_unit, 'masuk', p_kg, p_kg, 'Titipan ' || b.nama);

  if coalesce(p_perlu_abf, false) then
    abf := private.aturan_tarif('abf', current_date);
    insert into public.service_charges (unit_id, buyer_id, pemilik_nama, jenis, kg_dasar, tarif_per_kg, jumlah, rincian, masuk_pada)
    values (
      id_unit, b.id, b.nama, 'abf', p_kg, abf.tarif_per_kg, round(p_kg * abf.tarif_per_kg, 2),
      jsonb_build_object('kg_dasar', p_kg, 'tarif_per_kg', abf.tarif_per_kg, 'dikonfirmasi', abf.dikonfirmasi), now()
    );
  end if;
  return id_unit;
end;
$$;

-- ============================================================ view
create or replace view public.v_purchase_orders with (security_invoker = true) as
select
  po.id, po.kode, po.tanggal, po.supplier_id,
  coalesce(s.nama, '-') as supplier_nama,
  po.cycle_id, c.kode as siklus_kode,
  po.kg, po.harga_per_kg, po.total, po.catatan,
  po.status_persetujuan, po.harga_acuan, po.diajukan_pada,
  t.kg_diterima,
  case when t.n = 0 then 'belum' when t.kg_diterima >= po.kg then 'selesai' else 'sebagian' end as status_terima,
  b.total_bayar,
  case when b.total_bayar = 0 then 'belum' when b.total_bayar >= po.total then 'lunas' else 'sebagian' end as status_bayar,
  po.nota_menyusul,
  (select count(*) from public.documents d where d.ref_tabel = 'purchase_orders' and d.ref_id = po.id and d.jenis = 'nota')::int
    + (select count(*) from public.documents d join public.lots l on l.id = d.ref_id where d.ref_tabel = 'lots' and l.po_id = po.id and d.jenis = 'nota')::int as jml_nota,
  coalesce(t.lot_kode, '') as lot_kode,
  c.nama as proyek_nama
from public.purchase_orders po
left join public.suppliers s on s.id = po.supplier_id
left join public.cycles c on c.id = po.cycle_id
left join lateral (
  select count(*) as n, coalesce(sum(l.kg), 0)::numeric(12,3) as kg_diterima, string_agg(l.kode, ', ' order by l.kode) as lot_kode
  from public.lots l where l.po_id = po.id
) t on true
left join lateral (
  select coalesce(sum(p.jumlah), 0)::numeric(16,2) as total_bayar
  from public.payments p where p.po_id = po.id and not p.batal
) b on true;

create or replace view public.v_persetujuan with (security_invoker = true) as
select
  a.id, a.kode, a.jenis, a.ref_tabel, a.ref_id, a.judul, a.jumlah, a.status, a.payload,
  a.diajukan_oleh, a.diajukan_pada, a.diperiksa_oleh, a.diperiksa_pada, a.catatan_periksa,
  a.disetujui_oleh, a.disetujui_pada, a.catatan_revisi, a.alasan_tolak, a.batch_id,
  po.kode as po_kode, po.kg as po_kg, po.harga_per_kg, po.harga_acuan,
  coalesce(s.nama, '-') as supplier_nama,
  ((select count(*) from public.documents d where d.ref_tabel = 'purchase_orders' and d.ref_id = po.id and d.jenis = 'nota')
    + (select count(*) from public.documents d join public.lots l on l.id = d.ref_id where d.ref_tabel = 'lots' and l.po_id = po.id and d.jenis = 'nota'))::int as jml_nota,
  coalesce(po.nota_menyusul, false) as nota_menyusul
from public.approvals a
left join public.purchase_orders po on a.ref_tabel = 'purchase_orders' and po.id = a.ref_id
left join public.suppliers s on s.id = po.supplier_id;

-- Nilai beli per grade pakai harga per grade kalau ada.
create or replace view public.v_harga_beli with (security_invoker = true) as
select
  l.tanggal_terima as tanggal, l.supplier_id, coalesce(s.nama, '-') as supplier_nama,
  coalesce(g.kode, 'Belum dinilai') as grade_kode,
  sum(x.kg)::numeric(12,3) as kg,
  sum(round(x.kg * coalesce(pl.harga_per_kg, po.harga_per_kg), 2))::numeric(16,2) as nilai,
  count(distinct l.id)::int as jumlah_lot
from public.lots l
join public.purchase_orders po on po.id = l.po_id
left join public.suppliers s on s.id = l.supplier_id
cross join lateral (
  select lg.grade_id, lg.kg from public.lot_grades lg where lg.lot_id = l.id and lg.kg > 0 and l.qc = 'lulus'
  union all
  select null::uuid, l.kg - coalesce((select sum(lg.kg) from public.lot_grades lg where lg.lot_id = l.id and l.qc = 'lulus'), 0)
) x
left join public.grades g on g.id = x.grade_id
left join public.purchase_order_lines pl on pl.po_id = po.id and pl.grade_id = x.grade_id and pl.kg > 0
where x.kg > 0
group by l.tanggal_terima, l.supplier_id, s.nama, g.kode;

-- Dashboard: pembayaran yang dibatalkan nggak dihitung.
create or replace view public.v_dashboard with (security_invoker = true) as
select
  (select coalesce(sum(po.total), 0) from public.purchase_orders po where po.status_persetujuan = 'disetujui')::numeric(16,2)
    - (select coalesce(sum(p.jumlah), 0) from public.payments p join public.purchase_orders po on po.id = p.po_id
       where not p.batal and po.status_persetujuan = 'disetujui')::numeric(16,2) as hutang_pemasok,
  (select coalesce(sum(i.sisa), 0) from public.v_invoices i where i.status_tagihan <> 'dibatalkan')::numeric(16,2) as piutang,
  (select count(*) from public.v_invoices i where i.status_tagihan = 'terlambat')::int as invoice_terlambat,
  (select coalesce(sum(i.sisa), 0) from public.v_invoices i where i.status_tagihan = 'terlambat')::numeric(16,2) as piutang_terlambat,
  (select coalesce(sum(l.jumlah), 0) from public.ledger l where l.arah = 'masuk' and date_trunc('month', l.tanggal) = date_trunc('month', (now() at time zone 'Asia/Jakarta')::date))::numeric(16,2) as kas_masuk_bulan_ini,
  (select coalesce(sum(l.jumlah), 0) from public.ledger l where l.arah = 'keluar' and date_trunc('month', l.tanggal) = date_trunc('month', (now() at time zone 'Asia/Jakarta')::date))::numeric(16,2) as kas_keluar_bulan_ini,
  (select count(*) from public.approvals a where a.status in ('diajukan', 'diperiksa'))::int as persetujuan_menunggu,
  (select count(*) from public.expenses e where e.status = 'diajukan')::int as biaya_menunggu,
  (select count(*) from public.storage_movements m where m.jenis = 'koreksi' and m.status = 'diajukan')::int as koreksi_menunggu,
  (select count(*) from public.productions p where p.status in ('selesai', 'diperiksa_qc'))::int as produksi_menunggu,
  (select count(*) from public.productions p where p.status = 'berjalan')::int as produksi_berjalan,
  (select count(*) from public.lots l where l.qc = 'menunggu')::int as lot_menunggu_mutu,
  (select coalesce(sum(u.sisa_kg), 0) from public.storage_units u where u.status = 'aktif' and u.buyer_id is null)::numeric(12,3) as stok_sendiri_kg,
  (select coalesce(sum(u.sisa_kg), 0) from public.storage_units u where u.status = 'aktif' and u.buyer_id is not null)::numeric(12,3) as stok_titipan_kg,
  (select count(*) from public.sales_orders s where s.status = 'draf')::int as pesanan_belum_dikirim,
  (
    (select count(*) from public.purchase_orders po where po.status_persetujuan in ('diajukan', 'disetujui')
       and not exists (select 1 from public.documents d where d.ref_tabel = 'purchase_orders' and d.ref_id = po.id and d.jenis = 'nota')
       and not exists (select 1 from public.documents d join public.lots l on l.id = d.ref_id where d.ref_tabel = 'lots' and l.po_id = po.id and d.jenis = 'nota'))
    + (select count(*) from public.expenses e join public.expense_categories k on k.id = e.category_id where e.status in ('diajukan', 'disetujui') and k.nota_wajib
       and not exists (select 1 from public.documents d where d.ref_tabel = 'expenses' and d.ref_id = e.id and d.jenis = 'nota'))
    + (select count(*) from public.payments p where not p.batal and not exists (select 1 from public.documents d where d.ref_tabel = 'payments' and d.ref_id = p.id))
    + (select count(*) from public.customer_payments cp where not exists (select 1 from public.documents d where d.ref_tabel = 'customer_payments' and d.ref_id = cp.id))
  )::int as dokumen_kurang,
  (select count(*) from public.v_supply_stok s where s.aktif and s.status_stok = 'menipis')::int as barang_menipis,
  (select count(*) from public.v_supply_stok s where s.aktif and s.status_stok = 'habis')::int as barang_habis;

-- ============================================================ hak panggil
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.buat_proyek(text, text, uuid, date)',
    'public.koreksi_proyek(uuid, text, text, uuid, text)',
    'public.terima_ikan(uuid, numeric, date, uuid, text, text)',
    'public.ajukan_pembelian(uuid[], jsonb, boolean, text)',
    'public.koreksi_lot(uuid, numeric, date, uuid, uuid, text, text)',
    'public.koreksi_pembelian(uuid, jsonb, uuid, uuid, text, text)',
    'public.batalkan_pembayaran(uuid, text)',
    'public.mulai_produksi(jsonb, date, text, uuid, jsonb, numeric)',
    'public.koreksi_produksi(uuid, date, uuid, numeric, text, text)',
    'public.ubah_alokasi_lot(uuid, uuid, numeric, text)',
    'public.buka_lagi_produksi(uuid, text)',
    'public.terima_titipan(uuid, uuid, uuid, text, numeric, text, boolean, text, uuid, uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
revoke all on function private.wajib_belum_stok(public.productions) from public, anon, authenticated;

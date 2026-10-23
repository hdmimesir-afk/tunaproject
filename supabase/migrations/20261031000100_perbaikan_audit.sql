-- Perbaikan hasil audit terhadap PRD (23 Oktober 2026):
-- 1. Biaya terhubung ke PO dan produksi (F16). Siklus biaya diambil dari PO atau produksinya bila tidak dipilih,
--    dan biaya tidak boleh menunjuk siklus yang berbeda dengan PO atau produksinya (laba rugi siklus tetap benar).
-- 2. Siklus bisa ditutup Owner (Model data: status terbuka/ditutup) setelah urusannya beres; siklus yang ditutup
--    tidak bisa dipakai lagi untuk PO, pesanan, atau biaya baru. Bisa dibuka kembali dengan alasan.

-- ------------------------------------------------------- 1. biaya ke PO/produksi
create or replace function public.simpan_biaya(
  p_id uuid, p_category uuid, p_uraian text, p_jumlah numeric, p_tanggal date, p_cycle uuid, p_po uuid default null, p_production uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  k public.expense_categories;
  e public.expenses;
  id_e uuid;
  siklus_po uuid;
  siklus_prd uuid;
  siklus uuid := p_cycle;
begin
  perform private.wajib_izin('keuangan.write');
  select * into k from public.expense_categories where id = p_category and aktif;
  if not found then
    raise exception 'Pilih kategori biaya.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_uraian, ''))) = 0 then
    raise exception 'Tulis uraian biaya.' using errcode = 'KT001';
  end if;
  if p_jumlah is null or p_jumlah <= 0 or round(p_jumlah, 2) <> p_jumlah then
    raise exception 'Jumlah biaya harus lebih dari nol dengan paling banyak dua desimal.' using errcode = 'KT001';
  end if;
  if p_po is not null then
    select po.cycle_id into siklus_po from public.purchase_orders po where po.id = p_po;
    if not found then
      raise exception 'PO tidak ditemukan.' using errcode = 'KT001';
    end if;
  end if;
  if p_production is not null then
    select pr.cycle_id into siklus_prd from public.productions pr where pr.id = p_production;
    if not found then
      raise exception 'Produksi tidak ditemukan.' using errcode = 'KT001';
    end if;
  end if;
  -- Siklus mengikuti PO atau produksi bila tidak dipilih; bila dipilih, harus sama supaya laba rugi tidak tercampur.
  siklus := coalesce(siklus, siklus_po, siklus_prd);
  if (siklus_po is not null and siklus_po <> siklus) or (siklus_prd is not null and siklus_prd <> siklus) then
    raise exception 'Siklus biaya berbeda dengan siklus PO atau produksi yang dipilih.' using errcode = 'KT001';
  end if;

  if p_id is null then
    insert into public.expenses (category_id, kategori_nama, uraian, jumlah, tanggal, cycle_id, po_id, production_id)
    values (k.id, k.nama, trim(p_uraian), p_jumlah, coalesce(p_tanggal, current_date), siklus, p_po, p_production)
    returning id into id_e;
  else
    select * into e from public.expenses where id = p_id for update;
    if not found then
      raise exception 'Biaya tidak ditemukan.' using errcode = 'KT001';
    end if;
    if e.status not in ('draf', 'ditolak') then
      raise exception 'Biaya % sudah % dan tidak bisa diubah.', e.kode, e.status using errcode = 'KT001';
    end if;
    update public.expenses
    set category_id = k.id, kategori_nama = k.nama, uraian = trim(p_uraian), jumlah = p_jumlah, tanggal = coalesce(p_tanggal, tanggal),
        cycle_id = siklus, po_id = p_po, production_id = p_production, status = 'draf', alasan_tolak = ''
    where id = e.id;
    id_e := e.id;
  end if;
  return id_e;
end;
$$;

-- Daftar biaya menampilkan kode produksinya juga (kolom baru di akhir supaya view lama tetap cocok).
create or replace view public.v_expenses with (security_invoker = true) as
select
  e.id, e.kode, e.category_id, e.kategori_nama, e.uraian, e.jumlah, e.tanggal, e.cycle_id, c.kode as siklus_kode, e.po_id, p.kode as po_kode, e.production_id,
  e.status, e.alasan_tolak, e.diajukan_oleh, e.diajukan_pada, e.diputuskan_oleh, e.diputuskan_pada,
  (select count(*) from public.documents d where d.ref_tabel = 'expenses' and d.ref_id = e.id and d.jenis = 'nota')::int as jml_nota,
  k.nota_wajib,
  pr.kode as produksi_kode
from public.expenses e
left join public.cycles c on c.id = e.cycle_id
left join public.purchase_orders p on p.id = e.po_id
left join public.productions pr on pr.id = e.production_id
left join public.expense_categories k on k.id = e.category_id;

-- --------------------------------------------------------- 2. tutup siklus
-- Status siklus hanya lewat fungsi di bawah; kolom keterangan tetap bisa diubah pemegang siklus.write.
revoke update on public.cycles from authenticated;
grant update (tanggal_bongkar, ref_po_pembeli, no_bongkar, catatan) on public.cycles to authenticated;
-- siklus.tutup tidak diberikan ke peran mana pun: hanya pemegang semua izin (Owner).

create or replace function public.tutup_siklus(p_cycle uuid, p_catatan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.cycles;
  n int;
begin
  perform private.wajib_izin('siklus.tutup');
  select * into c from public.cycles where id = p_cycle for update;
  if not found then
    raise exception 'Siklus tidak ditemukan.' using errcode = 'KT001';
  end if;
  if c.status = 'ditutup' then
    raise exception 'Siklus % sudah ditutup.', c.kode using errcode = 'KT001';
  end if;
  select count(*) into n from public.purchase_orders where cycle_id = c.id and status_persetujuan in ('draf', 'diajukan', 'perlu_revisi');
  if n > 0 then
    raise exception '% PO siklus % belum diputuskan.', n, c.kode using errcode = 'KT001';
  end if;
  select count(*) into n from public.v_purchase_orders where cycle_id = c.id and status_persetujuan = 'disetujui' and status_bayar <> 'lunas';
  if n > 0 then
    raise exception '% PO siklus % belum lunas dibayar ke pemasok.', n, c.kode using errcode = 'KT001';
  end if;
  select count(*) into n from public.productions where cycle_id = c.id and status <> 'diperiksa';
  if n > 0 then
    raise exception '% produksi siklus % belum selesai diperiksa dan disetujui.', n, c.kode using errcode = 'KT001';
  end if;
  select count(*) into n from public.sales_orders where cycle_id = c.id and status = 'draf';
  if n > 0 then
    raise exception '% pesanan siklus % belum dikirim atau dibatalkan.', n, c.kode using errcode = 'KT001';
  end if;
  select count(*) into n from public.v_invoices where cycle_id = c.id and status_terbit <> 'dibatalkan' and sisa > 0;
  if n > 0 then
    raise exception '% tagihan siklus % belum lunas.', n, c.kode using errcode = 'KT001';
  end if;
  select count(*) into n from public.expenses where cycle_id = c.id and status in ('draf', 'diajukan');
  if n > 0 then
    raise exception '% biaya siklus % masih draf atau menunggu keputusan.', n, c.kode using errcode = 'KT001';
  end if;
  update public.cycles
  set status = 'ditutup', ditutup_oleh = (select auth.uid()), ditutup_pada = now(),
      catatan = case when length(trim(coalesce(p_catatan, ''))) > 0 then trim(p_catatan) else catatan end
  where id = c.id;
end;
$$;

create or replace function public.buka_kembali_siklus(p_cycle uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.cycles;
begin
  perform private.wajib_izin('siklus.tutup');
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan membuka kembali siklus.' using errcode = 'KT001';
  end if;
  select * into c from public.cycles where id = p_cycle for update;
  if not found or c.status <> 'ditutup' then
    raise exception 'Siklus tidak sedang ditutup.' using errcode = 'KT001';
  end if;
  update public.cycles set status = 'terbuka', catatan = trim(p_alasan) where id = c.id;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.tutup_siklus(uuid, text)', 'public.buka_kembali_siklus(uuid, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Siklus yang ditutup tidak bisa dihubungkan ke PO, pesanan, atau biaya baru (dijaga di database, bukan hanya pilihan di layar).
create or replace function private.tolak_siklus_ditutup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  kode_c text;
begin
  if new.cycle_id is null or (tg_op = 'UPDATE' and old.cycle_id is not distinct from new.cycle_id) then
    return new;
  end if;
  select c.kode into kode_c from public.cycles c where c.id = new.cycle_id and c.status = 'ditutup';
  if kode_c is not null then
    raise exception 'Siklus % sudah ditutup. Pilih siklus lain, atau minta Owner membukanya kembali.', kode_c using errcode = 'KT001';
  end if;
  return new;
end;
$$;
revoke all on function private.tolak_siklus_ditutup() from public, anon, authenticated;

create trigger purchase_orders_siklus_ditutup before insert or update on public.purchase_orders for each row execute function private.tolak_siklus_ditutup();
create trigger sales_orders_siklus_ditutup before insert or update on public.sales_orders for each row execute function private.tolak_siklus_ditutup();
create trigger expenses_siklus_ditutup before insert or update on public.expenses for each row execute function private.tolak_siklus_ditutup();

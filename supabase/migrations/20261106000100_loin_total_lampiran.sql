-- Keputusan tim Katalis 6 November 2026 (jawaban halaman /flowchart):
--   1. Loin tidak wajib ditimbang per potong. Sehari-hari cukup berat total per grade; grid per potong tetap ada sebagai pilihan.
--      Satu produksi memakai salah satu cara, tidak dicampur, supaya berat loin tidak terhitung dua kali.
--   2. Nota nelayan, tanda terima titipan, dan tagihan dibuat admin di luar sistem; sistem cukup menyimpan lampirannya.
-- Aturan (PRD): berat numeric(12,3); tidak ada hapus; perubahan hanya lewat fungsi; semua perubahan tercatat.

-- ============================================================ loin total per grade
create table public.production_loin_totals (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions (id),
  grade_id uuid not null references public.grades (id),
  -- Nol = grade ini dikosongkan lagi (baris tidak dihapus).
  kg numeric(12,3) not null check (kg >= 0),
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  unique (production_id, grade_id)
);
select private.pasang_aturan_tabel('public.production_loin_totals');
revoke insert, update on public.production_loin_totals from authenticated;
create policy "produksi terbaca" on public.production_loin_totals
  for select to authenticated using ((select private.has_permission('produksi.read')));

-- Neraca: loin = potong yang tidak batal + total per grade. Kolom tetap sama supaya tampilan lain tidak berubah.
create or replace view public.v_neraca_produksi with (security_invoker = true) as
select
  p.id as production_id,
  coalesce(a.masuk, 0)::numeric(12,3) as masuk_kg,
  (coalesce(i.loin, 0) + coalesce(t.loin, 0))::numeric(12,3) as loin_kg,
  coalesce(i.n, 0)::int as jumlah_loin,
  coalesce(c.samping, 0)::numeric(12,3) as samping_kg,
  p.limbah_kg,
  p.susut_kg,
  (coalesce(a.masuk, 0) - coalesce(i.loin, 0) - coalesce(t.loin, 0) - coalesce(c.samping, 0) - coalesce(p.limbah_kg, 0) - coalesce(p.susut_kg, 0))::numeric(12,3) as belum_jelas_kg,
  case when coalesce(a.masuk, 0) > 0 then round((coalesce(i.loin, 0) + coalesce(t.loin, 0)) / a.masuk * 100, 1) else 0 end as hasil_pct,
  case when coalesce(a.masuk, 0) > 0
    then round((a.masuk - coalesce(i.loin, 0) - coalesce(t.loin, 0) - coalesce(c.samping, 0) - coalesce(p.limbah_kg, 0) - coalesce(p.susut_kg, 0)) / a.masuk * 100, 1)
    else 0 end as belum_jelas_pct
from public.productions p
left join lateral (select sum(kg) as masuk from public.lot_allocations where production_id = p.id) a on true
left join lateral (select sum(kg) as loin, count(*) as n from public.production_items where production_id = p.id and not batal) i on true
left join lateral (select sum(kg) as loin from public.production_loin_totals where production_id = p.id) t on true
left join lateral (select sum(kg) as samping from public.production_components where production_id = p.id) c on true;

-- ------------------------------------------------------- simpan loin total
-- p_baris: [{"grade_id": uuid, "kg": 120.5}, ...]. Kg 0 mengosongkan grade itu. Aman diulang.
create or replace function public.simpan_loin_total(p_production uuid, p_baris jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  r record;
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  perform private.wajib_berjalan(p);
  if p_baris is null or jsonb_typeof(p_baris) <> 'array' then
    raise exception 'Data total loin tidak valid.' using errcode = 'KT001';
  end if;
  if exists (select 1 from public.production_items i where i.production_id = p.id and not i.batal) then
    raise exception 'Produksi % sudah diisi loin per potong. Lanjutkan di tabel per potong, atau batalkan potongannya dulu.', p.kode using errcode = 'KT001';
  end if;
  if (select count(distinct x ->> 'grade_id') from jsonb_array_elements(p_baris) x) <> jsonb_array_length(p_baris) then
    raise exception 'Satu grade hanya boleh diisi sekali.' using errcode = 'KT001';
  end if;

  for r in select * from jsonb_to_recordset(p_baris) as x(grade_id uuid, kg numeric) loop
    if r.kg is null or r.kg < 0 or round(r.kg, 3) <> r.kg then
      raise exception 'Berat loin per grade tidak boleh negatif dan paling banyak tiga desimal.' using errcode = 'KT001';
    end if;
    if not exists (select 1 from public.grades g where g.id = r.grade_id and (g.aktif or r.kg = 0)) then
      raise exception 'Grade tidak dikenal.' using errcode = 'KT001';
    end if;
    if r.kg = 0 and not exists (select 1 from public.production_loin_totals t where t.production_id = p.id and t.grade_id = r.grade_id) then
      continue;
    end if;
    insert into public.production_loin_totals (production_id, grade_id, kg)
    values (p.id, r.grade_id, r.kg)
    on conflict (production_id, grade_id) do update set kg = excluded.kg
      where public.production_loin_totals.kg <> excluded.kg;
  end loop;

  perform private.cek_tidak_melebihi(p.id);
  return jsonb_build_object('total_loin', (select loin_kg from public.v_neraca_produksi where production_id = p.id));
end;
$$;

-- ------------------------------------------------- simpan loin per potong
-- Sama dengan versi Fase 3, ditambah penolakan bila produksi sudah diisi total per grade.
create or replace function public.simpan_loin(p_production uuid, p_baris jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  r record;
  ada public.production_items;
  simpan int := 0;
  sama int := 0;
  konflik uuid[] := array[]::uuid[];
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  perform private.wajib_berjalan(p);
  if p_baris is null or jsonb_typeof(p_baris) <> 'array' then
    raise exception 'Data loin tidak valid.' using errcode = 'KT001';
  end if;
  if exists (select 1 from public.production_loin_totals t where t.production_id = p.id and t.kg > 0) then
    raise exception 'Produksi % sudah diisi total loin per grade. Kosongkan totalnya dulu bila ingin menimbang per potong.', p.kode using errcode = 'KT001';
  end if;

  for r in select * from jsonb_to_recordset(p_baris) as x(id uuid, no_ekor int, no_loin int, grade_id uuid, kg numeric, versi int) loop
    if r.id is null or r.no_loin is null or r.no_loin <= 0 then
      raise exception 'Setiap loin butuh nomor loin lebih dari nol.' using errcode = 'KT001';
    end if;
    if r.kg is null or r.kg <= 0 or round(r.kg, 3) <> r.kg then
      raise exception 'Berat loin nomor % harus lebih dari nol dengan paling banyak tiga desimal.', r.no_loin using errcode = 'KT001';
    end if;
    if r.no_ekor is not null and r.no_ekor <= 0 then
      raise exception 'Nomor ekor loin nomor % tidak valid.', r.no_loin using errcode = 'KT001';
    end if;
    if not exists (select 1 from public.grades g where g.id = r.grade_id and g.aktif) then
      raise exception 'Pilih grade untuk loin nomor %.', r.no_loin using errcode = 'KT001';
    end if;

    select * into ada from public.production_items where id = r.id for update;
    if found then
      if ada.production_id <> p.id then
        raise exception 'Loin nomor % milik produksi lain.', r.no_loin using errcode = 'KT001';
      end if;
      if ada.batal then
        raise exception 'Loin nomor % sudah dibatalkan dan tidak bisa diubah. Tambahkan loin baru.', ada.no_loin using errcode = 'KT001';
      end if;
      if ada.no_ekor is not distinct from r.no_ekor and ada.no_loin = r.no_loin and ada.grade_id = r.grade_id and ada.kg = r.kg then
        sama := sama + 1;
      elsif r.versi is not null and r.versi <> ada.versi then
        konflik := konflik || ada.id;
      else
        begin
          update public.production_items
          set no_ekor = r.no_ekor, no_loin = r.no_loin, grade_id = r.grade_id, kg = r.kg, versi = versi + 1
          where id = ada.id;
        exception when unique_violation then
          raise exception 'Nomor loin % sudah dipakai di produksi ini.', r.no_loin using errcode = 'KT001';
        end;
        simpan := simpan + 1;
      end if;
    else
      begin
        insert into public.production_items (id, production_id, no_ekor, no_loin, grade_id, kg)
        values (r.id, p.id, r.no_ekor, r.no_loin, r.grade_id, r.kg);
      exception when unique_violation then
        raise exception 'Nomor loin % sudah dipakai di produksi ini.', r.no_loin using errcode = 'KT001';
      end;
      simpan := simpan + 1;
    end if;
  end loop;

  perform private.cek_tidak_melebihi(p.id);
  return jsonb_build_object(
    'disimpan', simpan, 'sama', sama, 'konflik', to_jsonb(konflik),
    'total_loin', (select loin_kg from public.v_neraca_produksi where production_id = p.id),
    'versi', coalesce((
      select jsonb_object_agg(i.id::text, i.versi)
      from public.production_items i
      where i.production_id = p.id and i.id in (select (x ->> 'id')::uuid from jsonb_array_elements(p_baris) x)
    ), '{}'::jsonb)
  );
end;
$$;

-- ----------------------------------------------------------- selesai
-- Cukup ada berat loin, dari potong atau dari total per grade.
create or replace function public.selesaikan_produksi(p_production uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
begin
  perform private.wajib_izin('produksi.write');
  p := private.produksi_terkunci(p_production);
  perform private.wajib_berjalan(p);
  if coalesce((select n.loin_kg from public.v_neraca_produksi n where n.production_id = p.id), 0) <= 0 then
    raise exception 'Isi berat loin dulu (total per grade atau per potong) sebelum produksi diselesaikan.' using errcode = 'KT001';
  end if;
  perform private.cek_tidak_melebihi(p.id);
  update public.productions set status = 'selesai', selesai_oleh = (select auth.uid()), selesai_pada = now(), catatan_perbaikan = ''
  where id = p.id;
end;
$$;

-- ----------------------------------------------------- periksa (QC)
-- Sama dengan Fase 3; yang mengisi total loin juga dihitung sebagai penimbang.
create or replace function public.periksa_produksi(p_production uuid, p_penjelasan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
  n public.v_neraca_produksi;
  pelaku uuid := (select auth.uid());
begin
  perform private.wajib_izin('produksi.periksa');
  p := private.produksi_terkunci(p_production);
  if p.status <> 'selesai' then
    raise exception 'Produksi % belum selesai ditimbang atau sudah diperiksa (status %).', p.kode, replace(p.status, '_', ' ') using errcode = 'KT001';
  end if;
  if not private.punya_semua_izin() and (
       p.selesai_oleh = pelaku or p.dibuat_oleh = pelaku
       or exists (select 1 from public.production_items i where i.production_id = p.id and i.dibuat_oleh = pelaku)
       or exists (select 1 from public.production_loin_totals t where t.production_id = p.id and (t.dibuat_oleh = pelaku or t.diubah_oleh = pelaku))
     ) then
    raise exception 'Yang menimbang tidak boleh memeriksa produksi yang sama.' using errcode = 'KT001';
  end if;
  select * into n from public.v_neraca_produksi where production_id = p.id;
  if n.belum_jelas_kg > 0 and length(trim(coalesce(p_penjelasan, ''))) = 0 then
    raise exception 'Ada selisih belum jelas % kg. Tulis penjelasannya, atau teruskan ke Owner untuk diterima.', n.belum_jelas_kg::text using errcode = 'KT001';
  end if;
  update public.productions
  set status = 'diperiksa_qc', qc_oleh = pelaku, qc_pada = now(), penjelasan_selisih = trim(coalesce(p_penjelasan, ''))
  where id = p.id;
end;
$$;

revoke all on function public.simpan_loin_total(uuid, jsonb) from public, anon;
grant execute on function public.simpan_loin_total(uuid, jsonb) to authenticated;

-- ============================================================ lampiran
-- Titipan gudang bisa diberi lampiran, dan ada jenis tanda terima serta tagihan dari admin.
alter table public.documents drop constraint documents_ref_tabel_check;
alter table public.documents add constraint documents_ref_tabel_check
  check (ref_tabel in ('purchase_orders', 'payments', 'lots', 'sales_orders', 'invoices', 'customer_payments', 'expenses', 'storage_units'));
alter table public.documents drop constraint documents_jenis_check;
alter table public.documents add constraint documents_jenis_check
  check (jenis in ('nota', 'bukti_transfer', 'surat_jalan', 'foto_timbangan', 'tanda_terima', 'tagihan', 'lainnya'));

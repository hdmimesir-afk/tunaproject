-- Notulen masukan Mas Bisma (10 November 2026), poin 6: satu lot bisa berisi beberapa grade.
-- Cek mutu sekarang mencatat berat per grade. Jumlahnya boleh kurang dari berat lot; sisanya tercatat "belum dibagi".
-- lots.grade_id tetap ada sebagai grade utama (berat terbesar) supaya tampilan dan laporan lama tetap jalan.
-- Produksi tetap mengambil ikan per lot, tidak per grade.
-- Aturan (PRD): berat numeric(12,3); tidak ada hapus; perubahan hanya lewat fungsi; semua perubahan tercatat.

-- ============================================================ grade per lot
create table public.lot_grades (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots (id),
  grade_id uuid not null references public.grades (id),
  -- Nol = grade ini dikosongkan lagi saat cek mutu diubah (baris tidak dihapus).
  kg numeric(12,3) not null check (kg >= 0),
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  unique (lot_id, grade_id)
);
select private.pasang_aturan_tabel('public.lot_grades');
revoke insert, update on public.lot_grades from authenticated;
create policy "grade lot terbaca" on public.lot_grades
  for select to authenticated
  using ((select private.has_permission('mutu.read')) or (select private.has_permission('pembelian.read')));

-- Lot lama yang sudah lulus: seluruh beratnya masuk ke grade yang dipilih dulu.
insert into public.lot_grades (lot_id, grade_id, kg)
select id, grade_id, kg from public.lots where qc = 'lulus' and grade_id is not null;

-- ------------------------------------------------------ cek mutu per grade
-- p_baris: [{"grade_id": uuid, "kg": 300}, ...]. Hanya dipakai bila lulus; untuk tahan boleh kosong.
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
begin
  perform private.wajib_izin('mutu.write');
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot tidak ditemukan.' using errcode = 'KT001';
  end if;
  if p_hasil is null or p_hasil not in ('lulus', 'ditahan') then
    raise exception 'Hasil mutu harus lulus atau ditahan.' using errcode = 'KT001';
  end if;
  if l.sisa_kg < l.kg then
    raise exception 'Lot % sudah dipakai produksi, mutunya tidak bisa diubah.', l.kode using errcode = 'KT001';
  end if;

  if p_hasil = 'lulus' then
    if p_baris is null or jsonb_typeof(p_baris) <> 'array' or jsonb_array_length(p_baris) = 0 then
      raise exception 'Isi berat untuk minimal satu grade.' using errcode = 'KT001';
    end if;
    if (select count(distinct x ->> 'grade_id') from jsonb_array_elements(p_baris) x) <> jsonb_array_length(p_baris) then
      raise exception 'Satu grade hanya boleh diisi sekali.' using errcode = 'KT001';
    end if;
    for r in select * from jsonb_to_recordset(p_baris) as x(grade_id uuid, kg numeric) loop
      if r.kg is null or r.kg <= 0 or round(r.kg, 3) <> r.kg then
        raise exception 'Berat tiap grade harus lebih dari nol dengan paling banyak tiga desimal.' using errcode = 'KT001';
      end if;
      if not exists (select 1 from public.grades g where g.id = r.grade_id and g.aktif) then
        raise exception 'Pilih grade yang masih aktif.' using errcode = 'KT001';
      end if;
      total := total + r.kg;
    end loop;
    if total > l.kg then
      raise exception 'Jumlah berat per grade (% kg) melebihi berat lot % (% kg).', trim_scale(total)::text, l.kode, trim_scale(l.kg)::text using errcode = 'KT001';
    end if;
  end if;

  -- Grade yang tidak ada lagi di isian dikosongkan (kg 0), tidak dihapus.
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
end;
$$;

-- Versi lama (satu grade) tetap bisa dipanggil: seluruh berat lot masuk ke grade itu.
create or replace function public.cek_mutu(p_lot uuid, p_hasil text, p_grade uuid default null, p_catatan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  berat numeric(12,3);
begin
  if p_hasil = 'lulus' and p_grade is null then
    raise exception 'Pilih kelas mutu untuk lot yang lulus.' using errcode = 'KT001';
  end if;
  select kg into berat from public.lots where id = p_lot;
  perform public.cek_mutu_grade(
    p_lot, p_hasil,
    case when p_hasil = 'lulus' then jsonb_build_array(jsonb_build_object('grade_id', p_grade, 'kg', berat)) else '[]'::jsonb end,
    p_catatan);
end;
$$;

revoke all on function public.cek_mutu_grade(uuid, text, jsonb, text) from public, anon;
grant execute on function public.cek_mutu_grade(uuid, text, jsonb, text) to authenticated;

-- ============================================================ laporan harga beli
-- Nilai lot dibagi per grade sesuai beratnya. Sisa yang belum dibagi (dan lot yang belum lulus) masuk "Belum dinilai".
create or replace view public.v_harga_beli with (security_invoker = true) as
select
  l.tanggal_terima as tanggal, l.supplier_id, coalesce(s.nama, '-') as supplier_nama,
  coalesce(g.kode, 'Belum dinilai') as grade_kode,
  sum(x.kg)::numeric(12,3) as kg,
  sum(round(x.kg * po.harga_per_kg, 2))::numeric(16,2) as nilai,
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
where x.kg > 0
group by l.tanggal_terima, l.supplier_id, s.nama, g.kode;

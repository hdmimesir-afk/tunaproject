-- 23 Nov 2026: sistem grading cong di lot (penerimaan), permintaan mas Bisma. Lot cong nggak digrading sama sekali:
-- semua beratnya masuk satu kelas "CONG" (grade khusus, nggak muncul di tombol AB/C/D), terus pas diajukan cukup satu harga per kg.
--   1. Grade CONG (jenis utuh).
--   2. jadikan_cong: lot (per ekor atau berat total) diganti jadi cong. Ekor ikut CONG, hasil grading = berat dibayar penuh.
--      Kalau udah masuk pembelian, harganya pakai harga cong yg diisi (atau rata-rata PO sekarang) dan pembeliannya dihitung ulang.
--   3. Balik ke per grade: lewat koreksi biasa (pilih AB/C/D per ekor, atau grading per kg).
--   4. hitung_ulang_po: grade baru di PO yg udah ada harganya pakai harga rata-rata PO dulu (sebelumnya ditolak).

insert into public.grades (kode, nama, urutan, jenis)
select 'CONG', 'Cong, nggak digrading (sistem)', 99, 'utuh'
where not exists (select 1 from public.grades where upper(kode) = 'CONG');
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
    -- 23 Nov 2026: grade baru di PO yg udah ada harganya (misalnya lot diganti jadi cong, atau digrading ulang ke grade lain)
    -- pakai harga rata-rata PO sekarang dulu, biar koreksinya nggak ketahan. Finance bisa benerin lewat koreksi pembelian.
    if harga is null and exists (select 1 from public.purchase_order_lines pl where pl.po_id = po.id and pl.kg > 0) and po.harga_per_kg > 1 then
      harga := po.harga_per_kg;
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

-- p_kg: berat baru buat lot berat total (kosong = berat nggak berubah). Lot per ekor beratnya ngikut ekor.
create or replace function public.jadikan_cong(p_lot uuid, p_harga numeric, p_alasan text, p_kg numeric default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lots;
  cong uuid;
  kg_cong numeric(12,3);
  sebelum jsonb;
begin
  perform private.wajib_izin('penerimaan.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasannya.');
  select g.id into cong from public.grades g where upper(g.kode) = 'CONG' and g.aktif;
  if cong is null then
    raise exception 'Grade CONG nggak aktif. Aktifin dulu di Pengaturan.' using errcode = 'KT001';
  end if;
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
  end if;
  if l.qc = 'ditahan' then
    raise exception 'Lot % ditahan (gugur/bau), jadi nggak bisa dijadiin cong.', l.kode using errcode = 'KT001';
  end if;
  if p_harga is not null and (p_harga <= 0 or round(p_harga, 2) <> p_harga) then
    raise exception 'Harga cong per kg harus lebih dari nol.' using errcode = 'KT001';
  end if;

  select jsonb_build_object('qc', l.qc, 'grade', coalesce(jsonb_object_agg(g.kode, lg.kg) filter (where lg.kg > 0), '{}'::jsonb))
  into sebelum
  from public.lots x left join public.lot_grades lg on lg.lot_id = x.id left join public.grades g on g.id = lg.grade_id
  where x.id = l.id;

  if private.lot_per_ekor(l.id) then
    update public.lot_ekor set grade_id = cong where lot_id = l.id and not batal and grade_id is distinct from cong;
    select coalesce(sum(kg_bayar), 0) into kg_cong from public.lot_ekor where lot_id = l.id and not batal;
  else
    if p_kg is not null and round(p_kg, 3) <> l.kg then
      perform private.valid_kg(p_kg, 'Berat lot');
      if p_kg < l.kg - l.sisa_kg then
        raise exception 'Lot % udah dipakai produksi % kg, jadi beratnya nggak boleh kurang dari itu.', l.kode, trim_scale(l.kg - l.sisa_kg)::text using errcode = 'KT001';
      end if;
      update public.lots set kg = round(p_kg, 3), sisa_kg = round(p_kg, 3) - (l.kg - l.sisa_kg) where id = l.id;
      sebelum := sebelum || jsonb_build_object('kg', l.kg);
    end if;
    kg_cong := coalesce(round(p_kg, 3), l.kg);
  end if;
  update public.lot_grades set kg = 0 where lot_id = l.id and grade_id <> cong and kg <> 0;
  insert into public.lot_grades (lot_id, grade_id, kg) values (l.id, cong, kg_cong)
  on conflict (lot_id, grade_id) do update set kg = excluded.kg where public.lot_grades.kg <> excluded.kg;
  update public.lots set qc = 'lulus', grade_id = cong, qc_oleh = (select auth.uid()), qc_pada = now() where id = l.id;

  perform private.catat_koreksi('lots', l.id, l.kode, p_alasan, sebelum,
    jsonb_build_object('qc', 'lulus', 'grade', jsonb_build_object('CONG', kg_cong))
      || case when sebelum ? 'kg' then jsonb_build_object('kg', kg_cong) else '{}'::jsonb end);
  if private.po_per_grade(l.po_id) then
    perform private.hitung_ulang_po(l.po_id,
      case when p_harga is not null then jsonb_build_array(jsonb_build_object('grade_id', cong, 'harga_per_kg', p_harga)) end,
      'Lot ' || l.kode || ' jadi cong: ' || trim(p_alasan));
  end if;
end;
$$;

revoke all on function public.jadikan_cong(uuid, numeric, text, numeric) from public, anon;
grant execute on function public.jadikan_cong(uuid, numeric, text, numeric) to authenticated;
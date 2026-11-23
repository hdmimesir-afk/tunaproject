-- 23 Nov 2026: koreksi berat + grading lot sekaligus (permintaan mas Bisma). Bisa juga ganti cara catat lot dari per ekor
-- jadi berat total: ekornya dibatalin (nggak dihapus, tetap kecatat), beratnya jadi berat total, terus grading-nya diisi per kg
-- (misalnya AB 175 kg, C 185 kg). Arah sebaliknya (berat total jadi per ekor) udah bisa lewat koreksi_ekor.
-- Berat dan grading disimpan dalam satu transaksi, jadi nggak ada keadaan setengah jadi. Pembelian per grade dihitung ulang.

create or replace function public.koreksi_berat_grading(p_lot uuid, p_kg numeric, p_jumlah_ekor int, p_baris jsonb, p_alasan text)
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
  per_ekor boolean;
  sebelum jsonb;
  sesudah jsonb;
begin
  perform private.wajib_izin('penerimaan.write');
  perform private.cek_alasan(p_alasan, 'Tulis alasan koreksinya.');
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot nggak ketemu.' using errcode = 'KT001';
  end if;
  perform private.valid_kg(p_kg, 'Berat lot');
  terpakai := l.kg - l.sisa_kg;
  if p_kg < terpakai then
    raise exception 'Lot % udah dipakai produksi % kg, jadi beratnya nggak boleh kurang dari itu.', l.kode, trim_scale(terpakai)::text using errcode = 'KT001';
  end if;
  if p_jumlah_ekor is not null and (p_jumlah_ekor <= 0 or p_jumlah_ekor > 100000) then
    raise exception 'Jumlah ekor nggak masuk akal.' using errcode = 'KT001';
  end if;
  if p_baris is not null and jsonb_typeof(p_baris) <> 'array' then
    raise exception 'Isian grading-nya nggak valid.' using errcode = 'KT001';
  end if;
  per_ekor := private.lot_per_ekor(l.id);

  select jsonb_build_object('kg', l.kg, 'jumlah_ekor', l.jumlah_ekor, 'cara_catat', case when per_ekor then 'per ekor' else 'berat total' end,
           'grade', coalesce(jsonb_object_agg(g.kode, lg.kg) filter (where lg.kg > 0), '{}'::jsonb))
  into sebelum
  from public.lots x left join public.lot_grades lg on lg.lot_id = x.id left join public.grades g on g.id = lg.grade_id
  where x.id = l.id;

  -- Per ekor jadi berat total: ekornya dibatalin, beratnya pakai berat total yg diisi.
  if per_ekor then
    update public.lot_ekor set batal = true where lot_id = l.id and not batal;
  end if;
  update public.lots
  set kg = round(p_kg, 3), sisa_kg = round(p_kg, 3) - terpakai, jumlah_ekor = coalesce(p_jumlah_ekor, jumlah_ekor)
  where id = l.id;

  if p_baris is not null and jsonb_array_length(p_baris) > 0 then
    -- Grading per kg (butuh izin mutu.write). Ngecek total grading nggak lebih dari berat baru, terus ngitung ulang pembelian.
    perform public.cek_mutu_grade(l.id, 'lulus', p_baris, 'Koreksi: ' || trim(p_alasan));
  elsif l.qc = 'lulus' then
    select coalesce(sum(kg), 0) into digrade from public.lot_grades where lot_id = l.id;
    if digrade > p_kg then
      raise exception 'Hasil grading lot % totalnya % kg, lebih dari berat barunya. Isi juga grading-nya.', l.kode, trim_scale(digrade)::text using errcode = 'KT001';
    end if;
  end if;

  select * into baru from public.lots where id = l.id;
  select jsonb_build_object('kg', baru.kg, 'jumlah_ekor', baru.jumlah_ekor, 'cara_catat', 'berat total',
           'grade', coalesce(jsonb_object_agg(g.kode, lg.kg) filter (where lg.kg > 0), '{}'::jsonb))
  into sesudah
  from public.lot_grades lg join public.grades g on g.id = lg.grade_id where lg.lot_id = l.id;
  if sesudah is null then
    sesudah := jsonb_build_object('kg', baru.kg, 'jumlah_ekor', baru.jumlah_ekor, 'cara_catat', 'berat total', 'grade', '{}'::jsonb);
  end if;
  perform private.catat_koreksi('lots', l.id, l.kode, p_alasan, sebelum, sesudah);
end;
$$;

revoke all on function public.koreksi_berat_grading(uuid, numeric, int, jsonb, text) from public, anon;
grant execute on function public.koreksi_berat_grading(uuid, numeric, int, jsonb, text) to authenticated;

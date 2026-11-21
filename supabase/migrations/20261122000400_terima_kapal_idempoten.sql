-- 22 Nov 2026: penerimaan ikan anti dobel, plus asal kapal dan jenis ikan.
--   1. Anti dobel (idempotency): tiap kali form Terima ikan dibuka, aplikasi bikin satu kunci permintaan (uuid).
--      Permintaan dengan kunci yang sama (klik dua kali, retry abis timeout, kirim ulang) cuma bikin SATU lot; permintaan
--      berikutnya balikin lot yang sama tanpa ngubah apa-apa. Dua penerimaan beneran dengan data persis sama tetap boleh,
--      karena kuncinya beda. Kunci dikunci pakai advisory lock per transaksi, jadi dua permintaan barengan nggak bisa
--      lolos dua-duanya; indeks unik jadi pengaman terakhir.
--   2. Asal kapal (lots.kapal) dan jenis ikan (lots.jenis_ikan) per lot. Cara catat per ekor udah punya jenis per ekor
--      (lot_ekor.spesies), jadi jenis_ikan lot dikosongin di cara itu (jenisnya dibaca dari ekornya, nggak didobel).
--      Satu lot per ekor boleh campur jenis. Berat total: satu jenis per lot.
--   3. Kapal dan jenis bisa dibenerin lewat Koreksi lot (parameter baru, kosong = nggak diubah).
-- Data lama aman: kolom baru boleh kosong, kunci permintaan lama kosong. Proyek, grade, dan stok nggak berubah.

alter table public.lots add column kapal text not null default '' check (length(kapal) <= 80);
alter table public.lots add column jenis_ikan text not null default '' check (length(jenis_ikan) <= 40);
alter table public.lots add column kunci_permintaan uuid;
create unique index lots_kunci_permintaan_key on public.lots (kunci_permintaan) where kunci_permintaan is not null;

-- ============================================================ terima ikan lengkap
drop function public.terima_ikan_lengkap(uuid, date, uuid, text, text, numeric, int, jsonb, jsonb);
create function public.terima_ikan_lengkap(
  p_supplier uuid, p_tanggal date default current_date, p_cycle uuid default null, p_catatan text default '',
  p_proyek_baru text default null, p_kg numeric default null, p_jumlah_ekor int default null,
  p_ekor jsonb default null, p_grade jsonb default null,
  p_kapal text default '', p_jenis text default '', p_kunci uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_lot uuid;
  per_ekor boolean := p_ekor is not null and jsonb_typeof(p_ekor) = 'array' and jsonb_array_length(p_ekor) > 0;
  tot numeric;
  ada_grade int;
  n int;
  v_kapal text := trim(coalesce(p_kapal, ''));
  v_jenis text := trim(coalesce(p_jenis, ''));
begin
  perform private.wajib_izin('penerimaan.write');
  -- Permintaan yang sama (kunci sama) cuma diproses sekali. Yang kedua nunggu yang pertama selesai, terus dapet lot yang sama.
  if p_kunci is not null then
    perform pg_advisory_xact_lock(hashtextextended('terima_ikan:' || p_kunci::text, 0));
    select id into id_lot from public.lots where kunci_permintaan = p_kunci;
    if found then
      return id_lot;
    end if;
  end if;
  if length(v_kapal) > 80 then
    raise exception 'Nama kapal kepanjangan, maksimal 80 huruf.' using errcode = 'KT001';
  end if;
  if length(v_jenis) > 40 then
    raise exception 'Jenis ikan kepanjangan, maksimal 40 huruf.' using errcode = 'KT001';
  end if;

  if per_ekor then
    select coalesce(sum((x ->> 'kg')::numeric), 0), count(*) filter (where nullif(x ->> 'grade_id', '') is not null), count(*)
    into tot, ada_grade, n from jsonb_array_elements(p_ekor) x;
    id_lot := public.terima_ikan(p_supplier, round(tot, 3), p_tanggal, p_cycle, p_catatan, p_proyek_baru);
    perform private.isi_ekor(id_lot, p_ekor);
    perform private.sinkron_ekor_lot(id_lot);
    if ada_grade > 0 then
      if ada_grade < n then
        raise exception 'Grade-nya baru diisi di % dari % ekor. Isi semua, atau kosongin semua biar digrading belakangan.', ada_grade, n using errcode = 'KT001';
      end if;
      perform public.cek_mutu_grade(id_lot, 'lulus', '[]'::jsonb, '');
    end if;
    -- Per ekor: jenisnya ada di tiap ekor, jadi jenis lot nggak diisi (biar nggak dobel).
    v_jenis := '';
  else
    id_lot := public.terima_ikan(p_supplier, p_kg, p_tanggal, p_cycle, p_catatan, p_proyek_baru);
    if p_jumlah_ekor is not null then
      if p_jumlah_ekor <= 0 or p_jumlah_ekor > 100000 then
        raise exception 'Jumlah ekornya nggak masuk akal.' using errcode = 'KT001';
      end if;
      update public.lots set jumlah_ekor = p_jumlah_ekor where id = id_lot;
    end if;
    if p_grade is not null and jsonb_typeof(p_grade) = 'array' and jsonb_array_length(p_grade) > 0 then
      perform public.cek_mutu_grade(id_lot, 'lulus', p_grade, '');
    end if;
  end if;
  update public.lots set kapal = v_kapal, jenis_ikan = v_jenis, kunci_permintaan = p_kunci where id = id_lot;
  return id_lot;
end;
$$;

-- ============================================================ koreksi lot (plus kapal dan jenis)
drop function public.koreksi_lot(uuid, numeric, date, uuid, uuid, text, text);
create function public.koreksi_lot(
  p_lot uuid, p_kg numeric, p_tanggal date, p_supplier uuid, p_cycle uuid, p_catatan text, p_alasan text,
  p_kapal text default null, p_jenis text default null
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
  if length(trim(coalesce(p_kapal, ''))) > 80 or length(trim(coalesce(p_jenis, ''))) > 40 then
    raise exception 'Nama kapal maksimal 80 huruf, jenis ikan maksimal 40 huruf.' using errcode = 'KT001';
  end if;

  update public.lots
  set kg = round(p_kg, 3), sisa_kg = round(p_kg, 3) - terpakai,
      tanggal_terima = coalesce(p_tanggal, tanggal_terima), supplier_id = p_supplier, cycle_id = p_cycle,
      catatan = coalesce(p_catatan, ''),
      kapal = coalesce(trim(p_kapal), kapal),
      jenis_ikan = coalesce(trim(p_jenis), jenis_ikan)
  where id = l.id
  returning * into baru;

  perform private.catat_koreksi('lots', l.id, l.kode, p_alasan,
    jsonb_build_object('kg', l.kg, 'tanggal', l.tanggal_terima, 'supplier_id', l.supplier_id, 'cycle_id', l.cycle_id, 'catatan', l.catatan, 'kapal', l.kapal, 'jenis_ikan', l.jenis_ikan),
    jsonb_build_object('kg', baru.kg, 'tanggal', baru.tanggal_terima, 'supplier_id', baru.supplier_id, 'cycle_id', baru.cycle_id, 'catatan', baru.catatan, 'kapal', baru.kapal, 'jenis_ikan', baru.jenis_ikan));
  if private.po_per_grade(l.po_id) then
    perform private.hitung_ulang_po(l.po_id, null, 'Koreksi lot ' || l.kode || ': ' || trim(p_alasan));
  end if;
end;
$$;

do $$
begin
  execute 'revoke all on function public.terima_ikan_lengkap(uuid, date, uuid, text, text, numeric, int, jsonb, jsonb, text, text, uuid) from public, anon';
  execute 'grant execute on function public.terima_ikan_lengkap(uuid, date, uuid, text, text, numeric, int, jsonb, jsonb, text, text, uuid) to authenticated';
  execute 'revoke all on function public.koreksi_lot(uuid, numeric, date, uuid, uuid, text, text, text, text) from public, anon';
  execute 'grant execute on function public.koreksi_lot(uuid, numeric, date, uuid, uuid, text, text, text, text) to authenticated';
end;
$$;

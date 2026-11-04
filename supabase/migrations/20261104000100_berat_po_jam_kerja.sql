-- Notulensi pembaruan sistem.
-- 1. Penerimaan memakai berat yang sudah dicatat di PO, tanpa diisi ulang. Berat hanya dikirim bila kiriman nyata berbeda.
-- 2. Jadwal absensi: Senin-Jumat 08.00-17.00, Sabtu 08.00-12.00. Minggu di luar jadwal: tidak dihitung terlambat atau pulang awal.

-- ---------------------------------------------------------- terima ikan
-- p_kg kosong berarti seluruh sisa PO diterima.
create or replace function public.terima_po(p_po uuid, p_kg numeric, p_catatan text default '', p_sebelum_disetujui boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  po public.purchase_orders;
  tanda boolean;
  berat numeric(12,3);
  id_lot uuid;
begin
  perform private.wajib_izin('penerimaan.write');
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then
    raise exception 'PO tidak ditemukan.' using errcode = 'KT001';
  end if;
  if p_kg is null then
    berat := po.kg - coalesce((select sum(l.kg) from public.lots l where l.po_id = po.id), 0);
    if berat <= 0 then
      raise exception 'Berat PO % sudah diterima seluruhnya.', po.kode using errcode = 'KT001';
    end if;
  elsif p_kg <= 0 then
    raise exception 'Berat diterima harus lebih dari nol.' using errcode = 'KT001';
  else
    berat := round(p_kg, 3);
  end if;
  if po.status_persetujuan = 'disetujui' then
    tanda := false;
  elsif po.status_persetujuan = 'diajukan' and p_sebelum_disetujui then
    tanda := true;
  else
    raise exception 'PO % belum bisa menerima ikan (status %).', po.kode, po.status_persetujuan using errcode = 'KT001';
  end if;

  insert into public.lots (po_id, po_kode, supplier_id, cycle_id, kg, sisa_kg, sebelum_disetujui, catatan)
  values (po.id, po.kode, po.supplier_id, po.cycle_id, berat, berat, tanda, coalesce(p_catatan, ''))
  returning id into id_lot;
  return id_lot;
end;
$$;

-- --------------------------------------------------------- jadwal kerja
alter table public.work_sites
  add column jam_pulang time not null default '17:00',
  add column jam_masuk_sabtu time not null default '08:00',
  add column jam_pulang_sabtu time not null default '12:00';

update public.work_sites set jam_masuk = '08:00';

alter table public.attendance
  add column pulang_awal_menit int not null default 0 check (pulang_awal_menit >= 0);

-- ------------------------------------------------------------ catat absen
create or replace function public.catat_absen(p_jenis text, p_lat numeric, p_lng numeric, p_akurasi numeric, p_foto text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hari date := (now() at time zone 'Asia/Jakarta')::date;
  jam time := (now() at time zone 'Asia/Jakarta')::time;
  hari_ke int := extract(isodow from (now() at time zone 'Asia/Jakarta'))::int;
  situs public.work_sites;
  sudah timestamptz;
  jarak numeric;
  alasan text := '';
  lewat numeric;
  telat int := 0;
  awal int := 0;
  baru uuid;
begin
  perform private.wajib_izin('absensi.absen');
  if p_jenis is null or p_jenis not in ('masuk', 'pulang') then
    raise exception 'Jenis absen tidak dikenal.' using errcode = 'KT001';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Lokasi tidak terbaca. Nyalakan GPS lalu coba lagi.' using errcode = 'KT001';
  end if;
  if p_foto is null or left(p_foto, 37) <> uid::text || '/' then
    raise exception 'Foto absen tidak valid. Ambil foto langsung dari kamera.' using errcode = 'KT001';
  end if;
  perform pg_advisory_xact_lock(hashtext('absen:' || uid::text || hari::text));

  select a.waktu into sudah from public.attendance a where a.user_id = uid and a.tanggal = hari and a.jenis = p_jenis and a.hasil = 'berhasil';
  if sudah is not null then
    return jsonb_build_object('ok', false, 'alasan', format('Anda sudah absen %s hari ini pukul %s.', p_jenis, to_char(sudah at time zone 'Asia/Jakarta', 'HH24:MI')));
  end if;
  if p_jenis = 'pulang' and not exists (select 1 from public.attendance a where a.user_id = uid and a.tanggal = hari and a.jenis = 'masuk' and a.hasil = 'berhasil') then
    return jsonb_build_object('ok', false, 'alasan', 'Anda belum absen masuk hari ini.');
  end if;

  select s.* into situs from public.work_sites s
  where s.aktif
  order by private.jarak_m(p_lat::double precision, p_lng::double precision, s.lat::double precision, s.lng::double precision)
  limit 1;

  if not found then
    alasan := 'Belum ada lokasi kerja. Minta Super Admin menambahkannya di halaman Absensi.';
  else
    jarak := round(private.jarak_m(p_lat::double precision, p_lng::double precision, situs.lat::double precision, situs.lng::double precision)::numeric, 1);
    if p_akurasi is null or p_akurasi > situs.akurasi_maks_m then
      alasan := format('Sinyal GPS kurang akurat (±%s m, batas %s m). Pindah ke tempat terbuka lalu coba lagi.', coalesce(round(p_akurasi)::text, '?'), situs.akurasi_maks_m);
    elsif jarak > situs.radius_m then
      alasan := format('Anda %s m dari %s, di luar radius %s m.', round(jarak), situs.nama, situs.radius_m);
    end if;
  end if;

  if alasan = '' and hari_ke <> 7 then
    if p_jenis = 'masuk' then
      lewat := extract(epoch from (jam - case when hari_ke = 6 then situs.jam_masuk_sabtu else situs.jam_masuk end)) / 60;
      if lewat > situs.toleransi_menit then telat := floor(lewat)::int; end if;
    else
      lewat := extract(epoch from ((case when hari_ke = 6 then situs.jam_pulang_sabtu else situs.jam_pulang end) - jam)) / 60;
      if lewat > 0 then awal := ceil(lewat)::int; end if;
    end if;
  end if;

  insert into public.attendance (user_id, jenis, tanggal, site_id, lat, lng, akurasi_m, jarak_m, foto_path, hasil, alasan_gagal, terlambat_menit, pulang_awal_menit)
  values (uid, p_jenis, hari, situs.id, p_lat, p_lng, p_akurasi, jarak, p_foto, case when alasan = '' then 'berhasil' else 'gagal' end, alasan, telat, awal)
  returning id into baru;

  return jsonb_build_object('ok', alasan = '', 'alasan', alasan, 'id', baru, 'jarak_m', jarak, 'terlambat_menit', telat, 'pulang_awal_menit', awal,
    'lokasi', situs.nama, 'waktu', to_char(now() at time zone 'Asia/Jakarta', 'HH24:MI'));
end;
$$;

-- --------------------------------------------------------- lokasi kerja
drop function public.simpan_lokasi_kerja(uuid, text, numeric, numeric, int, int, time, int, boolean);

create function public.simpan_lokasi_kerja(
  p_id uuid, p_nama text, p_lat numeric, p_lng numeric, p_radius int, p_akurasi_maks int, p_jam_masuk time, p_toleransi int, p_aktif boolean,
  p_jam_pulang time default '17:00', p_jam_masuk_sabtu time default '08:00', p_jam_pulang_sabtu time default '12:00'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hasil uuid;
begin
  perform private.wajib_izin('absensi.kelola');
  if length(trim(coalesce(p_nama, ''))) = 0 then
    raise exception 'Isi nama lokasi.' using errcode = 'KT001';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Koordinat tidak valid. Pakai tombol lokasi saya, atau isi garis lintang dan bujur.' using errcode = 'KT001';
  end if;
  if p_radius not between 10 and 1000 then
    raise exception 'Radius harus antara 10 dan 1000 meter.' using errcode = 'KT001';
  end if;
  if p_akurasi_maks not between 5 and 500 then
    raise exception 'Batas akurasi GPS harus antara 5 dan 500 meter.' using errcode = 'KT001';
  end if;
  if p_toleransi not between 0 and 240 then
    raise exception 'Toleransi terlambat harus antara 0 dan 240 menit.' using errcode = 'KT001';
  end if;
  if p_jam_pulang <= p_jam_masuk or p_jam_pulang_sabtu <= p_jam_masuk_sabtu then
    raise exception 'Jam pulang harus setelah jam masuk.' using errcode = 'KT001';
  end if;
  if p_id is null then
    insert into public.work_sites (nama, lat, lng, radius_m, akurasi_maks_m, jam_masuk, jam_pulang, jam_masuk_sabtu, jam_pulang_sabtu, toleransi_menit, aktif)
    values (trim(p_nama), p_lat, p_lng, p_radius, p_akurasi_maks, p_jam_masuk, p_jam_pulang, p_jam_masuk_sabtu, p_jam_pulang_sabtu, p_toleransi, coalesce(p_aktif, true))
    returning id into hasil;
  else
    update public.work_sites
    set nama = trim(p_nama), lat = p_lat, lng = p_lng, radius_m = p_radius, akurasi_maks_m = p_akurasi_maks,
        jam_masuk = p_jam_masuk, jam_pulang = p_jam_pulang, jam_masuk_sabtu = p_jam_masuk_sabtu, jam_pulang_sabtu = p_jam_pulang_sabtu,
        toleransi_menit = p_toleransi, aktif = coalesce(p_aktif, true)
    where id = p_id
    returning id into hasil;
    if hasil is null then
      raise exception 'Lokasi kerja tidak ditemukan.' using errcode = 'KT001';
    end if;
  end if;
  return hasil;
end;
$$;

revoke all on function public.simpan_lokasi_kerja(uuid, text, numeric, numeric, int, int, time, int, boolean, time, time, time) from public, anon;
grant execute on function public.simpan_lokasi_kerja(uuid, text, numeric, numeric, int, int, time, int, boolean, time, time, time) to authenticated;

-- ----------------------------------------------------------- absen harian
drop function public.absensi_harian(date);

create function public.absensi_harian(p_tanggal date)
returns table (id uuid, user_id uuid, nama text, jenis text, waktu timestamptz, lokasi text, jarak_m numeric, akurasi_m numeric, hasil text, alasan_gagal text, terlambat_menit int, pulang_awal_menit int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.wajib_izin('absensi.rekap');
  return query
  select a.id, a.user_id, p.nama, a.jenis, a.waktu, coalesce(s.nama, '-'), a.jarak_m, a.akurasi_m, a.hasil, a.alasan_gagal, a.terlambat_menit, a.pulang_awal_menit
  from public.attendance a
  join public.profiles p on p.user_id = a.user_id
  left join public.work_sites s on s.id = a.site_id
  where a.tanggal = p_tanggal
  order by p.nama, a.waktu;
end;
$$;

revoke all on function public.absensi_harian(date) from public, anon;
grant execute on function public.absensi_harian(date) to authenticated;

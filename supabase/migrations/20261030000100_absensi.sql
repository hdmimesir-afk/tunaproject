-- Fase 7 · Absensi dan izin (F20, F21), tanpa peta pihak ketiga. Lokasi dari GPS perangkat; jarak dihitung di database
-- (rumus haversine) terhadap titik lokasi kerja. Waktu selalu dari server. Foto diambil langsung dari kamera (bukan galeri).
-- Catatan keamanan: koordinat dikirim perangkat, jadi GPS palsu tidak bisa dicegah penuh; yang dicatat dan bisa diperiksa:
-- akurasi, jarak, foto, dan waktu server. Absen yang ditolak juga tersimpan sebagai bukti percobaan.

insert into public.role_permissions (role_id, aksi) values
  ('finance', 'absensi.absen'),
  ('super_admin', 'absensi.absen'),
  ('kepala_produksi', 'absensi.absen'),
  ('petugas_lapangan', 'absensi.absen'),
  ('super_admin', 'absensi.rekap'),
  ('super_admin', 'absensi.kelola');
-- absensi.setuju (memutuskan izin) tidak diberikan ke peran mana pun: hanya pemegang semua izin (Owner).

-- ---------------------------------------------------------- lokasi kerja
create table public.work_sites (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) > 0),
  lat numeric(9,6) not null check (lat between -90 and 90),
  lng numeric(9,6) not null check (lng between -180 and 180),
  radius_m int not null default 50 check (radius_m between 10 and 1000),
  akurasi_maks_m int not null default 30 check (akurasi_maks_m between 5 and 500),
  jam_masuk time not null default '08:00',
  toleransi_menit int not null default 15 check (toleransi_menit between 0 and 240),
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);

-- ---------------------------------------------------------------- absen
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  jenis text not null check (jenis in ('masuk', 'pulang')),
  waktu timestamptz not null default now(),
  tanggal date not null,
  site_id uuid references public.work_sites (id),
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  akurasi_m numeric(8,1),
  jarak_m numeric(9,1),
  foto_path text not null,
  hasil text not null check (hasil in ('berhasil', 'gagal')),
  alasan_gagal text not null default '',
  terlambat_menit int not null default 0 check (terlambat_menit >= 0)
);
create index attendance_user_idx on public.attendance (user_id, tanggal desc);
create index attendance_tanggal_idx on public.attendance (tanggal desc);
-- Satu absen masuk dan satu absen pulang yang berhasil per orang per hari.
create unique index attendance_sekali_sehari on public.attendance (user_id, tanggal, jenis) where hasil = 'berhasil';

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  jenis text not null check (jenis in ('izin', 'sakit', 'libur')),
  dari date not null,
  sampai date not null,
  alasan text not null check (length(trim(alasan)) > 0),
  status text not null default 'diajukan' check (status in ('diajukan', 'disetujui', 'ditolak', 'dibatalkan')),
  diputuskan_oleh uuid,
  diputuskan_pada timestamptz,
  catatan_keputusan text not null default '',
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  check (sampai >= dari)
);
create index leave_requests_user_idx on public.leave_requests (user_id, dari desc);
create index leave_requests_status_idx on public.leave_requests (status, dibuat_pada);

select private.pasang_aturan_tabel('public.work_sites');
select private.pasang_aturan_tabel('public.attendance', false);
select private.pasang_aturan_tabel('public.leave_requests');
revoke insert, update on public.work_sites from authenticated;
revoke insert, update on public.attendance from authenticated;
revoke insert, update on public.leave_requests from authenticated;

create policy "lokasi kerja terbaca" on public.work_sites
  for select to authenticated using ((select private.has_permission('absensi.absen') or private.has_permission('absensi.kelola')));
create policy "absen sendiri atau rekap" on public.attendance
  for select to authenticated
  using ((user_id = (select auth.uid()) and (select private.has_permission('absensi.absen'))) or (select private.has_permission('absensi.rekap')));
create policy "izin sendiri atau rekap" on public.leave_requests
  for select to authenticated
  using ((user_id = (select auth.uid()) and (select private.has_permission('absensi.absen')))
         or (select private.has_permission('absensi.rekap')) or (select private.has_permission('absensi.setuju')));

-- ---------------------------------------------------------------- jarak
create or replace function private.jarak_m(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371000 * asin(least(1, sqrt(
    power(sin(radians(b_lat - a_lat) / 2), 2) + cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2)
  )));
$$;
revoke all on function private.jarak_m(double precision, double precision, double precision, double precision) from public, anon, authenticated;

-- ------------------------------------------------------------ catat absen
-- Mengembalikan {ok, alasan, ...}. Penolakan karena lokasi atau akurasi tidak melempar galat supaya percobaannya tetap tersimpan.
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
  situs public.work_sites;
  sudah timestamptz;
  jarak numeric;
  alasan text := '';
  lewat numeric;
  telat int := 0;
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

  if alasan = '' and p_jenis = 'masuk' then
    lewat := extract(epoch from (jam - situs.jam_masuk)) / 60;
    if lewat > situs.toleransi_menit then telat := floor(lewat)::int; end if;
  end if;

  insert into public.attendance (user_id, jenis, tanggal, site_id, lat, lng, akurasi_m, jarak_m, foto_path, hasil, alasan_gagal, terlambat_menit)
  values (uid, p_jenis, hari, situs.id, p_lat, p_lng, p_akurasi, jarak, p_foto, case when alasan = '' then 'berhasil' else 'gagal' end, alasan, telat)
  returning id into baru;

  return jsonb_build_object('ok', alasan = '', 'alasan', alasan, 'id', baru, 'jarak_m', jarak, 'terlambat_menit', telat,
    'lokasi', situs.nama, 'waktu', to_char(now() at time zone 'Asia/Jakarta', 'HH24:MI'));
end;
$$;

-- --------------------------------------------------------- lokasi kerja
create or replace function public.simpan_lokasi_kerja(
  p_id uuid, p_nama text, p_lat numeric, p_lng numeric, p_radius int, p_akurasi_maks int, p_jam_masuk time, p_toleransi int, p_aktif boolean
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
  if p_id is null then
    insert into public.work_sites (nama, lat, lng, radius_m, akurasi_maks_m, jam_masuk, toleransi_menit, aktif)
    values (trim(p_nama), p_lat, p_lng, p_radius, p_akurasi_maks, p_jam_masuk, p_toleransi, coalesce(p_aktif, true))
    returning id into hasil;
  else
    update public.work_sites
    set nama = trim(p_nama), lat = p_lat, lng = p_lng, radius_m = p_radius, akurasi_maks_m = p_akurasi_maks,
        jam_masuk = p_jam_masuk, toleransi_menit = p_toleransi, aktif = coalesce(p_aktif, true)
    where id = p_id
    returning id into hasil;
    if hasil is null then
      raise exception 'Lokasi kerja tidak ditemukan.' using errcode = 'KT001';
    end if;
  end if;
  return hasil;
end;
$$;

-- ----------------------------------------------------------------- izin
create or replace function public.ajukan_izin(p_jenis text, p_dari date, p_sampai date, p_alasan text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  baru uuid;
begin
  perform private.wajib_izin('absensi.absen');
  if p_jenis is null or p_jenis not in ('izin', 'sakit', 'libur') then
    raise exception 'Pilih jenis: izin, sakit, atau libur.' using errcode = 'KT001';
  end if;
  if p_dari is null or p_sampai is null or p_sampai < p_dari then
    raise exception 'Tanggal selesai tidak boleh sebelum tanggal mulai.' using errcode = 'KT001';
  end if;
  if p_sampai - p_dari > 60 then
    raise exception 'Satu pengajuan paling lama 60 hari.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasannya.' using errcode = 'KT001';
  end if;
  if exists (
    select 1 from public.leave_requests l
    where l.user_id = uid and l.status in ('diajukan', 'disetujui') and l.dari <= p_sampai and l.sampai >= p_dari
  ) then
    raise exception 'Sudah ada pengajuan di tanggal itu.' using errcode = 'KT001';
  end if;
  insert into public.leave_requests (user_id, jenis, dari, sampai, alasan)
  values (uid, p_jenis, p_dari, p_sampai, trim(p_alasan))
  returning id into baru;
  return baru;
end;
$$;

create or replace function public.putuskan_izin(p_id uuid, p_setuju boolean, p_catatan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.leave_requests;
begin
  perform private.wajib_izin('absensi.setuju');
  select * into r from public.leave_requests where id = p_id for update;
  if not found then
    raise exception 'Pengajuan tidak ditemukan.' using errcode = 'KT001';
  end if;
  if r.status <> 'diajukan' then
    raise exception 'Pengajuan ini sudah diputuskan atau dibatalkan.' using errcode = 'KT001';
  end if;
  if not coalesce(p_setuju, false) and length(trim(coalesce(p_catatan, ''))) = 0 then
    raise exception 'Tulis alasan menolak.' using errcode = 'KT001';
  end if;
  update public.leave_requests
  set status = case when p_setuju then 'disetujui' else 'ditolak' end,
      diputuskan_oleh = (select auth.uid()), diputuskan_pada = now(), catatan_keputusan = trim(coalesce(p_catatan, ''))
  where id = p_id;
end;
$$;

create or replace function public.batalkan_izin(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.leave_requests;
begin
  perform private.wajib_izin('absensi.absen');
  select * into r from public.leave_requests where id = p_id for update;
  if not found or r.user_id <> (select auth.uid()) then
    raise exception 'Pengajuan tidak ditemukan.' using errcode = 'KT001';
  end if;
  if r.status <> 'diajukan' then
    raise exception 'Hanya pengajuan yang belum diputuskan yang bisa dibatalkan.' using errcode = 'KT001';
  end if;
  update public.leave_requests set status = 'dibatalkan' where id = p_id;
end;
$$;

-- ------------------------------------------------------------ pembacaan
-- Daftar izin dengan nama pemohon. Pemohon biasa hanya melihat miliknya; Super Admin dan Owner melihat semua.
create or replace function public.daftar_izin()
returns table (id uuid, user_id uuid, nama text, jenis text, dari date, sampai date, alasan text, status text, catatan_keputusan text, dibuat_pada timestamptz, milik_saya boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.user_id, p.nama, l.jenis, l.dari, l.sampai, l.alasan, l.status, l.catatan_keputusan, l.dibuat_pada, (l.user_id = (select auth.uid()))
  from public.leave_requests l
  join public.profiles p on p.user_id = l.user_id
  where (select private.has_permission('absensi.absen'))
    and (l.user_id = (select auth.uid()) or (select private.has_permission('absensi.rekap')) or (select private.has_permission('absensi.setuju')))
  order by (l.status = 'diajukan') desc, l.dibuat_pada desc
  limit 200;
$$;

-- Semua absen pada satu hari (termasuk percobaan yang ditolak) dengan nama dan lokasi, untuk Super Admin dan Owner.
create or replace function public.absensi_harian(p_tanggal date)
returns table (id uuid, user_id uuid, nama text, jenis text, waktu timestamptz, lokasi text, jarak_m numeric, akurasi_m numeric, hasil text, alasan_gagal text, terlambat_menit int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.wajib_izin('absensi.rekap');
  return query
  select a.id, a.user_id, p.nama, a.jenis, a.waktu, coalesce(s.nama, '-'), a.jarak_m, a.akurasi_m, a.hasil, a.alasan_gagal, a.terlambat_menit
  from public.attendance a
  join public.profiles p on p.user_id = a.user_id
  left join public.work_sites s on s.id = a.site_id
  where a.tanggal = p_tanggal
  order by p.nama, a.waktu;
end;
$$;

-- Rekap per orang per bulan. Hari kerja Senin sampai Sabtu (Minggu libur); hari ini belum dihitung "tidak hadir".
create or replace function public.rekap_kehadiran(p_bulan date)
returns table (user_id uuid, nama text, role_nama text, hari_kerja int, hadir int, terlambat int, izin int, sakit int, libur int, tidak_hadir int)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  b date := date_trunc('month', p_bulan)::date;
  hari date := (now() at time zone 'Asia/Jakarta')::date;
  akhir date;
begin
  perform private.wajib_izin('absensi.rekap');
  akhir := least((b + interval '1 month - 1 day')::date, hari);
  return query
  with hr as (
    select g::date as tgl from generate_series(b::timestamp, akhir::timestamp, interval '1 day') g where extract(isodow from g) <> 7
  ), orang as (
    select p.user_id as uid, p.nama as nama_o, r.nama as role_o, (p.dibuat_pada at time zone 'Asia/Jakarta')::date as mulai
    from public.profiles p join public.roles r on r.id = p.role_id where p.aktif
  ), harian as (
    select o.uid, o.nama_o, o.role_o, hr.tgl,
           (a.id is not null) as hadir_h,
           coalesce(a.terlambat_menit, 0) as telat_h,
           (select l.jenis from public.leave_requests l where l.user_id = o.uid and l.status = 'disetujui' and hr.tgl between l.dari and l.sampai limit 1) as cuti_h
    from orang o
    cross join hr
    left join public.attendance a on a.user_id = o.uid and a.tanggal = hr.tgl and a.jenis = 'masuk' and a.hasil = 'berhasil'
    where hr.tgl >= o.mulai
  )
  select h.uid, h.nama_o, h.role_o, count(*)::int,
         (count(*) filter (where h.hadir_h))::int,
         (count(*) filter (where h.hadir_h and h.telat_h > 0))::int,
         (count(*) filter (where not h.hadir_h and h.cuti_h = 'izin'))::int,
         (count(*) filter (where not h.hadir_h and h.cuti_h = 'sakit'))::int,
         (count(*) filter (where not h.hadir_h and h.cuti_h = 'libur'))::int,
         (count(*) filter (where not h.hadir_h and h.cuti_h is null and h.tgl < hari))::int
  from harian h
  group by h.uid, h.nama_o, h.role_o
  order by h.nama_o;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.catat_absen(text, numeric, numeric, numeric, text)',
    'public.simpan_lokasi_kerja(uuid, text, numeric, numeric, int, int, time, int, boolean)',
    'public.ajukan_izin(text, date, date, text)',
    'public.putuskan_izin(uuid, boolean, text)',
    'public.batalkan_izin(uuid)',
    'public.daftar_izin()',
    'public.absensi_harian(date)',
    'public.rekap_kehadiran(date)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- storage
-- Foto absen: bucket privat, hanya JPEG kecil, hanya ke folder sendiri. Dibaca pemilik, atau yang berhak merekap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('absensi', 'absensi', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create policy "foto absen terbaca" on storage.objects
  for select to authenticated
  using (bucket_id = 'absensi' and (
    ((storage.foldername(name))[1] = (select auth.uid())::text and (select private.has_permission('absensi.absen')))
    or (select private.has_permission('absensi.rekap'))
  ));
create policy "foto absen diunggah" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'absensi' and (storage.foldername(name))[1] = (select auth.uid())::text and (select private.has_permission('absensi.absen')));

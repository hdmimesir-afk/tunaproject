-- Fase 2 · Fungsi alur: ajukan, periksa, setujui, tolak, revisi, terima ikan, cek mutu, bayar.
-- Semua perubahan status lewat sini. Setiap fungsi memeriksa izin pemanggil sendiri (security definer, search_path kosong).
-- Galat aturan bisnis memakai SQLSTATE KT001 supaya pesannya aman ditampilkan; izin ditolak memakai 42501.

create or replace function private.wajib_izin(p_aksi text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not private.has_permission(p_aksi) then
    raise exception 'Peran Anda tidak punya izin untuk %.', p_aksi using errcode = '42501';
  end if;
end;
$$;

create or replace function private.aturan(p_jenis text)
returns public.approval_rules
language plpgsql
stable
set search_path = ''
as $$
declare
  r public.approval_rules;
begin
  select * into r from public.approval_rules where jenis = p_jenis;
  if not found then
    raise exception 'Aturan persetujuan % belum ada.', p_jenis using errcode = 'KT001';
  end if;
  return r;
end;
$$;

-- ----------------------------------------------------------- ajukan
create or replace function public.ajukan_po(p_po uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  po public.purchase_orders;
  aturan public.approval_rules;
  acuan numeric(16,2);
  id_apv uuid;
begin
  perform private.wajib_izin('pembelian.write');
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then
    raise exception 'PO tidak ditemukan.' using errcode = 'KT001';
  end if;
  if po.status_persetujuan not in ('draf', 'perlu_revisi') then
    raise exception 'PO % tidak bisa diajukan dari status %.', po.kode, po.status_persetujuan using errcode = 'KT001';
  end if;
  aturan := private.aturan('pembelian');
  if aturan.bukti_wajib and not exists (
    select 1 from public.documents d where d.ref_tabel = 'purchase_orders' and d.ref_id = po.id and d.jenis = 'nota'
  ) then
    raise exception 'Lampirkan nota sebelum mengajukan PO.' using errcode = 'KT001';
  end if;

  -- Harga acuan: harga PO terakhir yang disetujui untuk pemasok yang sama. Hanya peringatan, bukan penolakan.
  select p.harga_per_kg into acuan
  from public.purchase_orders p
  where p.supplier_id = po.supplier_id and p.id <> po.id and p.status_persetujuan = 'disetujui'
  order by p.diajukan_pada desc nulls last, p.dibuat_pada desc
  limit 1;

  update public.purchase_orders
  set status_persetujuan = 'diajukan', harga_acuan = acuan, diajukan_pada = now()
  where id = po.id;

  insert into public.approvals (jenis, ref_tabel, ref_id, judul, jumlah, payload, diajukan_oleh)
  values (
    'pembelian', 'purchase_orders', po.id,
    'Beli ikan ' || po.kg::text || ' kg',
    po.total,
    jsonb_build_object('harga_per_kg', po.harga_per_kg, 'harga_acuan', acuan),
    (select auth.uid())
  )
  returning id into id_apv;
  return id_apv;
end;
$$;

-- ----------------------------------------------------------- periksa
create or replace function public.periksa_persetujuan(p_approval uuid, p_catatan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals;
  aturan public.approval_rules;
begin
  select * into a from public.approvals where id = p_approval for update;
  if not found then
    raise exception 'Persetujuan tidak ditemukan.' using errcode = 'KT001';
  end if;
  aturan := private.aturan(a.jenis);
  perform private.wajib_izin(aturan.pemeriksa_aksi);
  if a.status <> 'diajukan' then
    raise exception 'Persetujuan % tidak menunggu pemeriksaan (status %).', a.kode, a.status using errcode = 'KT001';
  end if;
  if a.diajukan_oleh = (select auth.uid()) and not private.punya_semua_izin() then
    raise exception 'Pemeriksa tidak boleh orang yang mengajukan.' using errcode = 'KT001';
  end if;
  update public.approvals
  set status = 'diperiksa', diperiksa_oleh = (select auth.uid()), diperiksa_pada = now(), catatan_periksa = coalesce(p_catatan, '')
  where id = a.id;
end;
$$;

-- ----------------------------------------------------------- setujui
-- Satu atau banyak sekaligus. Total yang dikonfirmasi pengguna harus sama dengan total sebenarnya,
-- supaya layar konfirmasi setuju massal tidak bisa basi.
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
    -- Pemegang semua izin (Owner) boleh memeriksa dan menyetujui sekaligus bila belum diperiksa.
    if a.status = 'diajukan' and private.punya_semua_izin() then
      null;
    elsif a.status <> 'diperiksa' then
      raise exception 'Persetujuan % belum diperiksa atau sudah diputuskan (status %).', a.kode, a.status using errcode = 'KT001';
    end if;
    n := n + 1;
    total := total + a.jumlah;
  end loop;

  if n <> cardinality(ids) then
    raise exception 'Sebagian persetujuan tidak ditemukan. Muat ulang daftar.' using errcode = 'KT001';
  end if;
  if total is distinct from p_total_konfirmasi then
    raise exception 'Total berubah dari yang dikonfirmasi. Muat ulang daftar lalu konfirmasi lagi.' using errcode = 'KT001';
  end if;

  update public.approvals
  set diperiksa_oleh = coalesce(diperiksa_oleh, pelaku),
      diperiksa_pada = coalesce(diperiksa_pada, now()),
      status = 'disetujui', disetujui_oleh = pelaku, disetujui_pada = now(), batch_id = bid
  where id = any(ids);

  update public.purchase_orders set status_persetujuan = 'disetujui'
  where id in (select ref_id from public.approvals where id = any(ids) and ref_tabel = 'purchase_orders');

  return jsonb_build_object('jumlah', n, 'total', total);
end;
$$;

-- ------------------------------------------------------------ tolak
create or replace function public.tolak_persetujuan(p_approval uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals;
begin
  select * into a from public.approvals where id = p_approval for update;
  if not found then
    raise exception 'Persetujuan tidak ditemukan.' using errcode = 'KT001';
  end if;
  perform private.wajib_izin((private.aturan(a.jenis)).penyetuju_aksi);
  if a.status not in ('diajukan', 'diperiksa') then
    raise exception 'Persetujuan % sudah diputuskan (status %).', a.kode, a.status using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan penolakan.' using errcode = 'KT001';
  end if;
  update public.approvals set status = 'ditolak', alasan_tolak = trim(p_alasan) where id = a.id;
  update public.purchase_orders set status_persetujuan = 'ditolak'
  where id = a.ref_id and a.ref_tabel = 'purchase_orders';
end;
$$;

-- ----------------------------------------------------- minta revisi
create or replace function public.minta_revisi(p_approval uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals;
  aturan public.approval_rules;
begin
  select * into a from public.approvals where id = p_approval for update;
  if not found then
    raise exception 'Persetujuan tidak ditemukan.' using errcode = 'KT001';
  end if;
  aturan := private.aturan(a.jenis);
  if not (private.has_permission(aturan.pemeriksa_aksi) or private.has_permission(aturan.penyetuju_aksi)) then
    raise exception 'Peran Anda tidak boleh meminta revisi.' using errcode = '42501';
  end if;
  if a.status not in ('diajukan', 'diperiksa') then
    raise exception 'Persetujuan % sudah diputuskan (status %).', a.kode, a.status using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis apa yang perlu diperbaiki.' using errcode = 'KT001';
  end if;
  update public.approvals set status = 'perlu_revisi', catatan_revisi = trim(p_alasan) where id = a.id;
  update public.purchase_orders set status_persetujuan = 'perlu_revisi'
  where id = a.ref_id and a.ref_tabel = 'purchase_orders';
end;
$$;

-- --------------------------------------------------------- terima ikan
-- Penerimaan boleh sebagian dan berulang. Bongkar malam: ikan boleh diterima sebelum PO disetujui,
-- dengan tanda; pembayaran tetap menunggu persetujuan.
create or replace function public.terima_po(p_po uuid, p_kg numeric, p_catatan text default '', p_sebelum_disetujui boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  po public.purchase_orders;
  tanda boolean;
  id_lot uuid;
begin
  perform private.wajib_izin('penerimaan.write');
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then
    raise exception 'PO tidak ditemukan.' using errcode = 'KT001';
  end if;
  if p_kg is null or p_kg <= 0 then
    raise exception 'Berat diterima harus lebih dari nol.' using errcode = 'KT001';
  end if;
  if po.status_persetujuan = 'disetujui' then
    tanda := false;
  elsif po.status_persetujuan = 'diajukan' and p_sebelum_disetujui then
    tanda := true;
  else
    raise exception 'PO % belum bisa menerima ikan (status %).', po.kode, po.status_persetujuan using errcode = 'KT001';
  end if;

  insert into public.lots (po_id, po_kode, supplier_id, cycle_id, kg, sisa_kg, sebelum_disetujui, catatan)
  values (po.id, po.kode, po.supplier_id, po.cycle_id, round(p_kg, 3), round(p_kg, 3), tanda, coalesce(p_catatan, ''))
  returning id into id_lot;
  return id_lot;
end;
$$;

-- ------------------------------------------------------------ cek mutu
create or replace function public.cek_mutu(p_lot uuid, p_hasil text, p_grade uuid default null, p_catatan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lots;
begin
  perform private.wajib_izin('mutu.write');
  select * into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lot tidak ditemukan.' using errcode = 'KT001';
  end if;
  if p_hasil not in ('lulus', 'ditahan') then
    raise exception 'Hasil mutu harus lulus atau ditahan.' using errcode = 'KT001';
  end if;
  if l.sisa_kg < l.kg then
    raise exception 'Lot % sudah dipakai produksi, mutunya tidak bisa diubah.', l.kode using errcode = 'KT001';
  end if;
  if p_hasil = 'lulus' and not exists (select 1 from public.grades g where g.id = p_grade and g.aktif) then
    raise exception 'Pilih kelas mutu untuk lot yang lulus.' using errcode = 'KT001';
  end if;
  update public.lots
  set qc = p_hasil,
      grade_id = case when p_hasil = 'lulus' then p_grade end,
      qc_oleh = (select auth.uid()), qc_pada = now(), qc_catatan = coalesce(p_catatan, '')
  where id = l.id;
end;
$$;

-- --------------------------------------------------------- bayar pemasok
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
    raise exception 'PO tidak ditemukan.' using errcode = 'KT001';
  end if;
  if po.status_persetujuan <> 'disetujui' then
    raise exception 'PO % belum disetujui. Pembayaran menunggu persetujuan Owner.', po.kode using errcode = 'KT001';
  end if;
  if p_jumlah is null or p_jumlah <= 0 then
    raise exception 'Jumlah bayar harus lebih dari nol.' using errcode = 'KT001';
  end if;
  select coalesce(sum(jumlah), 0) into sudah from public.payments where po_id = po.id;
  if sudah + round(p_jumlah, 2) > po.total then
    raise exception 'Pembayaran melebihi total PO. Sisa yang boleh dibayar: %.', (po.total - sudah)::text using errcode = 'KT001';
  end if;
  insert into public.payments (po_id, jumlah, tanggal, catatan)
  values (po.id, round(p_jumlah, 2), coalesce(p_tanggal, current_date), coalesce(p_catatan, ''))
  returning id into id_bayar;
  return id_bayar;
end;
$$;

-- ------------------------------------------- daftar PO tanpa harga
-- Penerima ikan memilih PO tanpa melihat harga dan total.
create or replace function public.po_siap_terima()
returns table (po_id uuid, kode text, supplier_nama text, kg numeric, kg_diterima numeric, status_persetujuan text, tanggal date)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.wajib_izin('penerimaan.write');
  return query
  select po.id, po.kode, coalesce(s.nama, '-'), po.kg,
         coalesce((select sum(l.kg) from public.lots l where l.po_id = po.id), 0)::numeric(12,3),
         po.status_persetujuan, po.tanggal
  from public.purchase_orders po
  left join public.suppliers s on s.id = po.supplier_id
  where po.status_persetujuan in ('diajukan', 'disetujui')
    and coalesce((select sum(l.kg) from public.lots l where l.po_id = po.id), 0) < po.kg
  order by po.tanggal desc, po.kode desc;
end;
$$;

-- ------------------------------------------------- nama pengguna
-- Nama dan peran pengguna aktif untuk ditampilkan di riwayat (tanpa email). Profil lengkap tetap dibatasi RLS.
create or replace function public.pengguna_ringkas()
returns table (user_id uuid, nama text, role_nama text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.wajib_izin('master.read');
  return query
  select p.user_id, p.nama, r.nama
  from public.profiles p left join public.roles r on r.id = p.role_id
  where p.aktif;
end;
$$;

-- ------------------------------------------------------------ hak panggil
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.ajukan_po(uuid)',
    'public.periksa_persetujuan(uuid, text)',
    'public.setujui_persetujuan(uuid[], numeric)',
    'public.tolak_persetujuan(uuid, text)',
    'public.minta_revisi(uuid, text)',
    'public.terima_po(uuid, numeric, text, boolean)',
    'public.cek_mutu(uuid, text, uuid, text)',
    'public.catat_bayar(uuid, numeric, date, text)',
    'public.po_siap_terima()',
    'public.pengguna_ringkas()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Fungsi bantu hanya dipanggil dari fungsi di atas (pemilik), tidak dari klien.
revoke all on function private.wajib_izin(text) from public, anon, authenticated;
revoke all on function private.aturan(text) from public, anon, authenticated;

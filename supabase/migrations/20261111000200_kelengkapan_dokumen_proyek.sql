-- Notulen masukan Mas Bisma (10 November 2026) dan jawaban perusahaan (11 November 2026):
-- poin 2 nota susulan, poin 3 pemberi persetujuan PO, poin 5 lampiran wajib, poin 7 pencatatan per proyek.
-- 1. Tugas pilihan admin: siapa yang menyetujui PO, memeriksa PO, dan melampirkan nota susulan dipilih admin per peran.
-- 2. PO boleh diajukan tanpa nota dengan tanda "nota menyusul"; input penerimaan dan produksi tidak tertahan.
-- 3. Aturan lampiran: admin menandai lampiran wajib atau opsional per catatan. Lampiran wajib yang belum ada
--    hanya ditandai "belum lengkap", tidak menghentikan pencatatan.
-- 4. Proyek (di database tetap tabel cycles): stok ikut tercatat per proyek dari produksinya.
-- Aturan (PRD): tidak ada hapus; perubahan lewat fungsi; semua perubahan tercatat.

-- ============================================================ tugas pilihan admin
create table public.tugas_pilihan (
  aksi text primary key,
  nama text not null,
  keterangan text not null default '',
  urutan int not null default 0
);
insert into public.tugas_pilihan (aksi, nama, keterangan, urutan) values
  ('persetujuan.setuju', 'Menyetujui PO', 'Memutuskan PO disetujui, ditolak, atau perlu revisi.', 1),
  ('persetujuan.periksa', 'Memeriksa PO', 'Memeriksa PO sebelum diputuskan. Boleh dilewati oleh yang menyetujui.', 2),
  ('nota.susulan', 'Melampirkan nota susulan', 'Menambah nota untuk PO yang sudah diajukan.', 3);

create table public.role_tugas (
  id uuid primary key default gen_random_uuid(),
  role_id text not null references public.roles (id),
  aksi text not null references public.tugas_pilihan (aksi),
  -- Mencabut tugas = aktif false, baris tidak dihapus.
  aktif boolean not null default true,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  unique (role_id, aksi)
);
select private.pasang_aturan_tabel('public.tugas_pilihan', false);
select private.pasang_aturan_tabel('public.role_tugas');
revoke insert, update on public.tugas_pilihan, public.role_tugas from authenticated;
create policy "tugas pilihan terbaca" on public.tugas_pilihan for select to authenticated using (true);
create policy "tugas peran terbaca" on public.role_tugas for select to authenticated using (true);

-- Pemegang lama tetap memegang tugasnya. Nota susulan awalnya untuk Finance dan Super Admin.
insert into public.role_tugas (role_id, aksi)
select rp.role_id, rp.aksi from public.role_permissions rp where rp.aksi in (select aksi from public.tugas_pilihan);
insert into public.role_tugas (role_id, aksi) values ('finance', 'nota.susulan'), ('super_admin', 'nota.susulan')
on conflict (role_id, aksi) do nothing;

-- Untuk aksi tugas pilihan, sumber izinnya role_tugas (yang aktif). Aksi lain tetap dari role_permissions.
create or replace function private.has_permission(p_aksi text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.user_id = (select auth.uid())
      and p.aktif
      and (not r.wajib_mfa or coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2')
      and (
        r.semua_izin
        or case
          when exists (select 1 from public.tugas_pilihan t where t.aksi = p_aksi)
            then exists (select 1 from public.role_tugas rt where rt.role_id = r.id and rt.aksi = p_aksi and rt.aktif)
          else exists (select 1 from public.role_permissions rp where rp.role_id = r.id and rp.aksi = p_aksi)
        end
      )
  );
$$;

create or replace function public.sesi_saya()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', p.user_id,
    'nama', p.nama,
    'email', p.email,
    'aktif', p.aktif,
    'role_id', r.id,
    'role_nama', r.nama,
    'semua_izin', coalesce(r.semua_izin, false),
    'wajib_mfa', coalesce(r.wajib_mfa, false),
    'aal', coalesce((select auth.jwt() ->> 'aal'), 'aal1'),
    'izin', coalesce((
      select jsonb_agg(x.aksi order by x.aksi) from (
        select rp.aksi from public.role_permissions rp
        where rp.role_id = r.id and rp.aksi not in (select t.aksi from public.tugas_pilihan t)
        union
        select rt.aksi from public.role_tugas rt where rt.role_id = r.id and rt.aktif
      ) x
    ), '[]'::jsonb)
  )
  from public.profiles p
  left join public.roles r on r.id = p.role_id
  where p.user_id = (select auth.uid());
$$;

-- Admin (izin akses.kelola) memberi atau mencabut tugas. Owner selalu memegang semua tugas.
-- Selain Owner, tidak ada yang boleh mengatur tugas untuk perannya sendiri.
create or replace function public.atur_tugas(p_role text, p_aksi text, p_aktif boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  peran public.roles;
begin
  perform private.wajib_izin('akses.kelola');
  if not exists (select 1 from public.tugas_pilihan where aksi = p_aksi) then
    raise exception 'Tugas tidak dikenal.' using errcode = 'KT001';
  end if;
  select * into peran from public.roles where id = p_role;
  if not found then
    raise exception 'Peran tidak ditemukan.' using errcode = 'KT001';
  end if;
  if peran.semua_izin then
    raise exception 'Peran % selalu memegang semua tugas.', peran.nama using errcode = 'KT001';
  end if;
  if p_aktif is null then
    raise exception 'Pilih beri atau cabut.' using errcode = 'KT001';
  end if;
  if not private.punya_semua_izin() and exists (
    select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role_id = p_role
  ) then
    raise exception 'Tugas untuk peran Anda sendiri hanya bisa diatur Owner.' using errcode = '42501';
  end if;
  insert into public.role_tugas (role_id, aksi, aktif) values (p_role, p_aksi, p_aktif)
  on conflict (role_id, aksi) do update set aktif = excluded.aktif
    where public.role_tugas.aktif is distinct from excluded.aktif;
end;
$$;

-- Siapa memegang tugas apa, untuk ditampilkan ("Yang bisa menyetujui: ..."). Nama saja, tanpa email.
create or replace function public.pemegang_tugas()
returns table (aksi text, role_id text, role_nama text, nama text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.aksi, r.id, r.nama, coalesce((
    select string_agg(coalesce(nullif(p.nama, ''), 'tanpa nama'), ', ' order by p.nama)
    from public.profiles p where p.role_id = r.id and p.aktif
  ), '')
  from public.tugas_pilihan t
  join public.roles r on r.semua_izin
    or exists (select 1 from public.role_tugas rt where rt.role_id = r.id and rt.aksi = t.aksi and rt.aktif)
  where (select auth.uid()) is not null
  order by t.urutan, r.urutan;
$$;

-- ============================================================ persetujuan
-- Pemegang tugas "Menyetujui PO" boleh langsung memutuskan tanpa menunggu diperiksa.
-- Yang mengajukan tidak boleh menyetujui pengajuannya sendiri, kecuali Owner.
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
      raise exception 'Persetujuan % sudah diputuskan (status %).', a.kode, a.status using errcode = 'KT001';
    end if;
    if a.diajukan_oleh = pelaku and not private.punya_semua_izin() then
      raise exception 'Persetujuan % diajukan oleh Anda sendiri. Minta pemegang tugas lain yang menyetujui.', a.kode using errcode = 'KT001';
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

-- ============================================================ aturan lampiran
create table public.document_rules (
  id uuid primary key default gen_random_uuid(),
  ref_tabel text not null check (ref_tabel in ('purchase_orders', 'lots', 'payments')),
  jenis text not null check (jenis in ('nota', 'bukti_transfer', 'surat_jalan', 'foto_timbangan', 'tanda_terima', 'tagihan', 'lainnya')),
  wajib boolean not null default false,
  keterangan text not null default '' check (length(keterangan) <= 300),
  urutan int not null default 0,
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid,
  unique (ref_tabel, jenis)
);
select private.pasang_aturan_tabel('public.document_rules');
revoke insert, update on public.document_rules from authenticated;
grant update (wajib, keterangan) on public.document_rules to authenticated;
create policy "aturan lampiran terbaca" on public.document_rules for select to authenticated using (true);
create policy "aturan lampiran diubah admin" on public.document_rules
  for update to authenticated
  using ((select private.has_permission('pengaturan.write')))
  with check ((select private.has_permission('pengaturan.write')));

-- Bawaan awal; admin bisa mengubah wajib/opsional dan keterangannya di Pengaturan.
insert into public.document_rules (ref_tabel, jenis, wajib, keterangan, urutan) values
  ('purchase_orders', 'nota', true, 'Nota dari nelayan atau pemasok. Bila belum ada, PO tetap bisa diajukan dengan tanda "nota menyusul".', 1),
  ('purchase_orders', 'lainnya', false, 'Berkas pendukung lain, misalnya foto kesepakatan harga.', 2),
  ('lots', 'foto_timbangan', true, 'Satu foto layar timbangan untuk setiap penerimaan. Penerimaan bertahap: satu foto per penerimaan, bukan per keranjang.', 1),
  ('lots', 'nota', false, 'Nota nelayan bila diberikan saat bongkar.', 2),
  ('lots', 'lainnya', false, 'Foto ikan atau berkas lain.', 3),
  ('payments', 'bukti_transfer', true, 'Bukti transfer atau kuitansi pembayaran ke pemasok.', 1);

-- ============================================================ nota menyusul
alter table public.purchase_orders add column nota_menyusul boolean not null default false;

drop function public.ajukan_po(uuid);
create function public.ajukan_po(p_po uuid, p_nota_menyusul boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  po public.purchase_orders;
  acuan numeric(16,2);
  id_apv uuid;
  ada_nota boolean;
begin
  perform private.wajib_izin('pembelian.write');
  select * into po from public.purchase_orders where id = p_po for update;
  if not found then
    raise exception 'PO tidak ditemukan.' using errcode = 'KT001';
  end if;
  if po.status_persetujuan not in ('draf', 'perlu_revisi') then
    raise exception 'PO % tidak bisa diajukan dari status %.', po.kode, po.status_persetujuan using errcode = 'KT001';
  end if;
  ada_nota := exists (select 1 from public.documents d where d.ref_tabel = 'purchase_orders' and d.ref_id = po.id and d.jenis = 'nota');
  if not ada_nota and not coalesce(p_nota_menyusul, false)
     and exists (select 1 from public.document_rules r where r.ref_tabel = 'purchase_orders' and r.jenis = 'nota' and r.wajib) then
    raise exception 'Lampirkan nota, atau tandai "Nota menyusul" bila notanya belum ada.' using errcode = 'KT001';
  end if;

  -- Harga acuan: harga PO terakhir yang disetujui untuk pemasok yang sama. Hanya peringatan, bukan penolakan.
  select p.harga_per_kg into acuan
  from public.purchase_orders p
  where p.supplier_id = po.supplier_id and p.id <> po.id and p.status_persetujuan = 'disetujui'
  order by p.diajukan_pada desc nulls last, p.dibuat_pada desc
  limit 1;

  update public.purchase_orders
  set status_persetujuan = 'diajukan', harga_acuan = acuan, diajukan_pada = now(),
      nota_menyusul = not ada_nota and coalesce(p_nota_menyusul, false)
  where id = po.id;

  insert into public.approvals (jenis, ref_tabel, ref_id, judul, jumlah, payload, diajukan_oleh)
  values (
    'pembelian', 'purchase_orders', po.id,
    'Beli ikan ' || private.teks_kg(po.kg) || ' kg',
    po.total,
    jsonb_build_object('harga_per_kg', po.harga_per_kg, 'harga_acuan', acuan, 'nota_menyusul', not ada_nota and coalesce(p_nota_menyusul, false)),
    (select auth.uid())
  )
  returning id into id_apv;
  return id_apv;
end;
$$;
revoke all on function public.ajukan_po(uuid, boolean) from public, anon;
grant execute on function public.ajukan_po(uuid, boolean) to authenticated;

-- Nota untuk PO yang sudah diajukan (nota susulan) hanya oleh pemegang tugas "Melampirkan nota susulan".
create or replace function private.boleh_lampir(p_ref text, p_id uuid, p_jenis text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_ref = 'purchase_orders' and p_jenis = 'nota' and exists (
      select 1 from public.purchase_orders po where po.id = p_id and po.status_persetujuan not in ('draf', 'perlu_revisi')
    ) then private.has_permission('nota.susulan')
    else true
  end;
$$;
revoke all on function private.boleh_lampir(text, uuid, text) from public, anon;
grant execute on function private.boleh_lampir(text, uuid, text) to authenticated;

drop policy "dokumen dicatat" on public.documents;
create policy "dokumen dicatat" on public.documents
  for insert to authenticated
  with check ((select private.has_permission('dokumen.write')) and private.boleh_lampir(ref_tabel, ref_id, jenis));

-- Kolom baru ditambahkan di akhir view supaya kolom lama tidak bergeser.
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
  (select count(*) from public.documents d where d.ref_tabel = 'purchase_orders' and d.ref_id = po.id and d.jenis = 'nota')::int as jml_nota
from public.purchase_orders po
left join public.suppliers s on s.id = po.supplier_id
left join public.cycles c on c.id = po.cycle_id
left join lateral (
  select count(*) as n, coalesce(sum(l.kg), 0)::numeric(12,3) as kg_diterima
  from public.lots l where l.po_id = po.id
) t on true
left join lateral (
  select coalesce(sum(p.jumlah), 0)::numeric(16,2) as total_bayar
  from public.payments p where p.po_id = po.id
) b on true;

create or replace view public.v_persetujuan with (security_invoker = true) as
select
  a.id, a.kode, a.jenis, a.ref_tabel, a.ref_id, a.judul, a.jumlah, a.status, a.payload,
  a.diajukan_oleh, a.diajukan_pada, a.diperiksa_oleh, a.diperiksa_pada, a.catatan_periksa,
  a.disetujui_oleh, a.disetujui_pada, a.catatan_revisi, a.alasan_tolak, a.batch_id,
  po.kode as po_kode, po.kg as po_kg, po.harga_per_kg, po.harga_acuan,
  coalesce(s.nama, '-') as supplier_nama,
  (select count(*) from public.documents d where d.ref_tabel = 'purchase_orders' and d.ref_id = po.id and d.jenis = 'nota')::int as jml_nota,
  coalesce(po.nota_menyusul, false) as nota_menyusul
from public.approvals a
left join public.purchase_orders po on a.ref_tabel = 'purchase_orders' and po.id = a.ref_id
left join public.suppliers s on s.id = po.supplier_id;

-- ============================================================ stok per proyek
alter table public.storage_units add column cycle_id uuid references public.cycles (id);
create index storage_units_cycle_idx on public.storage_units (cycle_id);
update public.storage_units su set cycle_id = p.cycle_id
from public.productions p where p.id = su.production_id and p.cycle_id is not null and su.cycle_id is null;

-- Stok dari produksi otomatis ikut proyek produksinya. Titipan tanpa produksi tidak punya proyek.
create or replace function private.isi_proyek_stok()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cycle_id is null and new.production_id is not null then
    select p.cycle_id into new.cycle_id from public.productions p where p.id = new.production_id;
  end if;
  return new;
end;
$$;
revoke all on function private.isi_proyek_stok() from public, anon, authenticated;
create trigger storage_units_proyek before insert on public.storage_units
  for each row execute function private.isi_proyek_stok();

-- ============================================================ hak panggil
revoke all on function public.atur_tugas(text, text, boolean) from public, anon;
grant execute on function public.atur_tugas(text, text, boolean) to authenticated;
revoke all on function public.pemegang_tugas() from public, anon;
grant execute on function public.pemegang_tugas() to authenticated;

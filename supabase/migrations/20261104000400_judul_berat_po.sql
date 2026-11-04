-- Judul persetujuan PO menulis berat dari numeric(12,3) apa adanya: 700 kg tampil "700.000 kg" dan terbaca 700 ton.
-- Sekarang memakai format Indonesia: 700, 1.500, 1.234,5. Judul PO yang sudah telanjur diajukan ikut dirapikan; beratnya tidak berubah.
create or replace function private.teks_kg(p_kg numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(to_char(trunc(p_kg), 'FM999,999,999,990'), ',', '.')
    || case when p_kg <> trunc(p_kg) then ',' || rtrim(substr(to_char(p_kg - trunc(p_kg), 'FM0.000'), 3), '0') else '' end;
$$;
revoke all on function private.teks_kg(numeric) from public, anon;
grant execute on function private.teks_kg(numeric) to authenticated;

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
    'Beli ikan ' || private.teks_kg(po.kg) || ' kg',
    po.total,
    jsonb_build_object('harga_per_kg', po.harga_per_kg, 'harga_acuan', acuan),
    (select auth.uid())
  )
  returning id into id_apv;
  return id_apv;
end;
$$;

update public.approvals
set judul = 'Beli ikan ' || private.teks_kg(substring(judul from 'Beli ikan ([0-9]+\.[0-9]{3}) kg')::numeric) || ' kg'
where judul ~ '^Beli ikan [0-9]+\.[0-9]{3} kg$';

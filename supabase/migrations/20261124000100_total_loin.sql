-- 24 Nov 2026: total berat loin dan total jumlah loin per produksi (permintaan mas Hanif lewat mas Bisma). Ini step sesudah
-- produksi tapi sebelum grading loin: loinnya ditimbang total dan dihitung jumlah potongnya dulu, baru dibagi per grade.
-- Diisi di rincian produksi, di atas form Loin total per grade. Selama produksi berjalan bebas diubah; kalau udah selesai,
-- ngubahnya wajib alasan dan kecatat sebagai koreksi.

alter table public.productions add column loin_berat_total numeric(12,3) check (loin_berat_total is null or loin_berat_total > 0);
alter table public.productions add column loin_jumlah_total int check (loin_jumlah_total is null or loin_jumlah_total > 0);
create or replace view public.v_productions with (security_invoker = true) as
select
  p.id, p.kode, p.tanggal, p.status, p.cycle_id, cy.kode as siklus_kode, p.catatan,
  n.masuk_kg, n.loin_kg, n.jumlah_loin, n.samping_kg, n.limbah_kg, n.susut_kg, n.belum_jelas_kg, n.hasil_pct, n.belum_jelas_pct,
  p.penjelasan_selisih, p.selisih_diterima, p.catatan_perbaikan,
  p.selesai_oleh, p.selesai_pada, p.qc_oleh, p.qc_pada, p.owner_oleh, p.owner_pada, p.dibuat_pada,
  p.kg_masuk_pt, cy.nama as proyek_nama, coalesce(cy.lini_bisnis, 'jual') as lini_bisnis, cy.pt_id, b.nama as pt_nama,
  exists (select 1 from public.storage_units u where u.production_id = p.id) as sudah_stok,
  p.jumlah_ekor,
  p.loin_berat_total, p.loin_jumlah_total
from public.productions p
left join public.cycles cy on cy.id = p.cycle_id
left join public.buyers b on b.id = cy.pt_id
left join public.v_neraca_produksi n on n.production_id = p.id;

create or replace function public.simpan_total_loin(p_production uuid, p_kg numeric, p_jumlah int, p_alasan text default '')
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
  if p_kg is null and p_jumlah is null then
    raise exception 'Isi total berat loin atau jumlah loinnya.' using errcode = 'KT001';
  end if;
  if p_kg is not null then
    perform private.valid_kg(p_kg, 'Total berat loin');
  end if;
  if p_jumlah is not null and (p_jumlah <= 0 or p_jumlah > 100000) then
    raise exception 'Jumlah loin harus angka bulat lebih dari nol.' using errcode = 'KT001';
  end if;
  -- Produksi yg udah selesai: ngubahnya dianggap koreksi (wajib alasan, kecatat).
  if p.status <> 'berjalan' then
    perform private.cek_alasan(p_alasan, 'Produksi ini udah selesai. Tulis alasan koreksinya.');
  end if;
  update public.productions set loin_berat_total = round(p_kg, 3), loin_jumlah_total = p_jumlah where id = p.id;
  if p.status <> 'berjalan' or length(trim(coalesce(p_alasan, ''))) > 0 then
    perform private.catat_koreksi('productions', p.id, p.kode, coalesce(nullif(trim(p_alasan), ''), 'Isi total loin'),
      jsonb_build_object('loin_berat_total', p.loin_berat_total, 'loin_jumlah_total', p.loin_jumlah_total),
      jsonb_build_object('loin_berat_total', round(p_kg, 3), 'loin_jumlah_total', p_jumlah));
  end if;
end;
$$;

revoke all on function public.simpan_total_loin(uuid, numeric, int, text) from public, anon;
grant execute on function public.simpan_total_loin(uuid, numeric, int, text) to authenticated;
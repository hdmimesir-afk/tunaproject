-- Jawaban tim Katalis 19 Nov 2026: titipan nggak ada yang transit. Walaupun cuma sebentar (kurang dari 10 hari, termasuk semalam),
-- tetap ditagih minimal 10 hari.
--   Rumus baru: hari = lama dibulatkan ke atas per 24 jam (minimal 1), ditagih paling sedikit minimum hari.
--   Transit cuma berlaku kalau masa transit di aturan tarif diisi lebih dari 0 jam; aturan simpan sekarang diset 0 (tanpa transit).
-- Rumus yang sama ada di lib/logic/tarif.ts dan diuji dengan kasus yang sama.

create or replace function public.hitung_biaya_simpan(
  p_kg numeric, p_masuk timestamptz, p_keluar timestamptz,
  p_tarif numeric, p_tarif_transit numeric, p_masa_transit_jam int, p_minimum_hari int
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  detik bigint;
  hari_bulat int;
  hari_tagih int;
  transit boolean;
  jumlah numeric(16,2);
begin
  if p_keluar < p_masuk then
    raise exception 'Waktu keluar lebih awal dari waktu masuk.' using errcode = 'KT001';
  end if;
  detik := ceil(extract(epoch from (p_keluar - p_masuk)))::bigint;
  transit := p_masa_transit_jam > 0 and detik <= p_masa_transit_jam::bigint * 3600;
  if transit then
    hari_bulat := 0;
    hari_tagih := 0;
    jumlah := round(p_kg * p_tarif_transit, 2);
  else
    hari_bulat := greatest(ceil(detik::numeric / 86400)::int, 1);
    hari_tagih := greatest(hari_bulat, p_minimum_hari);
    jumlah := round(p_kg * p_tarif * hari_tagih, 2);
  end if;
  return jsonb_build_object(
    'transit', transit, 'detik', detik, 'hari_bulat', hari_bulat, 'hari_ditagih', hari_tagih,
    'minimum_hari', p_minimum_hari, 'masa_transit_jam', p_masa_transit_jam,
    'tarif_per_kg', case when transit then p_tarif_transit else p_tarif end,
    'kg_dasar', p_kg, 'jumlah', jumlah
  );
end;
$$;

-- Aturan simpan yang berlaku: tanpa transit. Tagihan lama nggak berubah (udah tersimpan nominalnya).
update public.tariff_rules set masa_transit_jam = 0 where jenis = 'simpan' and masa_transit_jam <> 0;

-- Jalanin sekali di Supabase SQL Editor (produksi), SEBELUM push. Isinya sama dengan migrasi 20261122000100_kondisi_hasil.

begin;

-- 22 Nov 2026: kondisi hasil produksi (fresh atau beku) dipilih di rincian produksi.
--   Bisa dipilih kapan aja, dari produksi masih jalan sampai udah disetujui; unit stok otomatisnya ikut.
--   Kalau stoknya udah ada yang keluar (kejual atau diambil), kondisinya dikunci biar riwayat penjualan nggak berubah.
--   Tiap ganti kondisi tercatat di riwayat koreksi produksinya.

create or replace function public.atur_kondisi_hasil(p_production uuid, p_kondisi text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.productions;
begin
  perform private.wajib_izin('produksi.write');
  if p_kondisi not in ('fresh', 'beku') then
    raise exception 'Kondisi harus fresh atau beku.' using errcode = 'KT001';
  end if;
  p := private.produksi_terkunci(p_production);
  if p.kondisi_hasil = p_kondisi then
    return;
  end if;
  if exists (select 1 from public.storage_units u where u.production_id = p.id and u.otomatis and u.sisa_kg < u.kg_masuk) then
    raise exception 'Hasil % udah ada yang keluar dari stok, jadi kondisinya nggak bisa diganti lagi.', p.kode using errcode = 'KT001';
  end if;
  update public.productions set kondisi_hasil = p_kondisi where id = p.id;
  update public.storage_units set kondisi = p_kondisi where production_id = p.id and otomatis and kondisi <> p_kondisi;
  perform private.catat_koreksi('productions', p.id, p.kode, 'Kondisi hasil diganti jadi ' || p_kondisi,
    jsonb_build_object('kondisi_hasil', p.kondisi_hasil), jsonb_build_object('kondisi_hasil', p_kondisi));
end;
$$;

revoke all on function public.atur_kondisi_hasil(uuid, text) from public, anon;
grant execute on function public.atur_kondisi_hasil(uuid, text) to authenticated;

-- Catat migrasinya biar Supabase tahu udah jalan.
insert into supabase_migrations.schema_migrations (version, name) values ('20261122000100', 'kondisi_hasil') on conflict do nothing;

commit;

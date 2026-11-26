-- Jalanin sekali di Supabase SQL Editor (produksi), SEBELUM push. Isinya sama persis dengan migrasi:
--   20261127000100_kepala_rahang_spesies: kepala dan rahang dipisah, spesies titipan, jenis pemilik (PT/perorangan)
-- Satu transaksi: kalau ada yg gagal, nggak ada yg berubah. Aman dijalanin ulang.

begin;

-- 27 Nov 2026 (lanjutan rombak menu, permintaan tim Katalis):
--   1. Hasil samping "Kepala dan rahang" dipisah jadi "Kepala" dan "Rahang". Kategori lama diganti nama jadi Kepala
--      (data lama ikut, beratnya dulu ditimbang gabung), Rahang ditambah baru di sebelahnya. Produk stoknya ikut ganti nama.
--   2. Titipan punya kolom spesies (misalnya cumi, tuna sirip kuning), diisi pas terima titipan atau lewat koreksi.
--   3. Pelanggan (pemilik titipan, pembeli) dibedain PT/perusahaan atau perorangan.

-- ============================================================ 1. kepala dan rahang
do $$
declare
  kepala uuid;
  u int;
begin
  select id, urutan into kepala, u from public.component_categories where lower(nama) = 'kepala dan rahang' limit 1;
  if kepala is null then
    return;
  end if;
  update public.component_categories set urutan = urutan + 1 where urutan > u;
  update public.component_categories set nama = 'Kepala' where id = kepala;
  if not exists (select 1 from public.component_categories where lower(nama) = 'rahang') then
    insert into public.component_categories (nama, komponen, urutan) values ('Rahang', 'hasil_samping', u + 1);
  end if;
  if not exists (select 1 from public.products where lower(nama) = 'kepala') then
    update public.products set nama = 'Kepala' where lower(nama) = 'kepala dan rahang';
  end if;
  update public.storage_units set product_nama = 'Kepala' where component_category_id = kepala and product_nama <> 'Kepala';
  update public.sale_allocations set product_nama = 'Kepala' where lower(product_nama) = 'kepala dan rahang';
end;
$$;

-- ============================================================ 2. spesies titipan
alter table public.storage_units add column if not exists spesies text not null default '' check (length(spesies) <= 60);

-- Isi atau ubah spesies satu titipan. Dipanggil abis terima titipan (tanpa alasan) atau pas koreksi (alasan kecatat).
create or replace function public.atur_spesies_titipan(p_unit uuid, p_spesies text, p_alasan text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u public.storage_units;
  baru text := coalesce(trim(p_spesies), '');
begin
  perform private.wajib_izin('gudang.write');
  if length(baru) > 60 then
    raise exception 'Nama spesiesnya kepanjangan, maksimal 60 huruf.' using errcode = 'KT001';
  end if;
  select * into u from public.storage_units where id = p_unit for update;
  if not found or u.buyer_id is null then
    raise exception 'Titipan nggak ketemu.' using errcode = 'KT001';
  end if;
  if u.spesies = baru then
    return;
  end if;
  update public.storage_units set spesies = baru where id = u.id;
  if length(trim(coalesce(p_alasan, ''))) > 0 then
    perform private.catat_koreksi('storage_units', u.id, u.kode, p_alasan, jsonb_build_object('spesies', u.spesies), jsonb_build_object('spesies', baru));
  end if;
end;
$$;
revoke all on function public.atur_spesies_titipan(uuid, text, text) from public, anon;
grant execute on function public.atur_spesies_titipan(uuid, text, text) to authenticated;

-- ============================================================ 3. jenis pemilik
alter table public.buyers add column if not exists jenis_pemilik text not null default 'pt' check (jenis_pemilik in ('pt', 'perorangan'));

-- Catat migrasinya biar Supabase tahu udah jalan.
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261127000100', 'kepala_rahang_spesies')
on conflict do nothing;

commit;

-- Cek abis jalan (cuma baca): harus keluar Kepala sama Rahang.
select nama, komponen, urutan from public.component_categories order by urutan;
notify pgrst, 'reload schema';

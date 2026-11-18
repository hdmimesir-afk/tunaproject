-- Grade dibagi dua jenis (penjelasan tim 17 Nov 2026):
--   utuh: grading tuna utuh waktu penerimaan, buat harga ke nelayan (AB, C, D; D tetap dibeli).
--   loin: grading loin di produksi, buat tagihan ke buyer (A-SO sampai C-SL), dipakai juga di stok dan penjualan.
-- Data lama dibiarkan apa adanya; aturan jenis cuma berlaku buat isian baru.
-- Aturan (PRD): tidak ada hapus; perubahan hanya lewat fungsi; semua perubahan tercatat.

alter table public.grades add column jenis text not null default 'loin' check (jenis in ('utuh', 'loin'));
comment on column public.grades.jenis is 'utuh = grade tuna utuh waktu penerimaan (harga nelayan); loin = grade loin hasil produksi (tagihan buyer).';

insert into public.grades (kode, nama, urutan, jenis) values
  ('AB', 'Tuna utuh grade A/B', 1, 'utuh'),
  ('C', 'Tuna utuh grade C', 2, 'utuh'),
  ('D', 'Tuna utuh grade D, tetap dibeli', 3, 'utuh')
on conflict ((upper(kode))) do nothing;

-- Grade yang diisi harus sesuai jenisnya. Argumen trigger: jenis yang diminta.
create or replace function private.cek_jenis_grade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  minta text := tg_argv[0];
  g public.grades;
begin
  if new.grade_id is null then
    return new;
  end if;
  select * into g from public.grades where id = new.grade_id;
  if g.jenis is distinct from minta then
    raise exception '% itu grade %. Di sini pakai grade %.', g.kode,
      case g.jenis when 'utuh' then 'tuna utuh' else 'loin' end,
      case minta when 'utuh' then 'tuna utuh (AB, C, D)' else 'loin' end
      using errcode = 'KT001';
  end if;
  return new;
end;
$$;

create trigger lot_grades_jenis before insert or update of grade_id on public.lot_grades
  for each row execute function private.cek_jenis_grade('utuh');
create trigger production_items_jenis before insert or update of grade_id on public.production_items
  for each row execute function private.cek_jenis_grade('loin');
create trigger production_loin_totals_jenis before insert or update of grade_id on public.production_loin_totals
  for each row execute function private.cek_jenis_grade('loin');
create trigger storage_units_jenis before insert or update of grade_id on public.storage_units
  for each row execute function private.cek_jenis_grade('loin');

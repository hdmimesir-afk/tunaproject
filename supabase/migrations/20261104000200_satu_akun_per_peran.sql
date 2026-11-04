-- Satu akun aktif untuk satu peran. Berlaku untuk perubahan dari aplikasi; pekerjaan sistem (tanpa auth.uid) dibiarkan,
-- seperti private.jaga_profil. Akun lama yang sudah terlanjur ganda tidak diubah; aturan berlaku saat peran atau status berubah.

create or replace function private.jaga_satu_akun_per_peran()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pemegang text;
  nama_peran text;
begin
  if (select auth.uid()) is null or new.role_id is null or not new.aktif then
    return new;
  end if;
  if new.role_id is not distinct from old.role_id and old.aktif then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('peran:' || new.role_id));
  select coalesce(nullif(p.nama, ''), p.email) into pemegang
  from public.profiles p
  where p.role_id = new.role_id and p.aktif and p.user_id <> new.user_id
  limit 1;
  if pemegang is not null then
    select r.nama into nama_peran from public.roles r where r.id = new.role_id;
    raise exception 'Peran % sudah dipakai akun %. Satu peran hanya untuk satu akun aktif; nonaktifkan akun itu dulu.', nama_peran, pemegang using errcode = 'KT001';
  end if;
  return new;
end;
$$;
revoke all on function private.jaga_satu_akun_per_peran() from public, anon, authenticated;

create trigger profiles_satu_peran before update on public.profiles
  for each row execute function private.jaga_satu_akun_per_peran();

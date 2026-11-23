-- 23 Nov 2026: hapus akun pengguna dari menu Akses (permintaan user, buat buang akun uji).
-- Pengaman:
--   1. Cuma pemegang akses.kelola (Owner dan Super Admin).
--   2. Nggak bisa hapus akun sendiri atau akun Owner.
--   3. Akunnya harus udah nonaktif dan tanpa peran (Lepas peran dulu), biar nggak kehapus nggak sengaja.
--   4. Akun yg punya catatan absen atau izin nggak bisa dihapus (riwayat kehadiran nggak boleh ilang). Biarin nonaktif aja.
--   5. Wajib alasan. Kecatat di hapus_data_log (bagian 'akun'), sama kayak Hapus data.
-- Profil dan akun login (auth.users) dihapus dalam satu transaksi: kalau satu gagal, nggak ada yg kehapus.
-- Jejak perubahan lama (activity_log) tetap ada.

create or replace function public.hapus_akun(p_user uuid, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles;
  n_absen int;
begin
  perform private.wajib_izin('akses.kelola');
  if p_user is null then
    raise exception 'Akunnya nggak valid.' using errcode = 'KT001';
  end if;
  if p_user = auth.uid() then
    raise exception 'Akun sendiri nggak bisa dihapus.' using errcode = 'KT001';
  end if;
  if length(trim(coalesce(p_alasan, ''))) = 0 or length(p_alasan) > 500 then
    raise exception 'Tulis alasan hapusnya (maksimal 500 huruf).' using errcode = 'KT001';
  end if;
  select * into p from public.profiles where user_id = p_user for update;
  if not found then
    raise exception 'Akunnya nggak ketemu.' using errcode = 'KT001';
  end if;
  if p.role_id = 'owner' then
    raise exception 'Akun Owner nggak bisa dihapus.' using errcode = 'KT001';
  end if;
  if p.aktif or p.role_id is not null then
    raise exception 'Lepas peran akun ini dulu (biar nonaktif dan tanpa peran), baru bisa dihapus.' using errcode = 'KT001';
  end if;
  select (select count(*) from public.attendance a where a.user_id = p_user)
       + (select count(*) from public.leave_requests l where l.user_id = p_user)
  into n_absen;
  if n_absen > 0 then
    raise exception 'Akun ini punya % catatan absen atau izin, jadi nggak bisa dihapus biar riwayat kehadirannya nggak ilang. Biarin nonaktif aja.', n_absen using errcode = 'KT001';
  end if;

  perform set_config('katalis.hapus_resmi', 'ya', true);
  delete from public.profiles where user_id = p_user;
  delete from auth.users where id = p_user;
  perform set_config('katalis.hapus_resmi', '', true);

  insert into public.hapus_data_log (oleh, oleh_nama, bagian, alasan, rincian, total)
  values (
    (select auth.uid()),
    coalesce((select nama from public.profiles where user_id = auth.uid()), 'pengguna'),
    array['akun'],
    trim(p_alasan),
    jsonb_build_array(jsonb_build_object('tabel', 'profiles', 'label', 'Akun pengguna', 'jumlah', 1,
      'kode', jsonb_build_array(trim(coalesce(nullif(p.nama, ''), 'tanpa nama') || ' (' || p.email || ')')))),
    1
  );
end;
$$;

revoke all on function public.hapus_akun(uuid, text) from public, anon;
grant execute on function public.hapus_akun(uuid, text) to authenticated;

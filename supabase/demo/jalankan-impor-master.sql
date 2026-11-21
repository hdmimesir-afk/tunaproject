-- Jalanin sekali di Supabase SQL Editor (produksi), SEBELUM push. Isinya sama persis dengan migrasi:
--   20261122000600_impor_master: Upload Excel data master (pemasok, pembeli, produk, barang penunjang)
-- Semuanya dalam satu transaksi: kalau ada yg gagal, nggak ada yg berubah. Data lama nggak diubah.

begin;

-- =====================================================================
-- 20261122000600_impor_master
-- =====================================================================
-- 22 Nov 2026: upload Excel buat data master (pemasok, pembeli, produk, barang penunjang).
--   - Satu fungsi public.impor_master dipakai dua kali: pratinjau (p_simpan = false, nggak nulis apa-apa) dan simpan.
--   - Tiap baris dicocokin pakai nama (barang penunjang: kategori + nama), huruf besar kecil nggak ngaruh.
--     Belum ada = dibikin baru. Udah ada = kolom yg diisi di file dipakai, kolom yg kosong di file dibiarin (nggak dikosongin).
--     Udah ada dan sama persis = dilewati. Data yg nonaktif diaktifin lagi.
--   - Semua masuk atau nggak sama sekali: kalau ada satu baris salah, nggak ada yg disimpan.
--   - Anti dobel: tiap upload bawa kunci (uuid). Kunci yg sama cuma diproses sekali, kiriman ulang dapet ringkasan yg sama.
--     Upload ulang file yg sama juga aman: semua barisnya jadi "sama, dilewati".
--   - Tiap upload kecatat di impor_master_log (siapa, kapan, file apa, berapa baru/diubah/sama). Perubahan per baris
--     kecatat di jejak perubahan seperti biasa (trigger catat_jejak).
--   - Izin: pemasok, pembeli, produk = master.write (sama kayak tombol Tambah di Pengaturan). Barang penunjang = stok.write.

create table public.impor_master_log (
  id uuid primary key default gen_random_uuid(),
  kunci uuid not null unique,
  jenis text not null check (jenis in ('suppliers', 'buyers', 'products', 'supply_items')),
  nama_file text not null default '' check (length(nama_file) <= 200),
  baru int not null default 0 check (baru >= 0),
  ubah int not null default 0 check (ubah >= 0),
  sama int not null default 0 check (sama >= 0),
  oleh uuid default auth.uid(),
  oleh_nama text not null default '',
  dibuat_pada timestamptz not null default now()
);
create index impor_master_log_waktu_idx on public.impor_master_log (dibuat_pada desc);
select private.pasang_aturan_tabel('public.impor_master_log', false);
revoke insert, update on public.impor_master_log from authenticated;
create policy "log impor terbaca" on public.impor_master_log
  for select to authenticated using ((select private.has_permission('master.read')));

-- Angka dari sel Excel: "14", "2,5", "2.5". Null kalau kosong. Salah format = 'x' (dicek pemanggil).
create or replace function private.teks_angka_impor(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(trim(coalesce(p, '')), '') is null then null
    when trim(p) ~ '^[0-9]+([.,][0-9]+)?$' then replace(trim(p), ',', '.')
    else 'x'
  end;
$$;
revoke all on function private.teks_angka_impor(text) from public, anon, authenticated;

create or replace function public.impor_master(
  p_jenis text, p_baris jsonb, p_simpan boolean default false, p_kunci uuid default null, p_nama_file text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  i int := 0;
  no_baris int;
  hasil jsonb := '[]'::jsonb;
  st text;
  pesan text;
  kunci_baris text;
  dipakai text[] := '{}';
  n_baru int := 0;
  n_ubah int := 0;
  n_sama int := 0;
  n_salah int := 0;
  v_nama text; v_kontak text; v_catatan text; v_satuan text; v_kel text; v_kat text; v_lokasi text; v_ket text;
  t_angka text; v_tempo int; v_min numeric;
  s public.suppliers;
  b public.buyers;
  pr public.products;
  it public.supply_items;
  lg public.impor_master_log;
begin
  if p_jenis is null or p_jenis not in ('suppliers', 'buyers', 'products', 'supply_items') then
    raise exception 'Jenis datanya nggak dikenal.' using errcode = 'KT001';
  end if;
  perform private.wajib_izin(case when p_jenis = 'supply_items' then 'stok.write' else 'master.write' end);
  if p_baris is null or jsonb_typeof(p_baris) <> 'array' or jsonb_array_length(p_baris) = 0 then
    raise exception 'File-nya kosong, belum ada baris data di bawah judul kolom.' using errcode = 'KT001';
  end if;
  if jsonb_array_length(p_baris) > 2000 then
    raise exception 'Maksimal 2.000 baris sekali upload. Pecah jadi beberapa file ya.' using errcode = 'KT001';
  end if;
  if p_simpan then
    if p_kunci is null then
      raise exception 'Muat ulang halaman, terus coba lagi.' using errcode = 'KT001';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('impor_master:' || p_kunci::text, 0));
    select * into lg from public.impor_master_log where kunci = p_kunci;
    if found then
      return jsonb_build_object('sudah', true, 'baru', lg.baru, 'ubah', lg.ubah, 'sama', lg.sama, 'salah', 0, 'baris', '[]'::jsonb);
    end if;
  end if;

  for r in select value from jsonb_array_elements(p_baris) loop
    i := i + 1;
    no_baris := case when (r ->> '_no') ~ '^[0-9]{1,6}$' then (r ->> '_no')::int else i + 1 end;
    st := null;
    pesan := '';
    if jsonb_typeof(r) <> 'object' then
      st := 'salah'; pesan := 'Barisnya nggak kebaca.';
    end if;
    v_nama := nullif(trim(coalesce(r ->> 'nama', '')), '');

    if st is null and v_nama is null then
      st := 'salah'; pesan := 'Nama wajib diisi.';
    elsif st is null and length(v_nama) > 200 then
      st := 'salah'; pesan := 'Nama kepanjangan, maksimal 200 huruf.';
    end if;

    -- ------------------------------------------------------------ pemasok
    if st is null and p_jenis = 'suppliers' then
      v_kontak := nullif(trim(coalesce(r ->> 'kontak', '')), '');
      v_catatan := nullif(trim(coalesce(r ->> 'catatan', '')), '');
      kunci_baris := lower(v_nama);
      if length(coalesce(v_kontak, '')) > 200 or length(coalesce(v_catatan, '')) > 200 then
        st := 'salah'; pesan := 'Kontak atau catatan kepanjangan, maksimal 200 huruf.';
      else
        select * into s from public.suppliers where lower(nama) = kunci_baris;
        if not found then
          st := 'baru';
          if p_simpan then
            insert into public.suppliers (nama, kontak, catatan) values (v_nama, coalesce(v_kontak, ''), coalesce(v_catatan, ''));
          end if;
        elsif s.aktif and coalesce(v_kontak, s.kontak) = s.kontak and coalesce(v_catatan, s.catatan) = s.catatan then
          st := 'sama';
        else
          st := 'ubah';
          pesan := case when not s.aktif then 'Diaktifin lagi.' else '' end;
          if p_simpan then
            update public.suppliers set kontak = coalesce(v_kontak, kontak), catatan = coalesce(v_catatan, catatan), aktif = true where id = s.id;
          end if;
        end if;
      end if;

    -- ------------------------------------------------------------ pembeli
    elsif st is null and p_jenis = 'buyers' then
      v_kontak := nullif(trim(coalesce(r ->> 'kontak', '')), '');
      t_angka := private.teks_angka_impor(r ->> 'tempo_hari');
      kunci_baris := lower(v_nama);
      v_tempo := null;
      if t_angka = 'x' or (t_angka is not null and t_angka !~ '^[0-9]+$') then
        st := 'salah'; pesan := 'Tempo bayar harus angka bulat hari, misalnya 14.';
      elsif t_angka is not null and t_angka::numeric > 365 then
        st := 'salah'; pesan := 'Tempo bayar maksimal 365 hari.';
      elsif length(coalesce(v_kontak, '')) > 200 then
        st := 'salah'; pesan := 'Kontak kepanjangan, maksimal 200 huruf.';
      else
        v_tempo := t_angka::int;
        select * into b from public.buyers where lower(nama) = kunci_baris;
        if not found then
          st := 'baru';
          if p_simpan then
            insert into public.buyers (nama, kontak, tempo_hari) values (v_nama, coalesce(v_kontak, ''), coalesce(v_tempo, 14));
          end if;
        elsif b.aktif and coalesce(v_kontak, b.kontak) = b.kontak and coalesce(v_tempo, b.tempo_hari) = b.tempo_hari then
          st := 'sama';
        else
          st := 'ubah';
          pesan := case when not b.aktif then 'Diaktifin lagi.' else '' end;
          if p_simpan then
            update public.buyers set kontak = coalesce(v_kontak, kontak), tempo_hari = coalesce(v_tempo, tempo_hari), aktif = true where id = b.id;
          end if;
        end if;
      end if;

    -- ------------------------------------------------------------ produk
    elsif st is null and p_jenis = 'products' then
      v_satuan := nullif(trim(coalesce(r ->> 'satuan', '')), '');
      v_kel := nullif(lower(trim(coalesce(r ->> 'kelompok', ''))), '');
      kunci_baris := lower(v_nama);
      v_kel := case
        when v_kel is null then null
        when v_kel in ('utuh', 'tuna utuh') then 'utuh'
        when v_kel = 'loin' then 'loin'
        when v_kel in ('hasil samping', 'hasil_samping', 'samping') then 'hasil_samping'
        when v_kel = 'lainnya' then 'lainnya'
        else 'x'
      end;
      if v_kel = 'x' then
        st := 'salah'; pesan := 'Kelompok harus salah satu: Tuna utuh, Loin, Hasil samping, atau Lainnya.';
      elsif length(coalesce(v_satuan, '')) > 20 then
        st := 'salah'; pesan := 'Satuan kepanjangan, maksimal 20 huruf.';
      else
        select * into pr from public.products where lower(nama) = kunci_baris;
        if not found then
          st := 'baru';
          if p_simpan then
            insert into public.products (nama, satuan, kelompok) values (v_nama, coalesce(v_satuan, 'kg'), coalesce(v_kel, 'loin'));
          end if;
        elsif pr.aktif and coalesce(v_satuan, pr.satuan) = pr.satuan and coalesce(v_kel, pr.kelompok) = pr.kelompok then
          st := 'sama';
        else
          st := 'ubah';
          pesan := case when not pr.aktif then 'Diaktifin lagi.' else '' end;
          if p_simpan then
            update public.products set satuan = coalesce(v_satuan, satuan), kelompok = coalesce(v_kel, kelompok), aktif = true where id = pr.id;
          end if;
        end if;
      end if;

    -- ------------------------------------------------------------ barang penunjang
    elsif st is null and p_jenis = 'supply_items' then
      v_kat := nullif(lower(trim(coalesce(r ->> 'kategori', ''))), '');
      v_kat := case
        when v_kat in ('kerja', 'penunjang kerja') then 'kerja'
        when v_kat in ('pekerja', 'penunjang pekerja') then 'pekerja'
        when v_kat is null then null
        else 'x'
      end;
      v_satuan := nullif(trim(coalesce(r ->> 'satuan', '')), '');
      v_lokasi := nullif(trim(coalesce(r ->> 'lokasi', '')), '');
      v_ket := nullif(trim(coalesce(r ->> 'keterangan', '')), '');
      t_angka := private.teks_angka_impor(r ->> 'stok_minimum');
      if v_kat is null or v_kat = 'x' then
        st := 'salah'; pesan := 'Kategori harus Penunjang kerja atau Penunjang pekerja.';
      elsif t_angka = 'x' or (t_angka is not null and round(t_angka::numeric, 3) <> t_angka::numeric) then
        st := 'salah'; pesan := 'Stok minimum harus angka, nggak boleh minus, maksimal 3 angka di belakang koma.';
      elsif length(coalesce(v_satuan, '')) > 20 or length(coalesce(v_lokasi, '')) > 200 or length(coalesce(v_ket, '')) > 200 then
        st := 'salah'; pesan := 'Satuan, lokasi, atau keterangan kepanjangan.';
      else
        v_min := t_angka::numeric;
        kunci_baris := v_kat || '|' || lower(v_nama);
        select * into it from public.supply_items where kategori = v_kat and lower(nama) = lower(v_nama);
        if not found then
          st := 'baru';
          if p_simpan then
            insert into public.supply_items (kategori, nama, satuan, stok_minimum, lokasi, keterangan)
            values (v_kat, v_nama, coalesce(v_satuan, 'pcs'), coalesce(v_min, 0), coalesce(v_lokasi, ''), coalesce(v_ket, ''));
          end if;
        elsif it.aktif and coalesce(v_satuan, it.satuan) = it.satuan and coalesce(v_min, it.stok_minimum) = it.stok_minimum
              and coalesce(v_lokasi, it.lokasi) = it.lokasi and coalesce(v_ket, it.keterangan) = it.keterangan then
          st := 'sama';
        else
          st := 'ubah';
          pesan := case when not it.aktif then 'Diaktifin lagi.' else '' end;
          if p_simpan then
            update public.supply_items
            set satuan = coalesce(v_satuan, satuan), stok_minimum = coalesce(v_min, stok_minimum),
                lokasi = coalesce(v_lokasi, lokasi), keterangan = coalesce(v_ket, keterangan), aktif = true
            where id = it.id;
          end if;
        end if;
      end if;
    end if;

    -- Nama dobel di file yg sama: baris kedua dan seterusnya salah.
    if st is not null and st <> 'salah' and kunci_baris = any(dipakai) then
      st := 'salah'; pesan := 'Nama ini dobel di file, udah ada di baris sebelumnya.';
    elsif st is not null and st <> 'salah' then
      dipakai := dipakai || kunci_baris;
    end if;

    case st
      when 'baru' then n_baru := n_baru + 1;
      when 'ubah' then n_ubah := n_ubah + 1;
      when 'sama' then n_sama := n_sama + 1;
      else n_salah := n_salah + 1;
    end case;
    hasil := hasil || jsonb_build_object('no', no_baris, 'nama', coalesce(v_nama, ''), 'status', st, 'pesan', pesan);
  end loop;

  if p_simpan then
    if n_salah > 0 then
      -- Semua atau nggak sama sekali: perubahan di atas ikut batal.
      raise exception 'Masih ada % baris yg salah. Benerin dulu di file, terus upload lagi. Belum ada yg disimpan.', n_salah using errcode = 'KT001';
    end if;
    insert into public.impor_master_log (kunci, jenis, nama_file, baru, ubah, sama, oleh_nama)
    values (p_kunci, p_jenis, left(coalesce(p_nama_file, ''), 200), n_baru, n_ubah, n_sama,
            coalesce((select nama from public.profiles where user_id = auth.uid()), ''));
  end if;

  return jsonb_build_object('sudah', false, 'baru', n_baru, 'ubah', n_ubah, 'sama', n_sama, 'salah', n_salah, 'baris', hasil);
exception
  -- Dua orang upload nama yg sama barengan: yg kedua ditolak rapi, nggak ada yg setengah masuk.
  when unique_violation then
    raise exception 'Ada data dengan nama yg sama barusan dimasukin orang lain. Pilih filenya lagi biar dicek ulang.' using errcode = 'KT001';
end;
$$;

do $$
begin
  execute 'revoke all on function public.impor_master(text, jsonb, boolean, uuid, text) from public, anon';
  execute 'grant execute on function public.impor_master(text, jsonb, boolean, uuid, text) to authenticated';
end;
$$;

-- Catat migrasinya biar Supabase tahu udah jalan.
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261122000600', 'impor_master')
on conflict do nothing;

commit;

-- Cek abis jalan (cuma baca): harus keluar 1 baris migrasi.
select version, name from supabase_migrations.schema_migrations where version in ('20261122000600') order by version;
notify pgrst, 'reload schema';

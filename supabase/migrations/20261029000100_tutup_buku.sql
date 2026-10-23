-- Fase 5c · Tutup buku per periode (bulan). Setelah ditutup, uang masuk/keluar bertanggal di bulan itu tidak bisa ditambah
-- atau diubah (kunci di database, bukan hanya di layar). Hanya Owner yang menutup dan membuka kembali (dengan alasan).
-- Aturan: tutup berurutan dari bulan tertua; bulan berjalan belum bisa ditutup; biaya yang masih menunggu keputusan
-- menahan penutupan; transaksi tanpa bukti harus diakui secara sadar.

insert into public.role_permissions (role_id, aksi) values
  ('finance', 'periode.read'),
  ('super_admin', 'periode.read');
-- periode.tutup tidak diberikan ke peran mana pun: hanya pemegang semua izin (Owner).

create table public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  bulan date not null unique check (extract(day from bulan) = 1),
  status text not null default 'ditutup' check (status in ('ditutup', 'terbuka')),
  ditutup_oleh uuid,
  ditutup_pada timestamptz,
  catatan text not null default '',
  -- Angka saat ditutup: masuk, keluar, saldo awal/akhir, jumlah transaksi, transaksi tanpa bukti.
  ringkasan jsonb not null default '{}'::jsonb,
  dibuka_kali int not null default 0,
  alasan_buka text not null default '',
  dibuat_pada timestamptz not null default now(),
  dibuat_oleh uuid default auth.uid(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh uuid
);

select private.pasang_aturan_tabel('public.accounting_periods');
revoke insert, update on public.accounting_periods from authenticated;
create policy "periode terbaca" on public.accounting_periods
  for select to authenticated using ((select private.has_permission('periode.read') or private.has_permission('keuangan.read')));

-- ------------------------------------------------------------ kunci
create or replace function private.periode_ditutup(p_tanggal date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.accounting_periods p
    where p.status = 'ditutup' and p.bulan = date_trunc('month', p_tanggal)::date
  );
$$;
revoke all on function private.periode_ditutup(date) from public, anon, authenticated;

create or replace function private.tolak_periode_ditutup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.periode_ditutup(new.tanggal) then
    raise exception 'Buku bulan % sudah ditutup. Transaksi bertanggal di bulan itu tidak bisa ditambah atau diubah; minta Owner membuka kembali bila perlu.',
      to_char(new.tanggal, 'YYYY-MM') using errcode = 'KT001';
  end if;
  if tg_op = 'UPDATE' and old.tanggal is distinct from new.tanggal and private.periode_ditutup(old.tanggal) then
    raise exception 'Buku bulan % sudah ditutup. Transaksi di bulan itu tidak bisa dipindahkan.', to_char(old.tanggal, 'YYYY-MM') using errcode = 'KT001';
  end if;
  return new;
end;
$$;
revoke all on function private.tolak_periode_ditutup() from public, anon, authenticated;

create trigger payments_kunci_periode before insert on public.payments for each row execute function private.tolak_periode_ditutup();
create trigger customer_payments_kunci_periode before insert on public.customer_payments for each row execute function private.tolak_periode_ditutup();
create trigger expenses_kunci_periode before insert or update on public.expenses for each row execute function private.tolak_periode_ditutup();
create trigger ledger_kunci_periode before insert on public.ledger for each row execute function private.tolak_periode_ditutup();

-- ----------------------------------------------------------- fungsi
create or replace function public.tutup_periode(p_bulan date, p_catatan text default '', p_terima_dokumen_kurang boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b date := date_trunc('month', p_bulan)::date;
  ini date := date_trunc('month', (now() at time zone 'Asia/Jakarta')::date)::date;
  tertua date;
  menunggu int;
  masuk numeric(16,2);
  keluar numeric(16,2);
  n int;
  awal numeric(16,2);
  kurang int;
  ring jsonb;
begin
  perform private.wajib_izin('periode.tutup');
  if b >= ini then
    raise exception 'Bulan berjalan belum bisa ditutup. Tutup setelah bulannya berakhir.' using errcode = 'KT001';
  end if;
  if exists (select 1 from public.accounting_periods where bulan = b and status = 'ditutup') then
    raise exception 'Buku bulan % sudah ditutup.', to_char(b, 'YYYY-MM') using errcode = 'KT001';
  end if;
  perform pg_advisory_xact_lock(hashtext('tutup_buku'));

  select min(date_trunc('month', l.tanggal))::date into tertua from public.ledger l
  where date_trunc('month', l.tanggal) < b
    and not exists (select 1 from public.accounting_periods p where p.bulan = date_trunc('month', l.tanggal)::date and p.status = 'ditutup');
  if tertua is not null then
    raise exception 'Tutup bulan sebelumnya dulu: %.', to_char(tertua, 'YYYY-MM') using errcode = 'KT001';
  end if;

  select count(*) into menunggu from public.expenses e where e.status = 'diajukan' and date_trunc('month', e.tanggal)::date = b;
  if menunggu > 0 then
    raise exception '% biaya bulan % masih menunggu keputusan Owner. Putuskan dulu sebelum menutup buku.', menunggu, to_char(b, 'YYYY-MM') using errcode = 'KT001';
  end if;

  select coalesce(sum(jumlah) filter (where arah = 'masuk'), 0), coalesce(sum(jumlah) filter (where arah = 'keluar'), 0), count(*)
  into masuk, keluar, n from public.ledger where date_trunc('month', tanggal)::date = b;
  select coalesce(sum(case when arah = 'masuk' then jumlah else -jumlah end), 0) into awal from public.ledger where tanggal < b;

  -- Transaksi bulan itu yang belum punya nota atau bukti.
  select (
    (select count(*) from public.expenses e join public.expense_categories k on k.id = e.category_id
      where e.status = 'disetujui' and k.nota_wajib and date_trunc('month', e.tanggal)::date = b
        and not exists (select 1 from public.documents d where d.ref_tabel = 'expenses' and d.ref_id = e.id and d.jenis = 'nota'))
    + (select count(*) from public.payments p where date_trunc('month', p.tanggal)::date = b
        and not exists (select 1 from public.documents d where d.ref_tabel = 'payments' and d.ref_id = p.id))
    + (select count(*) from public.customer_payments c where date_trunc('month', c.tanggal)::date = b
        and not exists (select 1 from public.documents d where d.ref_tabel = 'customer_payments' and d.ref_id = c.id))
  )::int into kurang;
  if kurang > 0 and not coalesce(p_terima_dokumen_kurang, false) then
    raise exception '% transaksi bulan % belum punya nota atau bukti. Lengkapi, atau akui dengan sadar saat menutup.', kurang, to_char(b, 'YYYY-MM') using errcode = 'KT001';
  end if;

  ring := jsonb_build_object('masuk', masuk, 'keluar', keluar, 'jumlah_transaksi', n, 'saldo_awal', awal, 'saldo_akhir', awal + masuk - keluar, 'tanpa_bukti', kurang);
  insert into public.accounting_periods (bulan, status, ditutup_oleh, ditutup_pada, catatan, ringkasan)
  values (b, 'ditutup', (select auth.uid()), now(), coalesce(p_catatan, ''), ring)
  on conflict (bulan) do update
    set status = 'ditutup', ditutup_oleh = excluded.ditutup_oleh, ditutup_pada = excluded.ditutup_pada, catatan = excluded.catatan, ringkasan = excluded.ringkasan;
  return ring;
end;
$$;

create or replace function public.buka_kembali_periode(p_bulan date, p_alasan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b date := date_trunc('month', p_bulan)::date;
  terbaru date;
begin
  perform private.wajib_izin('periode.tutup');
  if length(trim(coalesce(p_alasan, ''))) = 0 then
    raise exception 'Tulis alasan membuka kembali buku.' using errcode = 'KT001';
  end if;
  if not exists (select 1 from public.accounting_periods where bulan = b and status = 'ditutup') then
    raise exception 'Buku bulan % tidak sedang ditutup.', to_char(b, 'YYYY-MM') using errcode = 'KT001';
  end if;
  select max(bulan) into terbaru from public.accounting_periods where status = 'ditutup' and bulan > b;
  if terbaru is not null then
    raise exception 'Buka kembali bulan yang lebih baru dulu: %.', to_char(terbaru, 'YYYY-MM') using errcode = 'KT001';
  end if;
  update public.accounting_periods
  set status = 'terbuka', dibuka_kali = dibuka_kali + 1, alasan_buka = trim(p_alasan)
  where bulan = b;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['public.tutup_periode(date, text, boolean)', 'public.buka_kembali_periode(date, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- ----------------------------------------------------------- tampilan
-- Rekap kas per bulan dengan saldo berjalan dan status penutupan. Angka dihitung langsung dari buku kas.
create view public.v_buku_bulanan with (security_invoker = true) as
with deret as (
  select generate_series(
    date_trunc('month', (select min(tanggal) from public.ledger)),
    date_trunc('month', (now() at time zone 'Asia/Jakarta')::date),
    interval '1 month'
  )::date as bulan
), agg as (
  select date_trunc('month', tanggal)::date as bulan,
         sum(jumlah) filter (where arah = 'masuk') as masuk,
         sum(jumlah) filter (where arah = 'keluar') as keluar,
         count(*) as n
  from public.ledger group by 1
), gabung as (
  select d.bulan, coalesce(a.masuk, 0) as masuk, coalesce(a.keluar, 0) as keluar, coalesce(a.n, 0) as n
  from deret d left join agg a on a.bulan = d.bulan
)
select
  g.bulan,
  g.masuk::numeric(16,2) as masuk,
  g.keluar::numeric(16,2) as keluar,
  g.n::int as jumlah_transaksi,
  coalesce(sum(g.masuk - g.keluar) over (order by g.bulan rows between unbounded preceding and 1 preceding), 0)::numeric(16,2) as saldo_awal,
  sum(g.masuk - g.keluar) over (order by g.bulan)::numeric(16,2) as saldo_akhir,
  coalesce(p.status, 'terbuka') as status,
  p.ditutup_pada, p.ditutup_oleh, p.catatan, p.ringkasan, coalesce(p.dibuka_kali, 0) as dibuka_kali, coalesce(p.alasan_buka, '') as alasan_buka,
  (g.bulan = date_trunc('month', (now() at time zone 'Asia/Jakarta')::date)::date) as bulan_berjalan
from gabung g
left join public.accounting_periods p on p.bulan = g.bulan;

revoke all on public.v_buku_bulanan from anon;

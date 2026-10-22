-- Tes awal Fase 0: memastikan pgTAP jalan di CI sebelum tabel pertama dibuat.
-- Fase 1 menambah satu berkas per tabel ber-RLS (lihat dokumen Fase Pembangunan).
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select has_schema('public', 'skema public ada');
select is(current_setting('server_version_num')::int >= 150000, true, 'Postgres versi 15 atau lebih baru');

select * from finish();
rollback;

-- 23 Nov 2026: foto diupload sebagai WebP. Bucket absensi nerima WebP (dan JPEG), bucket dokumen nerima WebP. Jalankan: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);
select ok((select 'image/webp' = any(allowed_mime_types) from storage.buckets where id = 'absensi'), 'bucket absensi nerima WebP');
select ok((select 'image/jpeg' = any(allowed_mime_types) from storage.buckets where id = 'absensi'), 'bucket absensi tetap nerima JPEG (browser lama)');
select ok((select 'image/webp' = any(allowed_mime_types) from storage.buckets where id = 'dokumen'), 'bucket dokumen nerima WebP');
select * from finish();
rollback;

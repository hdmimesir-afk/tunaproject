-- 23 Nov 2026: foto yg diupload otomatis dikompres jadi WebP di browser (permintaan user).
-- Bucket dokumen udah nerima WebP dari awal. Bucket absensi sebelumnya cuma JPEG, sekarang WebP juga
-- (JPEG tetap boleh buat browser yg belum bisa bikin WebP, dan buat foto lama).
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/webp'] where id = 'absensi';

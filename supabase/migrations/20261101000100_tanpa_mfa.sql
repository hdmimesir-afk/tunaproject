-- MFA dihapus atas keputusan Dar Dev (27 Oktober 2026): Owner dan Finance cukup masuk dengan kata sandi.
-- Kolom roles.wajib_mfa dan pemeriksaan aal2 di private.has_permission dibiarkan di database, tetapi tidak ada peran yang
-- mewajibkannya lagi dan aplikasi tidak lagi memiliki langkah kode kedua. Kata sandi yang kuat menjadi satu-satunya penjaga akun.
update public.roles set wajib_mfa = false where wajib_mfa;

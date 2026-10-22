<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Aturan proyek KATALIS ERP

- Acuan: `docs/PRD.md` dan dokumen Fase Pembangunan. Kerjakan sesuai fase yang sedang berjalan.
- Satu aplikasi, empat bagian: sistem ERP di `/` (`app/(app)`, `app/(auth)`), penawaran di `/penawaran`, halaman owner di `/rancangan` dan `/PRD`, demo di `/demo`. Halaman presentasi dibekukan: jangan dipakai sebagai dasar kode ERP, dan komponen ERP memakai `components/ui`, bukan `components/demo`.
- Cek dokumentasi library lewat MCP Context7 sebelum menulis kode yang memakainya; catat yang dipakai di deskripsi pull request.
- Cache Components aktif: pembacaan sesi atau cookie hanya di dalam `<Suspense>`, tidak di level atas layout.
- Identitas di server dicek dengan `supabase.auth.getClaims()`. Objek user dari `getSession()` tidak dipakai untuk izin.
- Setiap Server Action: validasi Zod, cek sesi, cek izin, cek kepemilikan data, lalu `updateTag()`. `proxy.ts` bukan pengaman.
- Berat `numeric(12,3)` dan uang `numeric(16,2)` di database; di TypeScript hitung berat dalam gram bulat (`lib/logic/neraca.ts`). Tidak ada `float` untuk berat atau uang.
- Tidak ada `DELETE` dari aplikasi. Pembatalan dengan alasan atau baris pembalik; semua perubahan tercatat.
- Setiap tabel baru: RLS aktif, kebijakan memakai `(select private.has_permission(...))`, dan berkas tes pgTAP di `supabase/tests`.
- Kunci `sb_secret_` hanya di server, tidak pernah berawalan `NEXT_PUBLIC_`.
- Tulisan di aplikasi berbahasa Indonesia sederhana.

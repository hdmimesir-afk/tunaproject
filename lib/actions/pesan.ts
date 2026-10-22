/* Pesan galat database yang aman ditampilkan. Pesan dari trigger kita sudah berbahasa Indonesia;
   galat lain diganti kalimat umum supaya detail teknis tidak bocor ke layar. */
export function pesanDb(e: { code?: string; message?: string }) {
  // Galat aturan bisnis dari fungsi database (SQLSTATE KT...) sudah berbahasa Indonesia dan aman ditampilkan.
  if (e.code?.startsWith("KT")) return e.message ?? "Aturan menolak perubahan ini.";
  if (e.code === "23505") return "Data dengan nama atau kode yang sama sudah ada.";
  if (e.code === "42501") {
    const m = e.message ?? "";
    return m.includes("row-level security") || m.startsWith("permission denied") ? "Anda tidak punya izin untuk perubahan ini." : m;
  }
  if (e.code === "23514") return "Isian di luar batas yang diizinkan.";
  return "Perubahan gagal disimpan. Coba lagi.";
}

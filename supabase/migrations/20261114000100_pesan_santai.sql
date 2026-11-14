-- Pesan galat dari database dibikin santai dan pakai istilah "proyek" (bukan "siklus"), tanpa "Anda" atau "kamu".
-- Fungsinya nggak ditulis ulang satu-satu: definisi yang berlaku sekarang diambil dari katalog, kalimatnya diganti,
-- lalu dibuat ulang. Jadi kalau ada fungsi yang pernah diubah di migrasi lain, versi terbarunya yang dipakai.
-- Yang diganti cuma kalimat pesan; nama izin dan kolom (siklus.tutup, cycle_id, ...) nggak disentuh.

do $$
declare
  -- Urutan penting: kalimat panjang dulu, karena "Siklus % sudah ditutup." juga ada di dalam kalimat yang lebih panjang.
  ganti text[][] := array[
    ['''Siklus % sudah ditutup. Pilih siklus lain, atau minta Owner membukanya kembali.''', '''Proyek % udah ditutup. Pilih proyek lain, atau minta Owner buka lagi.'''],
    ['''Siklus % sudah ditutup.''', '''Proyek % udah ditutup.'''],
    ['''Siklus tidak ditemukan.''', '''Proyeknya nggak ketemu.'''],
    ['''Siklus biaya berbeda dengan siklus PO atau produksi yang dipilih.''', '''Proyek biayanya beda sama proyek PO atau produksi yang dipilih.'''],
    ['''% PO siklus % belum diputuskan.''', '''Masih ada % PO di proyek % yang belum diputuskan.'''],
    ['''% PO siklus % belum lunas dibayar ke pemasok.''', '''Masih ada % PO di proyek % yang belum lunas ke pemasok.'''],
    ['''% produksi siklus % belum selesai diperiksa dan disetujui.''', '''Masih ada % produksi di proyek % yang belum beres diperiksa dan disetujui.'''],
    ['''% pesanan siklus % belum dikirim atau dibatalkan.''', '''Masih ada % pesanan di proyek % yang belum dikirim atau dibatalkan.'''],
    ['''% tagihan siklus % belum lunas.''', '''Masih ada % tagihan di proyek % yang belum lunas.'''],
    ['''% biaya siklus % masih draf atau menunggu keputusan.''', '''Masih ada % biaya di proyek % yang masih draf atau nunggu keputusan.'''],
    ['''Tulis alasan membuka kembali siklus.''', '''Tulis dulu alasan buka lagi proyeknya.'''],
    ['''Siklus tidak sedang ditutup.''', '''Proyeknya lagi nggak ditutup.'''],
    ['''Peran Anda tidak punya izin untuk %.'', p_aksi', '''Peran ini nggak punya izin buat langkah ini. Minta Super Admin kalau memang perlu.'''],
    ['''Peran Anda tidak boleh meminta revisi.''', '''Peran ini nggak boleh minta revisi.'''],
    ['''Peran Anda tidak boleh meminta perbaikan.''', '''Peran ini nggak boleh minta perbaikan.'''],
    ['''Peran Anda tidak boleh mencatat berat diterima.''', '''Peran ini nggak boleh nyatet berat diterima.'''],
    ['''Anda sudah absen %s hari ini pukul %s.''', '''Udah absen %s hari ini jam %s.'''],
    ['''Anda belum absen masuk hari ini.''', '''Belum absen masuk hari ini.'''],
    ['''Anda %s m dari %s, di luar radius %s m.''', '''Posisinya %s m dari %s, di luar radius %s m.'''],
    ['''Tugas untuk peran Anda sendiri hanya bisa diatur Owner.''', '''Tugas buat peran sendiri cuma bisa diatur Owner.'''],
    ['''Persetujuan % diajukan oleh Anda sendiri. Minta pemegang tugas lain yang menyetujui.''', '''Persetujuan % diajukan sendiri, jadi harus disetujui pemegang tugas lain.''']
  ];
  f record;
  def text;
  baru text;
  i int;
  pola text := '';
begin
  for i in 1 .. array_length(ganti, 1) loop
    pola := pola || case when i > 1 then '|' else '' end || regexp_replace(ganti[i][1], '([.%()|*+?\[\]{}^$\\])', '\\\1', 'g');
  end loop;

  for f in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosrc ~ pola
  loop
    def := pg_get_functiondef(f.oid);
    baru := def;
    for i in 1 .. array_length(ganti, 1) loop
      baru := replace(baru, ganti[i][1], ganti[i][2]);
    end loop;
    if baru <> def then
      execute baru;
    end if;
  end loop;

  -- Pastikan nggak ada kalimat lama yang ketinggalan.
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosrc ~ pola
  ) then
    raise exception 'Masih ada pesan lama yang belum terganti.';
  end if;
end;
$$;

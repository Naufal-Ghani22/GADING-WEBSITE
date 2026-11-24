# Karang Taruna GADING | RW 09

GADING = **Gerakan Muda Mudi Grabagan**, Perumtas 3, Grabagan, Tulangan, Sidoarjo. Slogan: **GADING GACOR DAR DER DOR**.

Situs arsip kegiatan + berita. Publik melihat, admin menambah/mengubah/menghapus (tab Kegiatan | Berita).

## Struktur

```
index.html          Beranda (hero logo, tentang, daftar kegiatan per bulan)
kegiatan.html       Detail kegiatan (?id=...), galeri + lightbox
berita.html         Daftar berita, atau detail berita (?id=...)
admin/              Panel admin (login, tambah/edit/hapus, unggah foto)
js/config.js        <- SEMUA TEKS & PENGATURAN ada di sini
js/store.js         Lapisan data (Supabase atau demo lokal), koleksi kegiatan + berita
js/map.js           Peta Lokasi (Leaflet + OpenStreetMap, dibuat monokrom lewat CSS)
js/area.js          Batas area Perumtas 3 dari OpenStreetMap
supabase/schema.sql Skema database + keamanan (jalankan sekali)
assets/             Logo (dipotong bulat dari GADING LOGO.png)
```

## Menjalankan di komputer

Butuh server lokal (bukan klik ganda file):

```
python -m http.server 5520
```

Buka http://127.0.0.1:5520

## Mode demo vs online

- **Demo** (default, `supabaseUrl` kosong): data tersimpan di browser itu saja. Login admin: `admin@gading.id` / `gading09`. Ada 6 kegiatan contoh yang bisa dihapus.
- **Online**: data tersimpan di Supabase, semua pengunjung melihat data yang sama.

### Menyalakan mode online (gratis)

1. Buat project di https://supabase.com
2. SQL Editor -> tempel isi `supabase/schema.sql` -> Run.
3. Authentication -> Users -> Add user (email + kata sandi admin, centang Auto Confirm).
4. Daftarkan user itu sebagai admin (SQL Editor):
   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'email-admin@contoh.com';
   ```
5. Authentication -> Sign In / Providers -> matikan "Allow new users to sign up" (opsional, keamanan tetap dijaga tabel admin_users).
6. Project Settings -> API: salin **Project URL** dan **anon public key** ke `js/config.js`.

## Online-kan situsnya

Situs ini statis, jadi bisa di-hosting gratis di Vercel, Netlify, atau GitHub Pages. Unggah seluruh folder ini apa adanya, tidak perlu build.

## Catatan

- Foto dikompres otomatis di browser (maks 1600 px, WebP) sebelum diunggah. Maksimal 20 foto per kegiatan, foto pertama jadi sampul.
- Kegiatan tanpa foto otomatis mendapat sampul tipografis (tanggal besar).
- Foto di daftar tampil hitam putih, berwarna saat disentuh/hover.
- Berita: centang "Jadikan sorotan" agar tampil paling besar di beranda. Bagian Berita otomatis tersembunyi bila belum ada berita.
- Peta tidak bisa digeser satu jari di HP (agar scroll halaman tidak terganggu); pakai tombol +/- atau cubit dua jari.

/*
  Pengaturan situs Karang Taruna GADING (Gerakan Muda Mudi Grabagan) RW 09.
  Ubah teks di sini, tidak perlu menyentuh file lain.

  Supabase:
  - Kosongkan supabaseUrl & supabaseAnonKey  -> MODE DEMO (data tersimpan di browser ini saja).
  - Isi keduanya                              -> MODE ONLINE (data tersimpan di Supabase, semua pengunjung melihat data yang sama).
*/
window.SITE = {
  nama: 'Karang Taruna Gading',
  kepanjangan: 'Gerakan Muda Mudi Grabagan',
  wilayah: 'RW 09',
  slogan: 'GADING GACOR DAR DER DOR',
  periode: '2025 – 2028',
  periodeMulai: '2025-01-01',

  tagline: 'Catatan kegiatan muda mudi Grabagan RW 09, dari awal periode sampai hari ini.',
  tentang: 'Muda mudi Grabagan yang bergerak bareng untuk lingkungan.',
  tentangDetail: 'Semua kegiatan yang sudah kami kerjakan sejak awal periode tercatat di sini, lengkap dengan cerita dan fotonya.',

  alamat: 'Perumtas 3, Grabagan, Tulangan, Sidoarjo',
  wilayahLengkap: 'Desa Grabagan, Kec. Tulangan, Kab. Sidoarjo, Jawa Timur',
  instagram: '', // contoh: 'https://instagram.com/gading.rw09'

  /* Peta: titik tengah Perumtas 3 (batas area ada di js/area.js) */
  peta: { lat: -7.4471269, lng: 112.6290376, zoom: 16 },

  /* Kunci publik (anon), aman ditaruh di sini karena data dijaga RLS di supabase/schema.sql */
  supabaseUrl: 'https://otlgmtomcvpjkjlvpgeo.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bGdtdG9tY3ZwamtqbHZwZ2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU1MTc0ODYsImV4cCI6MjExMTA5MzQ4Nn0.1LPpbusEr_eI6Js_7FCRKZezM7D_usvXsPMbUAnBPH0',
  bucket: 'kegiatan',
};

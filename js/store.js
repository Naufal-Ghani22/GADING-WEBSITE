/*
  Lapisan data. Satu antarmuka, dua mesin:
  - Supabase (online)  jika SITE.supabaseUrl & SITE.supabaseAnonKey terisi
  - IndexedDB (demo)   jika kosong

  Dua koleksi, bentuknya mirip:
  Store.kegiatan  { id, judul, tanggal: 'YYYY-MM-DD', lokasi, deskripsi, foto: [url], created_at, updated_at }
  Store.berita    { id, judul, tanggal, deskripsi, foto: [url], sorot: bool, created_at, updated_at }
  foto[0] dipakai sebagai sampul.
*/
(function () {
  const S = window.SITE || {};
  const ONLINE = Boolean(S.supabaseUrl && S.supabaseAnonKey);
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

  /* ---------- util ---------- */
  const U = {
    uid() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    },
    parseDate(s) {
      const [y, m, d] = String(s || '').split('-').map(Number);
      return new Date(y || 1970, (m || 1) - 1, d || 1);
    },
    fmtDate(s, opt) {
      return new Intl.DateTimeFormat('id-ID', opt || { day: 'numeric', month: 'long', year: 'numeric' }).format(U.parseDate(s));
    },
    today() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    paragraphs(s) {
      return String(s || '')
        .trim()
        .split(/\n\s*\n/)
        .map((p) => '<p>' + U.esc(p).replace(/\n/g, '<br>') + '</p>')
        .join('');
    },
    excerpt(s, n) {
      const t = String(s || '').replace(/\s+/g, ' ').trim();
      return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
    },
    /* Sampul tipografis untuk entri tanpa foto (monokrom, deterministik). */
    cover(k, plain) {
      const d = U.parseDate(k.tanggal);
      const day = String(d.getDate()).padStart(2, '0');
      const mon = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d).replace('.', '').toUpperCase();
      let h = 0;
      for (const ch of String(k.id || k.judul)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const v = h % 3;
      const rings = [0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${v === 1 ? 300 : 400}" cy="${v === 2 ? 60 : 240}" r="${60 + i * 46}" fill="none" stroke="#fff" stroke-opacity="${0.16 - i * 0.02}" stroke-width="1.2"/>`).join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
<rect width="400" height="300" fill="#111"/>${rings}${plain ? '' : `
<text x="28" y="250" font-family="Archivo, Arial, sans-serif" font-weight="800" font-size="150" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.5" letter-spacing="-6">${day}</text>
<text x="34" y="62" font-family="Archivo, Arial, sans-serif" font-weight="700" font-size="20" fill="#fff" fill-opacity=".7" letter-spacing="4">${mon} ${d.getFullYear()}</text>`}
</svg>`;
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    },
    coverOf(k) {
      return (k.foto && k.foto[0]) || U.cover(k);
    },
    sortDesc(list) {
      return list.slice().sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : (b.created_at || '').localeCompare(a.created_at || '')));
    },
    /* Kompres foto di browser sebelum diunggah: sisi terpanjang 1600px, WebP. */
    async compress(file, max = 1600, q = 0.82) {
      let src, w, h;
      try {
        src = await createImageBitmap(file);
        w = src.width; h = src.height;
      } catch (e) {
        src = await new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = URL.createObjectURL(file);
        });
        w = src.naturalWidth; h = src.naturalHeight;
      }
      const s = Math.min(1, max / Math.max(w, h));
      const c = document.createElement('canvas');
      c.width = Math.round(w * s);
      c.height = Math.round(h * s);
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      const toBlob = (type) => new Promise((r) => c.toBlob(r, type, q));
      let blob = await toBlob('image/webp');
      if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg');
      return blob;
    },
    blobToDataURL(blob) {
      return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
    },
  };

  /* ---------- tiap koleksi: kolom tambahan ---------- */
  const TYPES = {
    kegiatan: {
      extra: (d) => ({ lokasi: (d.lokasi || '').trim() }),
      prefix: '',
    },
    berita: {
      extra: (d) => ({ sorot: Boolean(d.sorot) }),
      prefix: 'berita/',
    },
  };

  /* ---------- data contoh (hanya mode demo) ---------- */
  const SEED = {
    kegiatan: [
      { judul: 'Rapat Pembentukan Pengurus Baru', tanggal: '2025-01-19', lokasi: 'Balai RW 09', deskripsi: 'Awal periode dibuka dengan musyawarah muda mudi Grabagan RW 09 untuk memilih pengurus dan menyusun program kerja setahun ke depan.\n\nHadir perwakilan dari setiap RT, ketua RW, dan pembina. Hasilnya: struktur pengurus baru dan enam program utama.' },
      { judul: 'Kerja Bakti Bersih Selokan', tanggal: '2025-03-09', lokasi: 'Jalan utama Perumtas 3', deskripsi: 'Menjelang musim hujan, pemuda dan warga turun bersama membersihkan selokan yang tersumbat sampah dan lumpur.\n\nSekitar 40 karung sampah terangkut ke TPS.' },
      { judul: 'Santunan Anak Yatim Ramadan', tanggal: '2025-03-23', lokasi: 'Musala Perumtas 3', deskripsi: 'Buka puasa bersama sekaligus santunan untuk anak yatim dan dhuafa di lingkungan RW 09. Dana terkumpul dari iuran pemuda dan donasi warga.' },
      { judul: 'Lomba Agustusan RW 09', tanggal: '2025-08-17', lokasi: 'Lapangan RW 09', deskripsi: 'Panjat pinang, balap karung, tarik tambang, dan lomba makan kerupuk untuk anak sampai bapak-bapak.\n\nDitutup dengan malam tasyakuran dan pembagian hadiah.' },
      { judul: 'Donor Darah Bersama PMI', tanggal: '2025-11-02', lokasi: 'Balai RW 09', deskripsi: 'Bekerja sama dengan PMI Sidoarjo, kegiatan donor darah ini mengumpulkan 52 kantong darah dari warga dan pemuda sekitar.' },
      { judul: 'Turnamen Futsal Antar RT', tanggal: '2026-02-15', lokasi: 'GOR Tulangan', deskripsi: 'Delapan tim dari setiap RT bertanding selama dua hari. Juara pertama diraih tim RT 03 setelah adu penalti di final.' },
    ],
    berita: [
      { judul: 'Rapat Akhir Tahun Pengurus GADING', tanggal: '2026-11-22', sorot: true, deskripsi: 'Seluruh pengurus diundang hadir untuk evaluasi program 2026 dan menyusun agenda tahun depan.\n\nUsulan kegiatan dari warga bisa disampaikan lewat ketua RT masing-masing sebelum rapat.' },
      { judul: 'Jadwal Kerja Bakti Awal Musim Hujan', tanggal: '2026-11-15', sorot: false, deskripsi: 'Kerja bakti serentak membersihkan selokan dan saluran air di seluruh RT. Peralatan disediakan, warga cukup membawa sarung tangan.' },
      { judul: 'Pendaftaran Anggota Baru Dibuka', tanggal: '2026-11-03', sorot: false, deskripsi: 'Muda mudi Grabagan usia 13 sampai 30 tahun bisa bergabung. Hubungi pengurus di sekretariat atau saat kegiatan berikutnya.' },
    ],
  };

  /* ---------- mesin: IndexedDB (demo) ---------- */
  const DB_NAME = 'kartar-gading';
  let dbp;
  function db() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open(DB_NAME, 2);
        r.onupgradeneeded = () => {
          for (const name of Object.keys(TYPES)) {
            if (!r.result.objectStoreNames.contains(name)) r.result.createObjectStore(name, { keyPath: 'id' });
          }
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbp;
  }
  async function req(os, mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(os, mode);
      const r = fn(t.objectStore(os));
      t.oncomplete = () => res(r ? r.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('Transaksi dibatalkan'));
    });
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function makeLocal(type) {
    const flag = type === 'kegiatan' ? 'kartar-seeded' : 'kartar-seeded-' + type;
    let seeded;
    const seedOnce = () => {
      if (!seeded) {
        seeded = (async () => {
          if (lsGet(flag)) return;
          const n = await req(type, 'readonly', (s) => s.count());
          if (!n) {
            const now = new Date().toISOString();
            await req(type, 'readwrite', (s) => {
              SEED[type].forEach((k) => s.put({ ...k, id: U.uid(), foto: [], created_at: now, updated_at: now }));
            });
          }
          lsSet(flag, '1');
        })();
      }
      return seeded;
    };
    const api = {
      async list() {
        await seedOnce();
        return U.sortDesc(await req(type, 'readonly', (s) => s.getAll()));
      },
      async get(id) {
        await seedOnce();
        return (await req(type, 'readonly', (s) => s.get(id))) || null;
      },
      async save(data) {
        const now = new Date().toISOString();
        const old = data.id ? await api.get(data.id) : null;
        const foto = [];
        for (const f of data.fotos || []) {
          if (f.url) foto.push(f.url);
          else if (f.blob) foto.push(await U.blobToDataURL(f.blob));
        }
        const row = {
          id: data.id || U.uid(),
          judul: data.judul.trim(),
          tanggal: data.tanggal,
          deskripsi: (data.deskripsi || '').trim(),
          foto,
          ...TYPES[type].extra(data),
          created_at: old ? old.created_at : now,
          updated_at: now,
        };
        await req(type, 'readwrite', (s) => s.put(row));
        return row;
      },
      async remove(id) {
        await req(type, 'readwrite', (s) => s.delete(id));
      },
    };
    return api;
  }

  const localAuth = {
    async signIn(email, pass) {
      if (String(email).trim().toLowerCase() === 'admin@gading.id' && pass === 'gading09') {
        lsSet('kartar-admin', '1');
        return { email: 'admin@gading.id' };
      }
      throw new Error('Email atau kata sandi salah.');
    },
    async signOut() { lsDel('kartar-admin'); },
    async current() { return lsGet('kartar-admin') ? { email: 'admin@gading.id' } : null; },
  };

  /* ---------- mesin: Supabase (online) ---------- */
  let sbp;
  function sb() {
    if (!sbp) {
      sbp = new Promise((res, rej) => {
        if (window.supabase && window.supabase.createClient) return res(window.supabase.createClient(S.supabaseUrl, S.supabaseAnonKey));
        const el = document.createElement('script');
        el.src = SUPABASE_CDN;
        el.onload = () => res(window.supabase.createClient(S.supabaseUrl, S.supabaseAnonKey));
        el.onerror = () => rej(new Error('Gagal memuat Supabase. Periksa koneksi internet.'));
        document.head.appendChild(el);
      });
    }
    return sbp;
  }
  const BUCKET = S.bucket || 'kegiatan';
  function pathFromUrl(url) {
    const key = '/object/public/' + BUCKET + '/';
    const i = String(url).indexOf(key);
    return i < 0 ? null : decodeURIComponent(String(url).slice(i + key.length).split('?')[0]);
  }
  function must(r) {
    if (r.error) throw new Error(r.error.message || 'Terjadi kesalahan.');
    return r.data;
  }

  function makeOnline(type) {
    const api = {
      async list() {
        const c = await sb();
        return must(await c.from(type).select('*').order('tanggal', { ascending: false }).order('created_at', { ascending: false }));
      },
      async get(id) {
        const c = await sb();
        return must(await c.from(type).select('*').eq('id', id).maybeSingle());
      },
      async save(data) {
        const c = await sb();
        const id = data.id || U.uid();
        const old = data.id ? await api.get(data.id) : null;
        const foto = [];
        let n = 0;
        for (const f of data.fotos || []) {
          if (f.url) { foto.push(f.url); continue; }
          const ext = f.blob.type === 'image/webp' ? 'webp' : f.blob.type === 'image/png' ? 'png' : 'jpg';
          const path = `${TYPES[type].prefix}${id}/${Date.now()}-${n++}.${ext}`;
          must(await c.storage.from(BUCKET).upload(path, f.blob, { contentType: f.blob.type, upsert: false }));
          foto.push(c.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
        }
        const extra = TYPES[type].extra(data);
        if ('lokasi' in extra) extra.lokasi = extra.lokasi || null;
        const row = {
          judul: data.judul.trim(),
          tanggal: data.tanggal,
          deskripsi: (data.deskripsi || '').trim(),
          foto,
          ...extra,
        };
        const saved = old
          ? must(await c.from(type).update(row).eq('id', id).select().single())
          : must(await c.from(type).insert({ ...row, id }).select().single());
        if (old) {
          const gone = (old.foto || []).filter((u) => !foto.includes(u)).map(pathFromUrl).filter(Boolean);
          if (gone.length) await c.storage.from(BUCKET).remove(gone);
        }
        return saved;
      },
      async remove(id) {
        const c = await sb();
        const old = await api.get(id);
        must(await c.from(type).delete().eq('id', id));
        const paths = ((old && old.foto) || []).map(pathFromUrl).filter(Boolean);
        if (paths.length) await c.storage.from(BUCKET).remove(paths);
      },
    };
    return api;
  }

  const onlineAuth = {
    async signIn(email, pass) {
      const c = await sb();
      const r = await c.auth.signInWithPassword({ email: String(email).trim(), password: pass });
      if (r.error) throw new Error(r.error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : r.error.message);
      const ok = must(await c.rpc('is_admin'));
      if (!ok) {
        await c.auth.signOut();
        throw new Error('Akun ini belum terdaftar sebagai admin.');
      }
      return r.data.user;
    },
    async signOut() {
      const c = await sb();
      await c.auth.signOut();
    },
    async current() {
      const c = await sb();
      const { data } = await c.auth.getSession();
      if (!data.session) return null;
      const ok = await c.rpc('is_admin');
      return ok.data ? data.session.user : null;
    },
  };

  const make = ONLINE ? makeOnline : makeLocal;
  window.Store = {
    online: ONLINE,
    kegiatan: make('kegiatan'),
    berita: make('berita'),
    auth: ONLINE ? onlineAuth : localAuth,
  };
  window.U = U;
})();

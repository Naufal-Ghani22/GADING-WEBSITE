/* Panel admin: login, tab Kegiatan | Berita, tambah/edit/hapus, unggah foto. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);

  const CFG = {
    kegiatan: {
      label: 'Kegiatan',
      add: 'Tambah kegiatan',
      titleNew: 'Kegiatan baru',
      titleEdit: 'Edit kegiatan',
      judul: 'Judul kegiatan',
      judulPh: 'Contoh: Kerja bakti bersih selokan',
      desk: 'Deskripsi',
      deskPh: 'Ceritakan apa yang dikerjakan, siapa yang terlibat, dan hasilnya.',
      foto: 'Foto',
      fotoHelp: 'Foto pertama jadi sampul. Geser untuk mengubah urutan.',
      max: 20,
      page: 'kegiatan.html',
      empty: 'Tambahkan kegiatan pertama yang sudah dikerjakan.',
      unit: 'kegiatan',
    },
    berita: {
      label: 'Berita',
      add: 'Tambah berita',
      titleNew: 'Berita baru',
      titleEdit: 'Edit berita',
      judul: 'Judul berita',
      judulPh: 'Contoh: Jadwal kerja bakti bulan ini',
      desk: 'Isi berita',
      deskPh: 'Tulis kabarnya: apa, kapan, di mana, dan siapa yang perlu tahu.',
      foto: 'Foto sampul',
      fotoHelp: 'Satu foto sebagai sampul berita.',
      max: 1,
      page: 'berita.html',
      empty: 'Tulis kabar pertama untuk warga.',
      unit: 'berita',
    },
  };

  const viewLogin = $('#viewLogin');
  const viewApp = $('#viewApp');
  const rowsEl = $('#rows');
  const drawer = $('#drawer');
  const form = $('#editForm');
  const photosEl = $('#photos');
  const drop = $('#drop');
  const fileInput = $('#fileInput');
  const saveBtn = $('#saveBtn');

  let type = location.hash === '#berita' ? 'berita' : 'kegiatan';
  let items = [];
  let editing = null; // { type, id, photos: [{key, url?, blob?, src}], snap }
  let busy = false;
  const cfg = () => CFG[type];

  /* ---------- util UI ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function confirmBox({ title, text, yes }) {
    const m = $('#modal');
    $('#modalTitle').textContent = title;
    $('#modalText').textContent = text;
    const yesBtn = m.querySelector('[data-yes]');
    yesBtn.textContent = yes;
    m.hidden = false;
    const prev = document.activeElement;
    yesBtn.focus();
    return new Promise((res) => {
      const done = (v) => {
        m.hidden = true;
        m.removeEventListener('click', onClick);
        document.removeEventListener('keydown', onKey, true);
        if (prev) prev.focus();
        res(v);
      };
      const onClick = (e) => {
        if (e.target.closest('[data-yes]')) done(true);
        else if (e.target.closest('[data-no]')) done(false);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); done(false); }
      };
      m.addEventListener('click', onClick);
      document.addEventListener('keydown', onKey, true);
    });
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.hidden = !msg;
  }

  /* ---------- auth ---------- */
  async function boot() {
    let user = null;
    try { user = await Store.auth.current(); } catch (e) { /* tampilkan login */ }
    if (user) showApp();
    else showLogin();
  }

  function showLogin() {
    viewApp.hidden = true;
    viewLogin.hidden = false;
    $('#demoHint').hidden = Store.online;
    setTimeout(() => $('#loginForm [name=email]').focus(), 50);
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const email = f.email.value.trim();
    const pass = f.pass.value;
    const err = $('#loginError');
    if (!email || !pass) return showError(err, 'Isi email dan kata sandi.');
    const btn = f.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Memeriksa…';
    try {
      await Store.auth.signIn(email, pass);
      showError(err, '');
      f.reset();
      showApp();
    } catch (ex) {
      showError(err, ex.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Masuk';
    }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await Store.auth.signOut();
    showLogin();
  });

  /* ---------- tab ---------- */
  function setType(t) {
    type = t;
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.type === t)));
    $('#headTitle').textContent = cfg().label;
    $('#addText').textContent = cfg().add;
    $('#searchInput').value = '';
    $('#searchInput').placeholder = 'Cari ' + cfg().unit;
    history.replaceState(null, '', t === 'berita' ? '#berita' : '#');
    load();
  }
  document.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('.tab');
    if (b && b.dataset.type !== type) setType(b.dataset.type);
  });

  /* ---------- daftar ---------- */
  function showApp() {
    viewLogin.hidden = true;
    viewApp.hidden = false;
    $('#demoNote').hidden = Store.online;
    setType(type);
  }

  let loadSeq = 0;
  async function load() {
    const seq = ++loadSeq;
    const t = type;
    rowsEl.innerHTML = '<li class="rows-empty"><span>Memuat…</span></li>';
    $('#countText').textContent = '';
    let list;
    try {
      list = await Store[t].list();
    } catch (e) {
      if (seq === loadSeq) rowsEl.innerHTML = `<li class="rows-empty"><strong>Gagal memuat</strong><span>${U.esc(e.message)}</span></li>`;
      return;
    }
    if (seq !== loadSeq) return; // tab sudah berganti
    items = list;
    renderRows();
  }

  function renderRows() {
    const c = cfg();
    const q = $('#searchInput').value.trim().toLowerCase();
    const list = q ? items.filter((k) => (k.judul + ' ' + (k.lokasi || '')).toLowerCase().includes(q)) : items;
    $('#countText').textContent = `${items.length} ${c.unit} tercatat`;

    if (!items.length) {
      rowsEl.innerHTML = `<li class="rows-empty"><img src="../assets/logo-256.png" alt=""><strong>Belum ada ${c.unit}</strong><span>${c.empty}</span></li>`;
      return;
    }
    if (!list.length) {
      rowsEl.innerHTML = `<li class="rows-empty"><strong>Tidak ketemu</strong><span>Coba kata kunci lain.</span></li>`;
      return;
    }
    rowsEl.innerHTML = list
      .map((k) => {
        const n = (k.foto || []).length;
        const date = U.fmtDate(k.tanggal, { day: 'numeric', month: 'short', year: 'numeric' });
        const meta = type === 'kegiatan' ? [date, n ? `${n} foto` : 'Tanpa foto'].join(' | ') : date;
        return `<li class="row" data-id="${U.esc(k.id)}" tabindex="0" aria-label="Edit ${U.esc(k.judul)}">
          <div class="row-thumb"><img src="${U.esc(U.coverOf(k))}" alt="" loading="lazy"></div>
          <div class="row-main"><strong>${U.esc(k.judul)}</strong><span>${U.esc(meta)}${k.sorot ? '<b class="row-badge">Sorotan</b>' : ''}</span></div>
          <div class="row-actions">
            <a class="icon-btn" href="../${c.page}?id=${encodeURIComponent(k.id)}" target="_blank" rel="noopener" aria-label="Lihat di situs" title="Lihat di situs">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M10 3h5v5M15 3 8.5 9.5M13 11v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
            <button class="icon-btn del" type="button" aria-label="Hapus" title="Hapus">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 5h11M7 5V3.5h4V5M5 5l.7 9.2a1 1 0 0 0 1 .8h4.6a1 1 0 0 0 1-.8L13 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </li>`;
      })
      .join('');
  }

  $('#searchInput').addEventListener('input', renderRows);

  rowsEl.addEventListener('click', async (e) => {
    const row = e.target.closest('.row');
    if (!row) return;
    if (e.target.closest('a')) return;
    const k = items.find((x) => x.id === row.dataset.id);
    if (!k) return;
    if (e.target.closest('.del')) {
      const what = type === 'kegiatan' ? 'Kegiatan' : 'Berita';
      const ok = await confirmBox({ title: `Hapus ${what.toLowerCase()} ini?`, text: `"${k.judul}" dan fotonya akan dihapus permanen.`, yes: 'Hapus' });
      if (!ok) return;
      try {
        await Store[type].remove(k.id);
        toast(`${what} dihapus`);
        await load();
      } catch (ex) {
        toast('Gagal menghapus: ' + ex.message);
      }
      return;
    }
    openEditor(k);
  });
  rowsEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('row')) {
      const k = items.find((x) => x.id === e.target.dataset.id);
      if (k) openEditor(k);
    }
  });

  /* ---------- editor ---------- */
  let keySeq = 0;
  const snapshot = () => JSON.stringify({
    j: form.judul.value, t: form.tanggal.value, l: form.lokasi.value, d: form.deskripsi.value, s: form.sorot.checked,
    p: editing ? editing.photos.map((p) => p.key) : [],
  });

  function openEditor(k) {
    const c = cfg();
    editing = {
      type,
      id: k ? k.id : null,
      photos: ((k && k.foto) || []).map((u) => ({ key: 'u' + keySeq++, url: u, src: u })),
    };
    $('#editTitle').textContent = k ? c.titleEdit : c.titleNew;
    $('#lblJudul').textContent = c.judul;
    form.judul.placeholder = c.judulPh;
    $('#lblDesk').textContent = c.desk;
    form.deskripsi.placeholder = c.deskPh;
    $('#lblFoto').textContent = c.foto;
    $('#fotoHelp').textContent = c.fotoHelp;
    fileInput.multiple = c.max > 1;
    $('#fieldLokasi').hidden = type !== 'kegiatan';
    $('#rowTanggal').classList.toggle('is-single', type !== 'kegiatan');
    $('#fieldSorot').hidden = type !== 'berita';

    form.judul.value = k ? k.judul : '';
    form.tanggal.value = k ? k.tanggal : U.today();
    form.lokasi.value = k ? k.lokasi || '' : '';
    form.deskripsi.value = k ? k.deskripsi || '' : '';
    form.sorot.checked = Boolean(k && k.sorot);
    form.querySelectorAll('.field.invalid').forEach((f) => f.classList.remove('invalid'));
    showError($('#editError'), '');
    renderPhotos();
    editing.snap = snapshot();

    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => drawer.classList.add('open'));
    $('.drawer-body', drawer).scrollTop = 0;
    if (!window.matchMedia('(pointer: coarse)').matches) setTimeout(() => form.judul.focus(), 300);
  }

  async function closeEditor(force) {
    if (busy) return;
    if (!force && editing && snapshot() !== editing.snap) {
      const ok = await confirmBox({ title: 'Buang perubahan?', text: 'Perubahan yang belum disimpan akan hilang.', yes: 'Buang' });
      if (!ok) return;
    }
    drawer.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      drawer.hidden = true;
      if (editing) editing.photos.forEach((p) => p.blob && URL.revokeObjectURL(p.src));
      editing = null;
      photosEl.innerHTML = '';
    }, 380);
  }

  drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeEditor();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hidden && $('#modal').hidden) closeEditor();
  });

  $('#addBtn').addEventListener('click', () => openEditor(null));

  /* ---------- foto ---------- */
  function renderPhotos() {
    const ph = editing.photos;
    const max = CFG[editing.type].max;
    $('#photoCount').textContent = max > 1 ? (ph.length ? `${ph.length} / ${max}` : 'opsional') : 'opsional';
    drop.hidden = ph.length >= max;
    photosEl.innerHTML = ph
      .map((p, i) => `<div class="ph" draggable="${max > 1}" data-key="${p.key}">
        <img src="${U.esc(p.src)}" alt="Foto ${i + 1}">
        ${max > 1 ? (i === 0 ? '<span class="ph-badge">Sampul</span>' : '<button class="ph-cover-btn" type="button" data-act="cover">Jadikan sampul</button>') : ''}
        <div class="ph-tools">
          <button class="ph-del" type="button" data-act="del" aria-label="Hapus foto ${i + 1}">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>`)
      .join('');
  }

  photosEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const key = b.closest('.ph').dataset.key;
    const i = editing.photos.findIndex((p) => p.key === key);
    if (i < 0) return;
    if (b.dataset.act === 'del') {
      const [p] = editing.photos.splice(i, 1);
      if (p.blob) URL.revokeObjectURL(p.src);
    } else if (b.dataset.act === 'cover') {
      const [p] = editing.photos.splice(i, 1);
      editing.photos.unshift(p);
    }
    renderPhotos();
  });

  /* geser untuk urutkan (desktop) */
  let dragKey = null;
  photosEl.addEventListener('dragstart', (e) => {
    const el = e.target.closest('.ph');
    if (!el) return;
    dragKey = el.dataset.key;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragKey); } catch (ex) {}
  });
  photosEl.addEventListener('dragend', () => {
    dragKey = null;
    photosEl.querySelectorAll('.dragging, .over').forEach((x) => x.classList.remove('dragging', 'over'));
  });
  photosEl.addEventListener('dragover', (e) => {
    if (!dragKey) return;
    e.preventDefault();
    const el = e.target.closest('.ph');
    photosEl.querySelectorAll('.over').forEach((x) => x !== el && x.classList.remove('over'));
    if (el && el.dataset.key !== dragKey) el.classList.add('over');
  });
  photosEl.addEventListener('drop', (e) => {
    if (!dragKey) return;
    e.preventDefault();
    const el = e.target.closest('.ph');
    if (!el || el.dataset.key === dragKey) return;
    const ph = editing.photos;
    const from = ph.findIndex((p) => p.key === dragKey);
    const to = ph.findIndex((p) => p.key === el.dataset.key);
    const [p] = ph.splice(from, 1);
    ph.splice(to, 0, p);
    renderPhotos();
  });

  async function addFiles(files) {
    if (!editing) return;
    const max = CFG[editing.type].max;
    const imgs = [...files].filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    const room = max - editing.photos.length;
    if (imgs.length > room && max > 1) toast(`Maksimal ${max} foto`);
    const take = imgs.slice(0, Math.max(0, room));
    const label = drop.querySelector('strong');
    const old = label.textContent;
    for (let i = 0; i < take.length; i++) {
      label.textContent = `Memproses ${i + 1} / ${take.length}`;
      try {
        const blob = await U.compress(take[i]);
        if (!editing) return;
        editing.photos.push({ key: 'n' + keySeq++, blob, src: URL.createObjectURL(blob) });
        renderPhotos();
      } catch (e) {
        toast(`Foto "${take[i].name}" tidak bisa dibaca`);
      }
    }
    label.textContent = old;
  }

  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => {
    if (dragKey) return;
    e.preventDefault();
    drop.classList.add('hot');
  }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('hot')));
  drop.addEventListener('drop', (e) => {
    if (dragKey) return;
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  });

  /* ---------- simpan ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy || !editing) return;
    const err = $('#editError');
    const judul = form.judul.value.trim();
    const tanggal = form.tanggal.value;
    form.judul.closest('.field').classList.toggle('invalid', !judul);
    form.tanggal.closest('.field').classList.toggle('invalid', !tanggal);
    if (!judul || !tanggal) {
      showError(err, !judul ? 'Judul wajib diisi.' : 'Tanggal wajib diisi.');
      (!judul ? form.judul : form.tanggal).focus();
      return;
    }
    showError(err, '');
    busy = true;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spin"></span> Menyimpan';
    const t = editing.type;
    try {
      await Store[t].save({
        id: editing.id,
        judul,
        tanggal,
        lokasi: form.lokasi.value,
        sorot: form.sorot.checked,
        deskripsi: form.deskripsi.value,
        fotos: editing.photos.map((p) => (p.url ? { url: p.url } : { blob: p.blob })),
      });
      const isNew = !editing.id;
      busy = false;
      await closeEditor(true);
      toast(isNew ? `${CFG[t].label} ditambahkan` : 'Perubahan disimpan');
      await load();
    } catch (ex) {
      showError(err, 'Gagal menyimpan: ' + ex.message);
    } finally {
      busy = false;
      saveBtn.disabled = false;
      saveBtn.textContent = 'Simpan';
    }
  });

  boot();
})();

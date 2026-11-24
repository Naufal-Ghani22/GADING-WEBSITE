/* Halaman berita: tanpa ?id = daftar semua berita, dengan ?id = detail. */
(async function () {
  const S = window.SITE || {};
  const root = document.getElementById('root');
  const id = new URLSearchParams(location.search).get('id');
  const href = (b) => `berita.html?id=${encodeURIComponent(b.id)}`;

  let all = [];
  try {
    all = await Store.berita.list();
  } catch (e) {
    root.innerHTML = `<div class="wrap"><div class="empty"><img src="assets/logo-256.png" alt=""><h3>Berita belum bisa dimuat</h3><p>${U.esc(e.message)}</p></div></div>`;
    return;
  }

  const row = (b) => `<a class="news-item" href="${href(b)}" data-reveal>
      <div class="ni-img"><img src="${U.esc(U.coverOf(b))}" alt="" loading="lazy" decoding="async"></div>
      <div><strong>${U.esc(b.judul)}</strong><span>${U.esc(U.fmtDate(b.tanggal))}</span></div>
    </a>`;

  /* ---------- daftar ---------- */
  if (!id) {
    document.title = `Berita | ${S.nama || 'Karang Taruna GADING'}`;
    root.innerHTML = `<div class="wrap">
      <header class="d-head" data-reveal>
        <p class="d-meta">Kabar terbaru</p>
        <h1 class="d-title">Berita</h1>
      </header>
      ${all.length
        ? `<div class="news-list news-page">${all.map(row).join('')}</div>`
        : '<div class="empty"><img src="assets/logo-256.png" alt=""><h3>Belum ada berita</h3><p>Kabar terbaru dari pengurus akan muncul di sini.</p></div>'}
    </div>`;
    window.reveal(root);
    return;
  }

  /* ---------- detail ---------- */
  document.getElementById('backLink').href = 'berita.html';
  document.getElementById('backText').textContent = 'Semua berita';

  const b = all.find((x) => x.id === id) || null;
  if (!b) {
    root.innerHTML = `<div class="wrap"><div class="empty"><img src="assets/logo-256.png" alt=""><h3>Berita tidak ditemukan</h3><p>Mungkin sudah dihapus atau tautannya salah.</p><a class="btn btn-dark" href="berita.html" style="margin-top:22px">Lihat semua berita</a></div></div>`;
    return;
  }

  document.title = `${b.judul} | ${S.nama || 'Karang Taruna GADING'}`;
  const foto = b.foto || [];
  const others = all.filter((x) => x.id !== b.id).slice(0, 3);

  root.innerHTML = `
    <article>
      <header class="wrap d-head" data-reveal>
        <p class="d-meta">${U.esc(U.fmtDate(b.tanggal, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}${b.sorot ? ' | Sorotan' : ''}</p>
        <h1 class="d-title">${U.esc(b.judul)}</h1>
      </header>
      ${foto.length ? `<div class="wrap">
        <button class="d-cover" type="button" data-zoom aria-label="Perbesar foto" data-reveal>
          <img src="${U.esc(foto[0])}" alt="${U.esc(b.judul)}">
        </button>
      </div>` : ''}
      ${b.deskripsi ? `<div class="wrap d-body${foto.length ? '' : ' is-tight'}" data-reveal>
        <p class="eyebrow">Isi berita</p>
        <div class="d-text">${U.paragraphs(b.deskripsi)}</div>
      </div>` : ''}
      ${others.length ? `<section class="wrap d-gallery">
        <div class="d-gallery-head"><p class="eyebrow">Berita lain</p><a class="link-more" href="berita.html">Semua <span aria-hidden="true">→</span></a></div>
        <div class="news-list news-page">${others.map(row).join('')}</div>
      </section>` : ''}
    </article>`;
  window.reveal(root);

  /* lightbox satu foto */
  const lb = document.getElementById('lightbox');
  const close = () => {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { lb.hidden = true; }, 250);
  };
  root.addEventListener('click', (e) => {
    if (!e.target.closest('[data-zoom]')) return;
    lb.querySelector('.lb-img').src = foto[0];
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lb.classList.add('open'));
    lb.querySelector('.lb-close').focus();
  });
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) close(); });
})();

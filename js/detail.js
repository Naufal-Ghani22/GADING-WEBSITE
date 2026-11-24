/* Halaman detail kegiatan + lightbox foto. */
(async function () {
  const S = window.SITE || {};
  const root = document.getElementById('detail');
  const id = new URLSearchParams(location.search).get('id');

  const notFound = (msg) => {
    root.innerHTML = `<div class="wrap"><div class="empty"><img src="assets/logo-256.png" alt=""><h3>Kegiatan tidak ditemukan</h3><p>${U.esc(msg || 'Mungkin sudah dihapus atau tautannya salah.')}</p><a class="btn btn-dark" href="index.html#kegiatan" style="margin-top:22px">Lihat semua kegiatan</a></div></div>`;
  };
  if (!id) return notFound();

  let k, all;
  try {
    [k, all] = await Promise.all([Store.kegiatan.get(id), Store.kegiatan.list()]);
  } catch (e) {
    return notFound(e.message);
  }
  if (!k) return notFound();

  document.title = `${k.judul} | ${S.nama || 'Karang Taruna Gading'}`;
  const foto = k.foto || [];
  const meta = [U.fmtDate(k.tanggal, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), k.lokasi].filter(Boolean);

  /* urutan kronologis: idx kecil = lebih baru */
  const idx = all.findIndex((x) => x.id === k.id);
  const newer = idx > 0 ? all[idx - 1] : null;
  const older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  const navCard = (x, label, cls) => x
    ? `<a class="pn ${cls}" href="kegiatan.html?id=${encodeURIComponent(x.id)}">
        <span class="pn-label">${label}</span>
        <strong>${U.esc(x.judul)}</strong>
        <span class="pn-date">${U.fmtDate(x.tanggal)}</span>
      </a>`
    : '<span></span>';

  root.innerHTML = `
    <article>
      <header class="wrap d-head" data-reveal>
        <p class="d-meta">${meta.map(U.esc).join(' | ')}</p>
        <h1 class="d-title">${U.esc(k.judul)}</h1>
      </header>

      <div class="wrap">
        <button class="d-cover${foto.length ? '' : ' is-blank'}" type="button" ${foto.length ? 'data-i="0" aria-label="Perbesar foto"' : 'disabled aria-hidden="true"'} data-reveal>
          <img src="${U.esc(U.coverOf(k))}" alt="${U.esc(k.judul)}">
        </button>
      </div>

      ${k.deskripsi ? `<div class="wrap d-body" data-reveal>
        <p class="eyebrow">Cerita</p>
        <div class="d-text">${U.paragraphs(k.deskripsi)}</div>
      </div>` : ''}

      ${foto.length > 1 ? `<section class="wrap d-gallery">
        <div class="d-gallery-head"><p class="eyebrow">Galeri</p><span>${foto.length} foto</span></div>
        <div class="masonry">
          ${foto.map((u, i) => `<button class="m-item" type="button" data-i="${i}" data-reveal aria-label="Buka foto ${i + 1}"><img src="${U.esc(u)}" alt="" loading="lazy" decoding="async"></button>`).join('')}
        </div>
      </section>` : ''}

      <nav class="wrap prevnext" aria-label="Kegiatan lain">
        ${navCard(older, 'Sebelumnya', 'pn-prev')}
        ${navCard(newer, 'Berikutnya', 'pn-next')}
      </nav>
    </article>`;
  window.reveal(root);

  /* ---------- lightbox ---------- */
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('.lb-img');
  const lbCount = lb.querySelector('.lb-count');
  let cur = 0;
  let lastFocus = null;

  function show(i) {
    cur = (i + foto.length) % foto.length;
    lbImg.src = foto[cur];
    lbCount.textContent = `${cur + 1} / ${foto.length}`;
    lb.classList.toggle('is-single', foto.length < 2);
  }
  function open(i) {
    if (!foto.length) return;
    lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lb.classList.add('open'));
    lb.querySelector('.lb-close').focus();
  }
  function close() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { lb.hidden = true; }, 250);
    if (lastFocus) lastFocus.focus();
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b && !b.disabled) open(Number(b.dataset.i));
  });
  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', () => show(cur - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
  let sx = null;
  lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    sx = null;
  });
})();

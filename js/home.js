/* Beranda: sorotan berita, statistik, daftar kegiatan per bulan. */
(function () {
  /* ---------- BERITA (sorotan) ---------- */
  (async function () {
    const sec = document.getElementById('berita');
    const grid = document.getElementById('newsGrid');
    let news = [];
    try { news = await Store.berita.list(); } catch (e) { return; }
    if (!news.length) return; // bagian disembunyikan bila belum ada berita

    const pinned = news.find((b) => b.sorot);
    const feat = pinned || news[0];
    const rest = news.filter((b) => b !== feat).slice(0, 3);
    const href = (b) => `berita.html?id=${encodeURIComponent(b.id)}`;

    grid.classList.toggle('is-solo', !rest.length);
    grid.innerHTML = `
      <a class="news-feature" href="${href(feat)}" data-reveal>
        <img src="${U.esc((feat.foto && feat.foto[0]) || U.cover(feat, true))}" alt="" decoding="async">
        <div class="nf-body">
          ${feat.sorot ? '<span class="nf-badge">Sorotan</span>' : ''}
          <h3>${U.esc(feat.judul)}</h3>
          <p>${U.esc(U.fmtDate(feat.tanggal))}${feat.deskripsi ? ' | ' + U.esc(U.excerpt(feat.deskripsi, 90)) : ''}</p>
        </div>
      </a>
      ${rest.length ? `<div class="news-list">${rest.map((b, i) => `
        <a class="news-item" href="${href(b)}" data-reveal style="transition-delay:${(i + 1) * 80}ms">
          <div class="ni-img"><img src="${U.esc(U.coverOf(b))}" alt="" loading="lazy" decoding="async"></div>
          <div><strong>${U.esc(b.judul)}</strong><span>${U.esc(U.fmtDate(b.tanggal))}</span></div>
        </a>`).join('')}</div>` : ''}`;

    sec.hidden = false;
    document.getElementById('navBerita').hidden = false;
    document.getElementById('newsAll').hidden = news.length <= 4;
    window.reveal(sec);
  })();

  /* ---------- KEGIATAN ---------- */
  (async function () {
    const S = window.SITE || {};
    const feed = document.getElementById('feed');
    const chipsEl = document.getElementById('yearChips');
    const sortBtn = document.getElementById('sortBtn');
    let all = [];
    let year = 'all';
    let asc = false;

    try {
      all = await Store.kegiatan.list();
    } catch (e) {
      feed.innerHTML = `<div class="empty"><img src="assets/logo-256.png" alt=""><h3>Data belum bisa dimuat</h3><p>${U.esc(e.message)}</p></div>`;
      return;
    }

    /* statistik */
    const start = U.parseDate(S.periodeMulai || U.today());
    const now = new Date();
    const months = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1);
    const totals = {
      kegiatan: all.length,
      foto: all.reduce((n, k) => n + ((k.foto && k.foto.length) || 0), 0),
      bulan: months,
    };
    const hud = document.getElementById('hudCount');
    if (hud) hud.textContent = `${totals.kegiatan} kegiatan tercatat`;

    const countEls = document.querySelectorAll('[data-count]');
    const runCount = (el) => {
      const target = totals[el.dataset.count] || 0;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || target === 0) { el.textContent = target; return; }
      const t0 = performance.now();
      const dur = 1400;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { runCount(e.target); io.unobserve(e.target); } }), { threshold: 0.4 });
      countEls.forEach((el) => io.observe(el));
    } else countEls.forEach(runCount);

    /* filter tahun */
    const years = [...new Set(all.map((k) => k.tanggal.slice(0, 4)))].sort().reverse();
    function chips() {
      if (years.length < 2) { chipsEl.innerHTML = ''; return; }
      chipsEl.innerHTML = ['all', ...years]
        .map((y) => `<button class="chip" role="tab" type="button" data-y="${y}" aria-selected="${y === year}">${y === 'all' ? 'Semua' : y}</button>`)
        .join('');
    }
    chipsEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-y]');
      if (!b) return;
      year = b.dataset.y;
      chips();
      render();
    });
    sortBtn.addEventListener('click', () => {
      asc = !asc;
      sortBtn.textContent = asc ? 'Terlama' : 'Terbaru';
      sortBtn.classList.toggle('is-asc', asc);
      render();
    });
    if (!all.length) sortBtn.hidden = true;

    function card(k, i) {
      const n = (k.foto && k.foto.length) || 0;
      const meta = [U.fmtDate(k.tanggal), k.lokasi].filter(Boolean).join(' | ');
      return `<a class="card" href="kegiatan.html?id=${encodeURIComponent(k.id)}" data-reveal style="transition-delay:${(i % 4) * 70}ms">
        <div class="card-img">
          <img src="${U.esc(U.coverOf(k))}" alt="" loading="lazy" decoding="async">
          ${n > 1 ? `<span class="card-count">${n} foto</span>` : ''}
        </div>
        <h3>${U.esc(k.judul)} <span class="arr" aria-hidden="true">→</span></h3>
        <p class="card-meta">${U.esc(meta)}</p>
      </a>`;
    }

    function render() {
      let list = year === 'all' ? all : all.filter((k) => k.tanggal.startsWith(year));
      list = asc ? list.slice().reverse() : list;

      if (!list.length) {
        feed.innerHTML = `<div class="empty"><img src="assets/logo-256.png" alt=""><h3>Belum ada kegiatan</h3><p>Kegiatan yang sudah dikerjakan akan muncul di sini.</p></div>`;
        return;
      }

      const groups = [];
      for (const k of list) {
        const key = k.tanggal.slice(0, 7);
        let g = groups[groups.length - 1];
        if (!g || g.key !== key) groups.push((g = { key, items: [] }));
        g.items.push(k);
      }

      feed.innerHTML = groups
        .map((g) => {
          const d = U.parseDate(g.key + '-01');
          const mon = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(d);
          return `<div class="month">
            <div class="month-label"><strong>${mon}</strong><span>${d.getFullYear()}</span></div>
            <div class="cards">${g.items.map(card).join('')}</div>
          </div>`;
        })
        .join('');
      window.reveal(feed);
    }

    chips();
    render();
  })();
})();

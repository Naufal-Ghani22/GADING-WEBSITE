/*
  Efek hero: partikel mengorbit, parallax kursor, cincin jam, jam WIB,
  ledakan partikel saat logo diklik, ticker.
*/
(function () {
  const S = window.SITE || {};
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- teks cincin & ticker ---------- */
  const ringText = document.getElementById('ringText');
  if (ringText) {
    ringText.textContent = `${S.slogan || 'GADING GACOR DAR DER DOR'} | ${(S.kepanjangan || '').toUpperCase()} | ${S.wilayah || 'RW 09'} |`;
  }

  /* Solasi: tiap teks dan pemisah adalah item flex sendiri, jadi tidak menumpuk.
     Isi diulang 2 paruh identik supaya putaran -50% mulus. */
  const sparkle = '<svg class="tape-sep" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0Z"/></svg>';
  const logo = '<img class="tape-sep" src="assets/logo-256.png" alt="" width="32" height="32">';
  function fillTape(id, words, sep) {
    const el = document.getElementById(id);
    if (!el) return;
    const once = words.map((w) => `<span class="tape-item"><span class="tape-text${w.o ? ' o' : ''}">${U.esc(w.t)}</span>${sep}</span>`).join('');
    const half = once.repeat(4);
    el.innerHTML = half + half;
  }
  const slogan = S.slogan || 'GADING GACOR DAR DER DOR';
  fillTape('tapeA', [{ t: slogan }, { t: slogan, o: true }], logo);
  fillTape('tapeB', [
    { t: S.kepanjangan || 'Gerakan Muda Mudi Grabagan' },
    { t: S.wilayah || 'RW 09', o: true },
    { t: 'Perumtas 3' },
    { t: 'Tulangan', o: true },
  ], sparkle);

  /* ---------- cincin tanda jam ---------- */
  const ticks = document.getElementById('ticks');
  if (ticks) {
    let out = '';
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const big = i % 6 === 0;
      const r1 = 200, r2 = big ? 176 : 188;
      out += `<line class="${big ? 'l' : ''}" x1="${200 + Math.cos(a) * r1}" y1="${200 + Math.sin(a) * r1}" x2="${200 + Math.cos(a) * r2}" y2="${200 + Math.sin(a) * r2}"/>`;
    }
    ticks.innerHTML = out;
  }

  /* ---------- jam WIB ---------- */
  const clock = document.getElementById('clock');
  if (clock) {
    const f = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
    const tick = () => (clock.textContent = f.format(new Date()).replace(/\./g, ':'));
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- intro ---------- */
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-in')));

  /* ---------- parallax kursor (dihaluskan) ---------- */
  let tx = 0, ty = 0, mx = 0, my = 0;
  let px = -9999, py = -9999; // posisi kursor dalam kanvas
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    px = e.clientX - r.left;
    py = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', () => { tx = ty = 0; px = py = -9999; });

  /* gerakan HP (giroskop) sebagai pengganti kursor */
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    tx = Math.max(-1, Math.min(1, e.gamma / 30));
    ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  });

  /* scroll: emblem memudar */
  let sp = 0;
  const onScroll = () => {
    sp = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.9)));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- kanvas partikel ---------- */
  const cv = hero.querySelector('.hero-canvas');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, CX = 0, CY = 0;
  let parts = [], shards = [];

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth;
    H = hero.clientHeight;
    cv.width = W * DPR;
    cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const em = document.getElementById('emblem').getBoundingClientRect();
    const hr = hero.getBoundingClientRect();
    CX = em.left - hr.left + em.width / 2;
    CY = em.top - hr.top + em.height / 2;
    const n = Math.round(Math.min(240, Math.max(70, (W * H) / 6500)));
    const minR = em.width * 0.42;
    const maxR = Math.hypot(W, H) * 0.62;
    parts = Array.from({ length: n }, () => {
      const t = Math.pow(Math.random(), 0.8);
      const r = minR + t * (maxR - minR);
      return {
        a: Math.random() * Math.PI * 2,
        r,
        w: (0.05 + Math.random() * 0.1) * (220 / Math.max(r, 120)) * (Math.random() < 0.12 ? -1 : 1),
        s: Math.random() < 0.08 ? 1.6 + Math.random() * 1.4 : 0.5 + Math.random() * 1.1,
        o: 0.25 + Math.random() * 0.7,
        ph: Math.random() * Math.PI * 2,
        ox: 0, oy: 0,
      };
    });
  }

  function burst() {
    const count = 90;
    const r0 = document.getElementById('emblem').offsetWidth * 0.3;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.25;
      const v = 5 + Math.random() * 12;
      shards.push({ x: CX + Math.cos(a) * r0, y: CY + Math.sin(a) * r0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, s: 1 + Math.random() * 2 });
    }
    parts.forEach((p) => { p.ox += Math.cos(p.a) * 60; p.oy += Math.sin(p.a) * 60; });
  }

  let last = performance.now();
  let running = true;
  function frame(now, once) {
    if (!running && !once) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    mx += (tx - mx) * 0.06;
    my += (ty - my) * 0.06;
    hero.style.setProperty('--mx', mx.toFixed(4));
    hero.style.setProperty('--my', my.toFixed(4));
    hero.style.setProperty('--sp', sp.toFixed(4));

    ctx.clearRect(0, 0, W, H);
    const cx = CX + mx * 18, cy = CY + my * 18;
    const t = now / 1000;
    const near = [];

    for (const p of parts) {
      p.a += p.w * dt;
      p.ox *= 0.94; p.oy *= 0.94;
      const wob = Math.sin(t * 0.8 + p.ph) * 6;
      let x = cx + Math.cos(p.a) * (p.r + wob) + p.ox;
      let y = cy + Math.sin(p.a) * (p.r + wob) * 0.62 + p.oy;
      const dx = x - px, dy = y - py, d = Math.hypot(dx, dy);
      if (d < 120 && d > 0.1) {
        const f = (1 - d / 120) * 26;
        x += (dx / d) * f;
        y += (dy / d) * f;
        near.push([x, y, d]);
      }
      const tw = 0.65 + Math.sin(t * 2 + p.ph) * 0.35;
      ctx.globalAlpha = p.o * tw;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, p.s, 0, Math.PI * 2);
      ctx.fill();
    }

    /* garis dari kursor ke partikel terdekat */
    if (near.length) {
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = '#fff';
      for (const [x, y, d] of near) {
        ctx.globalAlpha = (1 - d / 120) * 0.45;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }

    /* serpihan ledakan: garis kilat searah gerak */
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      const k = dt * 60;
      s.x += s.vx * k; s.y += s.vy * k;
      s.vx *= Math.pow(0.95, k); s.vy *= Math.pow(0.95, k);
      s.life -= dt * 0.8;
      if (s.life <= 0) { shards.splice(i, 1); continue; }
      ctx.globalAlpha = s.life;
      ctx.lineWidth = s.s;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 3, s.y - s.vy * 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!once) requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  resize();
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  window.addEventListener('load', resize);

  if (reduce) {
    running = false;
    const still = () => frame(performance.now(), true); // gambar sekali, statis
    still();
    window.addEventListener('load', still);
  } else {
    requestAnimationFrame(frame);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop())).observe(hero);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  /* ---------- klik logo: gelombang + ledakan ---------- */
  const disc = document.getElementById('logoDisc');
  const emblem = document.getElementById('emblem');
  function blast() {
    const sh = document.createElement('div');
    sh.className = 'shock';
    emblem.appendChild(sh);
    sh.addEventListener('animationend', () => sh.remove());
    if (!reduce) burst();
  }
  disc.addEventListener('click', blast);
  if (!reduce) setTimeout(blast, 1100); // ledakan pembuka setelah intro
})();

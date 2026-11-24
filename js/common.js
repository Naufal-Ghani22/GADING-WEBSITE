/* Bagian bersama halaman publik: isi teks dari config, animasi muncul saat scroll. */
(function () {
  const S = window.SITE || {};

  document.querySelectorAll('[data-site]').forEach((el) => {
    const v = S[el.dataset.site];
    if (v != null && v !== '') el.textContent = v;
  });

  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  const ig = document.getElementById('igLink');
  if (ig && S.instagram) {
    ig.href = S.instagram;
    ig.hidden = false;
  }

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    : null;

  window.reveal = function (root) {
    (root || document).querySelectorAll('[data-reveal]:not(.in)').forEach((el) => {
      if (io) io.observe(el);
      else el.classList.add('in');
    });
  };
  window.reveal();
})();

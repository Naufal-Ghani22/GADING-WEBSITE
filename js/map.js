/*
  Peta area Perumtas 3 (Leaflet + peta dasar CARTO gelap, data OpenStreetMap).
  Dimuat hanya saat bagian Lokasi mendekati layar, supaya beranda tetap ringan di HP.
  Di layar sentuh, peta tidak bisa digeser satu jari (agar tidak "membajak" scroll halaman);
  pakai tombol +/- atau cubit dua jari.
*/
(function () {
  const el = document.getElementById('map');
  if (!el) return;
  const S = window.SITE || {};
  const P = S.peta || {};
  const A = window.AREA || {};
  const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';

  const q = `${P.lat},${P.lng}`;
  const open = document.getElementById('mapsOpen');
  const dir = document.getElementById('mapsDir');
  if (open) open.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (dir) dir.href = `https://www.google.com/maps/dir/?api=1&destination=${q}`;

  const load = (tag, attrs) => new Promise((res, rej) => {
    const n = document.createElement(tag);
    Object.assign(n, attrs);
    n.onload = res;
    n.onerror = rej;
    document.head.appendChild(n);
  });

  let started = false;
  async function init() {
    if (started) return;
    started = true;
    try {
      await Promise.all([
        load('link', { rel: 'stylesheet', href: LEAFLET_CSS }),
        window.L ? Promise.resolve() : load('script', { src: LEAFLET_JS }),
      ]);
    } catch (e) {
      el.innerHTML = `<div class="map-fallback"><p>Peta belum bisa dimuat.<br><a href="${open ? open.href : '#'}" target="_blank" rel="noopener">Buka di Google Maps</a></p></div>`;
      return;
    }

    const touch = window.matchMedia('(pointer: coarse)').matches;
    const map = L.map(el, {
      scrollWheelZoom: false,
      dragging: !touch,
      zoomSnap: 0.5,
      zoomControl: false,
      attributionControl: true,
    }).setView([P.lat, P.lng], P.zoom || 16);
    L.control.zoom({ position: 'topright' }).addTo(map);

    /* Peta OpenStreetMap (tanpa API key). Warna dibuat monokrom gelap lewat CSS (.leaflet-tile-pane). */
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(map);

    if (A.batas && A.batas.length > 2) {
      const area = L.polygon(A.batas, {
        color: '#ffffff',
        weight: 2,
        dashArray: '6 6',
        fillColor: '#ffffff',
        fillOpacity: 0.08,
      }).addTo(map);
      map.fitBounds(area.getBounds(), { padding: touch ? [24, 24] : [48, 48] });
    }

    const icon = L.divIcon({
      className: 'pin',
      html: '<i></i><i style="animation-delay:-1.3s"></i><img src="assets/logo-256.png" alt="">',
      iconSize: [56, 56],
      iconAnchor: [28, 28],
    });
    L.marker([P.lat, P.lng], { icon, keyboard: false, title: 'Perumtas 3' }).addTo(map);

    /* desktop: roda mouse aktif hanya setelah peta diklik */
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) { io.disconnect(); init(); }
    }, { rootMargin: '600px 0px' });
    io.observe(el);
  } else init();
})();

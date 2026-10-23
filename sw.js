// Subí el número de versión cada vez que cambies index.html
const V = 'ct-shell-v1';
const OCR = 'ct-ocr'; // motor OCR y librerías; no se borra al actualizar
const SHELL = ['./', 'index.html', 'app.js', 'admin.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];
const CDN = ['cdn.jsdelivr.net', 'tessdata.projectnaptha.com']; // único externo que se guarda

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('ct-shell-') && k !== V).map(k => caches.delete(k))
      ))
      // limpia respuestas de Supabase que versiones anteriores guardaron por error
      .then(() => caches.open(OCR))
      .then(c => c.keys().then(ks => Promise.all(
        ks.filter(r => new URL(r.url).hostname.endsWith('supabase.co')).map(r => c.delete(r))
      )))
      .then(() => self.clients.claim())
  );
});

// Red con límite de 3 s (si hay señal, siempre la versión nueva); si no, lo guardado
const red = url => new Promise((ok, no) => {
  const t = setTimeout(() => no(new Error('timeout')), 3000);
  fetch(url, { cache: 'no-cache' }).then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); no(e); });
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin === self.location.origin) {
    e.respondWith(
      red(e.request.url)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(e.request, copy)); }
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then(h => h || caches.match('index.html')))
    );
  } else if (CDN.includes(u.hostname)) {
    // Motor OCR y librerías: caché primero
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => {
          if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(OCR).then(c => c.put(e.request, copy)); }
          return res;
        })
      )
    );
  }
  // Cualquier otro (Supabase, etc.): no se intercepta, va siempre a la red
});

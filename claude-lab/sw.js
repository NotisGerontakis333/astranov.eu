// AstranoV · Claude Lab — service worker
// Bump SHELL_CACHE on every shell change so open tabs refetch (§4).
const SHELL_CACHE = 'astranov-claude-shell-v1';
const SHELL = [
  '/', '/index.html', '/manifest.json',
  '/vendor/supabase.min.js',
  '/icon-180.png', '/icon-192.png', '/icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Never cache the brain path or Supabase calls — always live.
  if (url.hostname.endsWith('supabase.co') || url.pathname.startsWith('/functions/')) return;
  // Network-first for the shell HTML so deploys land immediately.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
    return;
  }
  // Cache-first for static precached assets.
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

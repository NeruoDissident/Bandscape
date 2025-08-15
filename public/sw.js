self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Lightweight network-first handler with cache fallback for core assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  event.respondWith((async () => {
    try {
      const response = await fetch(request)
      return response
    } catch (e) {
      const cache = await caches.open('bandscape-fallback')
      const cached = await cache.match(request)
      return cached || new Response('', { status: 504 })
    }
  })())
})



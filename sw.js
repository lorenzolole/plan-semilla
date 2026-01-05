/**
 * 🚀 Service Worker - Inversiones UY PWA
 * Handles caching for offline support and faster load times.
 * v2: Fixed external API handling
 */

const CACHE_NAME = 'inversiones-uy-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/market_clock.js',
    '/historical_data.js',
    '/icon-192.png',
    '/icon-512.png',
];

// Domains to NEVER intercept (APIs that handle their own CORS)
const API_DOMAINS = [
    'api.coingecko.com',
    'localhost:5000',
    'api.coinbase.com',
    'api.binance.com',
];

// Install: Pre-cache critical assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v2...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v2...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // ⚠️ CRITICAL: Do NOT intercept API calls - let them pass through directly
    // This prevents CORS issues and allows the browser to handle them normally
    const isApiCall = API_DOMAINS.some(domain => url.host.includes(domain));
    if (isApiCall) {
        // Don't call event.respondWith() - this lets the request pass through unmodified
        return;
    }

    // Skip external resources that aren't safe to cache (APIs, tracking, etc)
    if (url.origin !== location.origin) {
        // Only cache CDN resources (fonts, CSS, JS libraries)
        const isCDN = url.host.includes('cdn') ||
            url.host.includes('fonts.') ||
            url.host.includes('cdnjs.');

        if (!isCDN) {
            // Let non-CDN external requests pass through
            return;
        }

        // For CDN resources: try network, fallback to cache
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then((cached) => {
                        // Return cached version or a fallback
                        return cached || new Response('Offline', { status: 503 });
                    });
                })
        );
        return;
    }

    // For local assets: Cache-first with network fallback
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached, update in background
                    fetch(event.request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.ok) {
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(event.request, networkResponse);
                                });
                            }
                        })
                        .catch(() => { }); // Ignore background update failures
                    return cachedResponse;
                }

                // Not cached, fetch from network
                return fetch(event.request)
                    .then((response) => {
                        if (response && response.ok) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Offline fallback for HTML pages
                        if (event.request.headers.get('accept')?.includes('text/html')) {
                            return caches.match('/index.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

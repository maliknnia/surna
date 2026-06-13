const CACHE_NAME = 'surna-v4';
const STATIC_CACHE = 'surna-static-v4';
const DYNAMIC_CACHE = 'surna-dynamic-v4';
const API_CACHE = 'surna-api-v4';
const DEV_MODE = false; // Production: use cache strategies below

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  // Add critical assets that should be cached immediately
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/auth/user',
  '/api/posts',
  '/api/events',
  '/api/teams',
  '/api/messages'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => {
        console.error('Failed to cache static assets:', err);
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all pages
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // In DEV_MODE, always use network-first for everything
  if (DEV_MODE) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }
  
  // Handle different types of requests with appropriate strategies
  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      // API requests - network first, cache fallback
      event.respondWith(handleApiRequest(request));
    } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
      // Static assets - cache first
      event.respondWith(handleStaticAsset(request));
    } else {
      // HTML pages - network first, cache fallback
      event.respondWith(handlePageRequest(request));
    }
  } else if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    // Write operations - handle offline
    event.respondWith(handleWriteRequest(request));
  }
});

// Network first strategy for API requests
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add offline indicator header
      const responseHeaders = new Headers(cachedResponse.headers);
      responseHeaders.set('X-Served-From', 'cache');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: responseHeaders
      });
    }
    
    // Return offline response for critical endpoints
    if (request.url.includes('/api/posts') || 
        request.url.includes('/api/events') ||
        request.url.includes('/api/messages')) {
      return new Response(JSON.stringify({ 
        offline: true, 
        message: 'This content is not available offline',
        data: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Network-first for JS/CSS so deploys never serve stale hashed bundles (black screen).
async function handleStaticAsset(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    console.log('Failed to fetch asset:', request.url);
    throw error;
  }
}

// Network first strategy for HTML pages
async function handlePageRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('Network failed for page, trying cache:', request.url);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/offline.html');
    }
    
    throw error;
  }
}

// Handle write requests when offline
async function handleWriteRequest(request) {
  try {
    // Try network first
    return await fetch(request);
  } catch (error) {
    console.log('Write request failed, storing for background sync:', request.url);
    
    // Store request for background sync
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: Date.now()
    };
    
    // Store in IndexedDB for background sync
    await storeOfflineRequest(requestData);
    
    // Return a success response to avoid UI errors
    return new Response(JSON.stringify({ 
      success: true, 
      offline: true,
      message: 'Your action will be synced when you\'re back online'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync event
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-requests') {
    event.waitUntil(syncOfflineRequests());
  }
});

// Store offline request in IndexedDB
async function storeOfflineRequest(requestData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SurnaOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['offline-requests'], 'readwrite');
      const store = transaction.objectStore('offline-requests');
      
      store.add(requestData);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offline-requests')) {
        const store = db.createObjectStore('offline-requests', { keyPath: 'timestamp' });
        store.createIndex('url', 'url', { unique: false });
      }
    };
  });
}

// Sync offline requests when back online
async function syncOfflineRequests() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SurnaOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const db = request.result;
      const transaction = db.transaction(['offline-requests'], 'readwrite');
      const store = transaction.objectStore('offline-requests');
      
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = async () => {
        const offlineRequests = getAllRequest.result;
        
        console.log(`Syncing ${offlineRequests.length} offline requests`);
        
        for (const requestData of offlineRequests) {
          try {
            const response = await fetch(requestData.url, {
              method: requestData.method,
              headers: requestData.headers,
              body: requestData.body
            });
            
            if (response.ok) {
              // Remove successfully synced request
              store.delete(requestData.timestamp);
              console.log('Synced offline request:', requestData.url);
              
              // Notify clients about successful sync
              self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                  client.postMessage({
                    type: 'SYNC_SUCCESS',
                    url: requestData.url
                  });
                });
              });
            }
          } catch (error) {
            console.error('Failed to sync request:', requestData.url, error);
          }
        }
        
        resolve();
      };
    };
  });
}

// Message event - handle commands from the app
self.addEventListener('message', event => {
  const { data } = event;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_POSTS':
      cachePosts(data.posts);
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
  }
});

// Cache posts for offline access
async function cachePosts(posts) {
  const cache = await caches.open(API_CACHE);
  
  for (const post of posts) {
    const request = new Request(`/api/posts/${post.id}`);
    const response = new Response(JSON.stringify(post), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put(request, response);
  }
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('All caches cleared');
}

// Get cache status
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

// Push notification event
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const { data } = event.notification;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Try to focus existing window
      for (let client of clientList) {
        if (client.url === data.url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(data.url || '/');
      }
    })
  );
});

console.log('Service Worker loaded');
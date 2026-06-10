// Service Worker registration utility
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

/** Dev: unregister SW + clear caches so stale offline shells don't block localhost */
export async function clearDevServiceWorkers() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    console.log("SW: cleared for local development");
  } catch (e) {
    console.warn("SW: dev cleanup failed", e);
  }
}

export function registerSW(config?: Config) {
  if (import.meta.env.DEV) {
    void clearDevServiceWorkers();
    return;
  }

  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(import.meta.env.BASE_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('SW: App is being served from cache by a service worker');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('SW: Registration successful');
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('SW: New content available; please refresh');
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              console.log('SW: Content cached for offline use');
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('SW: Registration failed:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('SW: No internet connection found. App is running in offline mode.');
    });
}

export function unregisterSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// PWA Install prompt
export function initializePWAInstall() {
  let deferredPrompt: any;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA: Install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button or notification
    const installEvent = new CustomEvent('pwa-install-available', {
      detail: { prompt: deferredPrompt }
    });
    window.dispatchEvent(installEvent);
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA: App installed successfully');
    deferredPrompt = null;
    
    // Track installation
    if ('gtag' in window) {
      (window as any).gtag('event', 'pwa_install', {
        event_category: 'engagement',
        event_label: 'PWA Installation'
      });
    }
  });

  // Return function to trigger install
  return {
    showInstallPrompt: () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('PWA: User accepted the install prompt');
          } else {
            console.log('PWA: User dismissed the install prompt');
          }
          deferredPrompt = null;
        });
      }
    }
  };
}

// Initialize offline storage
export async function initializeOfflineStorage() {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.log('Not in browser environment, skipping offline storage');
      return null;
    }

    const { offlineStorage } = await import('./offlineStorage');
    await offlineStorage.init();
    console.log('Offline storage initialized successfully');
    return offlineStorage;
  } catch (error) {
    // Log the actual error details but don't crash the app
    console.warn('Failed to initialize offline storage, continuing without offline capabilities:', error);
    return null;
  }
}

// Check for app updates
export function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
    });
  }
}
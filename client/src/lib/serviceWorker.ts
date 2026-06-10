// Service Worker registration and management for offline capabilities
const isProduction = import.meta.env.PROD;
const swUrl = '/sw.js';

interface SwRegistration {
  registration: ServiceWorkerRegistration | null;
  isOffline: boolean;
  updateAvailable: boolean;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private callbacks: {
    onOffline: (() => void)[];
    onOnline: (() => void)[];
    onUpdate: (() => void)[];
  } = {
    onOffline: [],
    onOnline: [],
    onUpdate: []
  };

  async register(): Promise<SwRegistration> {
    if (!('serviceWorker' in navigator) || !isProduction) {
      console.log('Service Worker not supported or in development mode');
      return { registration: null, isOffline: false, updateAvailable: false };
    }

    try {
      this.registration = await navigator.serviceWorker.register(swUrl);
      console.log('✅ Service Worker registered successfully');

      this.setupEventListeners();
      this.checkForUpdates();

      return {
        registration: this.registration,
        isOffline: !navigator.onLine,
        updateAvailable: false
      };
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return { registration: null, isOffline: false, updateAvailable: false };
    }
  }

  private setupEventListeners() {
    if (!this.registration) return;

    // Listen for service worker updates
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 New service worker available');
            this.callbacks.onUpdate.forEach(callback => callback());
          }
        });
      }
    });

    // Listen for network status changes
    window.addEventListener('online', () => {
      console.log('📶 Back online');
      this.callbacks.onOnline.forEach(callback => callback());
    });

    window.addEventListener('offline', () => {
      console.log('📱 Gone offline');
      this.callbacks.onOffline.forEach(callback => callback());
    });

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CACHE_UPDATED') {
        console.log('💾 Cache updated:', event.data.url);
      }
    });
  }

  private checkForUpdates() {
    if (!this.registration) return;

    // Check for updates every 30 minutes
    setInterval(() => {
      this.registration!.update();
    }, 30 * 60 * 1000);
  }

  async updateServiceWorker() {
    if (!this.registration || !this.registration.waiting) return;

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }

  onOffline(callback: () => void) {
    this.callbacks.onOffline.push(callback);
  }

  onOnline(callback: () => void) {
    this.callbacks.onOnline.push(callback);
  }

  onUpdate(callback: () => void) {
    this.callbacks.onUpdate.push(callback);
  }

  async preloadCriticalResources() {
    if (!this.registration) return;

    const criticalUrls = [
      '/',
      '/api/auth/user',
      '/api/posts',
      '/api/teams',
      '/api/events'
    ];

    // Send URLs to service worker for caching
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({
        type: 'PRELOAD_URLS',
        urls: criticalUrls
      });
    });
  }

  isOffline(): boolean {
    return !navigator.onLine;
  }
}

export const swManager = new ServiceWorkerManager();

import { useState, useEffect } from 'react';

export function useServiceWorker() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    swManager.register().then(result => {
      setIsOffline(result.isOffline);
      setUpdateAvailable(result.updateAvailable);
    });

    swManager.onOffline(() => setIsOffline(true));
    swManager.onOnline(() => setIsOffline(false));
    swManager.onUpdate(() => setUpdateAvailable(true));

    // Preload critical resources after registration
    setTimeout(() => {
      swManager.preloadCriticalResources();
    }, 2000);
  }, []);

  const updateApp = () => {
    swManager.updateServiceWorker();
  };

  return {
    isOffline,
    updateAvailable,
    updateApp
  };
}

export default swManager;
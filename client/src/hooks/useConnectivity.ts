import { useState, useEffect } from 'react';

export interface ConnectivityState {
  isOnline: boolean;
  isSlowConnection: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  offlineActions: number;
  lastSyncTime: Date | null;
}

export function useConnectivity() {
  const [state, setState] = useState<ConnectivityState>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    syncStatus: 'idle',
    offlineActions: 0,
    lastSyncTime: null
  });

  useEffect(() => {
    // Check connection speed
    const checkConnectionSpeed = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const isSlowConnection = 
            connection.effectiveType === '2g' || 
            connection.effectiveType === 'slow-2g' ||
            (connection.downlink && connection.downlink < 1);
          
          setState(prev => ({ ...prev, isSlowConnection }));
        }
      }
    };

    // Listen for online/offline events
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      checkConnectionSpeed();
      // Trigger sync when coming back online
      triggerBackgroundSync();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false, isSlowConnection: false }));
    };

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { data } = event;
      
      switch (data.type) {
        case 'SYNC_START':
          setState(prev => ({ ...prev, syncStatus: 'syncing' }));
          break;
          
        case 'SYNC_SUCCESS':
          setState(prev => ({ 
            ...prev, 
            syncStatus: 'synced',
            lastSyncTime: new Date(),
            offlineActions: Math.max(0, prev.offlineActions - 1)
          }));
          
          // Reset to idle after a delay
          setTimeout(() => {
            setState(prev => ({ ...prev, syncStatus: 'idle' }));
          }, 3000);
          break;
          
        case 'SYNC_ERROR':
          setState(prev => ({ ...prev, syncStatus: 'error' }));
          
          // Reset to idle after a delay
          setTimeout(() => {
            setState(prev => ({ ...prev, syncStatus: 'idle' }));
          }, 5000);
          break;
          
        case 'OFFLINE_ACTION':
          setState(prev => ({ ...prev, offlineActions: prev.offlineActions + 1 }));
          break;
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    // Check connection speed on mount
    checkConnectionSpeed();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const triggerBackgroundSync = () => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        const syncRegistration = registration as any;
        return syncRegistration.sync.register('sync-offline-requests');
      }).catch(err => {
        console.error('Background sync registration failed:', err);
      });
    }
  };

  const clearOfflineData = async () => {
    try {
      // Clear service worker caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Clear IndexedDB
      const { offlineStorage } = await import('../lib/offlineStorage');
      await offlineStorage.clearAllData();
      
      setState(prev => ({ 
        ...prev, 
        offlineActions: 0,
        lastSyncTime: null,
        syncStatus: 'idle'
      }));
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  };

  const getOfflineDataSize = async () => {
    try {
      const { offlineStorage } = await import('../lib/offlineStorage');
      return await offlineStorage.getDatabaseSize();
    } catch (error) {
      console.error('Failed to get offline data size:', error);
      return {};
    }
  };

  return {
    ...state,
    triggerBackgroundSync,
    clearOfflineData,
    getOfflineDataSize
  };
}
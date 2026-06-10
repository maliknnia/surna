// ServiceWorkerProvider - Register and manage service worker
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ServiceWorkerContextType {
  isSupported: boolean;
  isRegistered: boolean;
  needsUpdate: boolean;
  updateServiceWorker: () => void;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType | undefined>(undefined);

interface ServiceWorkerProviderProps {
  children: ReactNode;
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isSupported] = useState('serviceWorker' in navigator);
  const [isRegistered, setIsRegistered] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isSupported) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        setIsRegistered(true);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNeedsUpdate(true);
                setWaitingWorker(newWorker);
                
                toast({
                  title: "App Update Available",
                  description: "A new version is ready. Click to update.",
                  variant: "default",
                  action: (
                    <button
                      onClick={updateServiceWorker}
                      className="bg-transparent border border-border text-token-text px-4 py-2 rounded-md text-sm hover:bg-background"
                    >
                      Update
                    </button>
                  )
                });
              }
            });
          }
        });

        // Listen for controller change (after skip waiting)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerServiceWorker();
  }, [isSupported, toast]);

  const updateServiceWorker = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setNeedsUpdate(false);
    }
  };

  const value: ServiceWorkerContextType = {
    isSupported,
    isRegistered,
    needsUpdate,
    updateServiceWorker
  };

  return (
    <ServiceWorkerContext.Provider value={value}>
      {children}
    </ServiceWorkerContext.Provider>
  );
}

export function useServiceWorker() {
  const context = useContext(ServiceWorkerContext);
  if (context === undefined) {
    throw new Error('useServiceWorker must be used within a ServiceWorkerProvider');
  }
  return context;
}
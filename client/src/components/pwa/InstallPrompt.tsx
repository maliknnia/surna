import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, X, Smartphone, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InstallPromptProps {
  onDismiss?: () => void;
}

export function InstallPrompt({ onDismiss }: InstallPromptProps) {
  const hasMeaningfulAction = localStorage.getItem("surna_meaningful_action_done") === "1";
  const wasDismissed = localStorage.getItem("pwa-install-dismissed") === "1";
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem("pwa-install-dismissed", "1");
      toast({
        title: "App installed!",
        description: "Surna has been added to your device. You can now use it like a native app!",
        duration: 5000,
      });
    };

    // Listen for the PWA install event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Custom event for PWA install availability
    const handlePWAInstallAvailable = (event: any) => {
      setDeferredPrompt(event.detail.prompt);
      setShowPrompt(true);
    };

    window.addEventListener('pwa-install-available', handlePWAInstallAvailable);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-install-available', handlePWAInstallAvailable);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    
    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        toast({
          title: "Installing...",
          description: "Surna is being installed on your device",
        });
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Install prompt failed:', error);
      toast({
        title: "Installation failed",
        description: "There was an error installing the app. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
    localStorage.setItem("pwa-install-dismissed", "1");
  };

  // Only show after at least one meaningful action and never again after dismiss
  if (!hasMeaningfulAction || wasDismissed) {
    return null;
  }

  // Don't show if not available or already installed
  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  // Check if running in standalone mode (already installed)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 shadow-lg border-2 border-primary/20" data-testid="pwa-install-prompt">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isMobile ? (
              <Smartphone className="w-5 h-5 text-primary" />
            ) : (
              <Monitor className="w-5 h-5 text-primary" />
            )}
            <CardTitle className="text-lg">Install Surna</CardTitle>
            <Badge variant="secondary" className="text-xs">PWA</Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDismiss}
            data-testid="button-dismiss-install"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <CardDescription className="mb-4">
          Get the full app experience! Install Surna for faster access, offline support, and native app features.
        </CardDescription>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-token-text rounded-full"></div>
              <span>Offline access</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-token-text rounded-full"></div>
              <span>Faster loading</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-token-text rounded-full"></div>
              <span>Push notifications</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-token-text rounded-full"></div>
              <span>Native feel</span>
            </div>
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button 
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex-1"
              data-testid="button-install-app"
            >
              {isInstalling ? (
                <>
                  <div className="w-4 h-4 animate-spin   rounded-full mr-2" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              data-testid="button-maybe-later"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to manage install prompt state
export function useInstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  };

  return {
    isInstallable,
    promptInstall,
    isInstalled: window.matchMedia('(display-mode: standalone)').matches
  };
}
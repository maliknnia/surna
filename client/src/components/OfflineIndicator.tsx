// OfflineIndicator - Show offline status and sync progress
import { useOfflineSupport } from '@/hooks/useOfflineSupport';
import { useAuth } from '@/hooks/useAuth';
import { Wifi, WifiOff, Clock, CheckCircle } from 'lucide-react';

export function OfflineIndicator() {
  const { user } = useAuth();
  const { isOnline, queuedActions } = useOfflineSupport(user?.id);

  if (isOnline && queuedActions === 0) {
    return null; // Don't show anything when online and no pending actions
  }

  return (
    <div className={`fixed top-16 right-4 z-50 px-3 py-2 rounded-lg shadow-lg transition-all duration-300 ${
      isOnline 
        ? 'bg-card border border-border text-foreground' 
        : 'bg-card border border-border text-foreground'
    }`}>
      <div className="flex items-center gap-2 text-sm">
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        
        <span className="font-medium">
          {isOnline ? 'Syncing...' : 'Offline Mode'}
        </span>

        {queuedActions > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs">
              {queuedActions} pending
            </span>
          </div>
        )}

        {isOnline && queuedActions === 0 && (
          <CheckCircle className="w-4 h-4 text-token-text" />
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CloudOff, 
  Cloud, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  Database
} from "lucide-react";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ConnectivityIndicator() {
  const { 
    isOnline, 
    isSlowConnection, 
    syncStatus, 
    offlineActions, 
    lastSyncTime,
    triggerBackgroundSync,
    clearOfflineData,
    getOfflineDataSize
  } = useConnectivity();
  
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);
  const [dataSize, setDataSize] = useState<{ [key: string]: number }>({});
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (showDetails) {
      getOfflineDataSize().then(setDataSize);
    }
  }, [showDetails, getOfflineDataSize]);

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearOfflineData();
      toast({
        title: "Offline data cleared",
        description: "All cached data has been removed",
      });
      setDataSize({});
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear offline data",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleManualSync = () => {
    if (isOnline) {
      triggerBackgroundSync();
      toast({
        title: "Sync triggered",
        description: "Syncing your offline actions...",
      });
    } else {
      toast({
        title: "Cannot sync",
        description: "Please connect to the internet to sync",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4" />;
    }
    
    if (isSlowConnection) {
      return <AlertCircle className="w-4 h-4 text-[#efe7e9]" />;
    }
    
    switch (syncStatus) {
      case 'syncing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'synced':
        return <CheckCircle className="w-4 h-4 text-[#efe7e9]" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-[#efe7e9]" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }
    
    if (isSlowConnection) {
      return 'Slow connection';
    }
    
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'Synced';
      case 'error':
        return 'Sync failed';
      default:
        return 'Online';
    }
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (!isOnline) return 'destructive';
    if (isSlowConnection) return 'outline';
    if (syncStatus === 'error') return 'destructive';
    if (syncStatus === 'synced') return 'default';
    return 'secondary';
  };

  const totalDataItems = Object.values(dataSize).reduce((sum, count) => sum + count, 0);

  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative"
          data-testid="connectivity-indicator"
        >
          {getStatusIcon()}
          {offlineActions > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 w-5 h-5 p-0 text-xs flex items-center justify-center"
            >
              {offlineActions}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="font-medium">{getStatusText()}</span>
            </div>
            <Badge variant={getStatusVariant()} data-testid="connectivity-status">
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {/* Connection Details */}
          {isOnline && (
            <div className="text-sm text-muted-foreground">
              {isSlowConnection && (
                <div className="flex items-center space-x-2 text-[#efe7e9]">
                  <AlertCircle className="w-4 h-4" />
                  <span>Slow connection detected</span>
                </div>
              )}
              {lastSyncTime && (
                <div>Last sync: {lastSyncTime.toLocaleTimeString()}</div>
              )}
            </div>
          )}

          {/* Offline Actions */}
          {offlineActions > 0 && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CloudOff className="w-4 h-4" />
                    <span className="text-sm">Pending actions</span>
                  </div>
                  <Badge variant="outline">{offlineActions}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Actions will sync when back online
                </p>
              </CardContent>
            </Card>
          )}

          {/* Offline Data Info */}
          {totalDataItems > 0 && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span className="text-sm">Cached data</span>
                  </div>
                  <Badge variant="outline">{totalDataItems} items</Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {Object.entries(dataSize).map(([store, count]) => (
                    count > 0 && (
                      <div key={store} className="flex justify-between">
                        <span className="capitalize">{store}</span>
                        <span>{count}</span>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {isOnline && offlineActions > 0 && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={handleManualSync}
                data-testid="button-manual-sync"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
            )}
            
            {totalDataItems > 0 && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={handleClearData}
                disabled={isClearing}
                data-testid="button-clear-cache"
              >
                {isClearing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Clear Cache
              </Button>
            )}
          </div>

          {/* Offline Features */}
          {!isOnline && (
            <Card>
              <CardContent className="p-3">
                <h4 className="text-sm font-medium mb-2">Available Offline:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• View cached posts and events</li>
                  <li>• Read previous messages</li>
                  <li>• Browse team information</li>
                  <li>• Create content (syncs later)</li>
                  <li>• Access your profile</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Floating toast-style indicator for important connectivity changes
export function ConnectivityToast() {
  const { isOnline, syncStatus } = useConnectivity();
  const { toast } = useToast();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline && !wasOffline) {
      setWasOffline(true);
      toast({
        title: "You're offline",
        description: "Don't worry! You can still use many features and your actions will sync when you're back online.",
        duration: 5000,
      });
    } else if (isOnline && wasOffline) {
      setWasOffline(false);
      toast({
        title: "Back online!",
        description: "Syncing your offline actions...",
        duration: 3000,
      });
    }
  }, [isOnline, wasOffline, toast]);

  useEffect(() => {
    if (syncStatus === 'synced') {
      toast({
        title: "Sync complete",
        description: "All your offline actions have been synced.",
        duration: 3000,
      });
    } else if (syncStatus === 'error') {
      toast({
        title: "Sync failed",
        description: "Some actions couldn't be synced. They'll retry automatically.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [syncStatus, toast]);

  return null; // This component only manages toast notifications
}
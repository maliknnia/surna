// useOfflineSupport Hook - Manage offline functionality
import { useState, useEffect, useCallback } from 'react';
import { OfflineService } from '@/services/offlineService';
import { useToast } from '@/hooks/use-toast';

interface UseOfflineSupportReturn {
  isOnline: boolean;
  queuedActions: number;
  saveDraft: (type: 'post' | 'message' | 'comment', content: string, metadata?: any) => Promise<void>;
  getDrafts: (type?: string) => Promise<any[]>;
  deleteDraft: (id: number) => Promise<void>;
  clearDrafts: () => Promise<void>;
  syncOfflineData: () => Promise<void>;
}

export function useOfflineSupport(userId?: string): UseOfflineSupportReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedActions, setQueuedActions] = useState(0);
  const { toast } = useToast();

  // Monitor network status
  useEffect(() => {
    const cleanup = OfflineService.onNetworkChange((online) => {
      setIsOnline(online);
      
      if (online) {
        toast({
          title: "Back Online",
          description: "Syncing your offline actions...",
          variant: "default",
        });
        syncOfflineData();
      } else {
        toast({
          title: "You're Offline",
          description: "Your actions will be saved and synced when you're back online.",
          variant: "destructive",
        });
      }
    });

    return cleanup;
  }, [toast]);

  // Update queued actions count
  useEffect(() => {
    const updateQueuedActions = async () => {
      const actions = await OfflineService.getQueuedActions();
      setQueuedActions(actions.length);
    };

    updateQueuedActions();
    const interval = setInterval(updateQueuedActions, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const saveDraft = useCallback(async (type: 'post' | 'message' | 'comment', content: string, metadata?: any) => {
    if (!userId) return;
    
    try {
      await OfflineService.saveDraft(userId, type, content, metadata);
      toast({
        title: "Draft Saved",
        description: "Your content has been saved locally.",
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast({
        title: "Failed to Save Draft",
        description: "There was an error saving your content.",
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  const getDrafts = useCallback(async (type?: string) => {
    if (!userId) return [];
    
    try {
      return await OfflineService.getDrafts(userId, type);
    } catch (error) {
      console.error('Failed to get drafts:', error);
      return [];
    }
  }, [userId]);

  const deleteDraft = useCallback(async (id: number) => {
    try {
      await OfflineService.deleteDraft(id);
      toast({
        title: "Draft Deleted",
        description: "Your draft has been removed.",
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to delete draft:', error);
      toast({
        title: "Failed to Delete Draft",
        description: "There was an error deleting your draft.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const clearDrafts = useCallback(async () => {
    if (!userId) return;
    
    try {
      await OfflineService.clearDrafts(userId);
      toast({
        title: "Drafts Cleared",
        description: "All your drafts have been removed.",
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to clear drafts:', error);
      toast({
        title: "Failed to Clear Drafts",
        description: "There was an error clearing your drafts.",
        variant: "destructive",
      });
    }
  }, [userId, toast]);

  const syncOfflineData = useCallback(async () => {
    try {
      await OfflineService.syncWhenOnline();
      const actions = await OfflineService.getQueuedActions();
      setQueuedActions(actions.length);
      
      if (actions.length === 0) {
        toast({
          title: "Sync Complete",
          description: "All your offline actions have been synced.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Failed to sync offline data:', error);
      toast({
        title: "Sync Failed",
        description: "Some actions couldn't be synced. We'll retry automatically.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    isOnline,
    queuedActions,
    saveDraft,
    getDrafts,
    deleteDraft,
    clearDrafts,
    syncOfflineData
  };
}
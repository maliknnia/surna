import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/lib/offlineStorage';
import { apiRequest } from '@/lib/queryClient';
import { useConnectivity } from './useConnectivity';

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'post' | 'event' | 'message' | 'team' | 'rsvp';
  data: any;
  timestamp: number;
  endpoint: string;
  method: string;
}

export function useOfflineSync() {
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOnline } = useConnectivity();

  // Load pending actions from storage
  useEffect(() => {
    loadPendingActions();
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      syncPendingActions();
    }
  }, [isOnline, pendingActions.length]);

  const loadPendingActions = async () => {
    try {
      await offlineStorage.init();
      const requests = await offlineStorage.getOfflineRequests();
      
      const actions: OfflineAction[] = requests.map(req => ({
        id: req.timestamp.toString(),
        type: getActionType(req.method, req.url),
        entity: getEntityType(req.url),
        data: req.body ? JSON.parse(req.body) : null,
        timestamp: req.timestamp,
        endpoint: req.url,
        method: req.method
      }));
      
      setPendingActions(actions);
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  };

  const addOfflineAction = async (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const fullAction: OfflineAction = {
      ...action,
      id: Date.now().toString(),
      timestamp: Date.now()
    };

    try {
      // Store in IndexedDB
      await offlineStorage.storeOfflineRequest({
        url: action.endpoint,
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data),
        timestamp: fullAction.timestamp
      });

      setPendingActions(prev => [...prev, fullAction]);
      
      // If online, try to sync immediately
      if (isOnline) {
        syncSingleAction(fullAction);
      }
    } catch (error) {
      console.error('Failed to store offline action:', error);
      throw error;
    }
  };

  const syncPendingActions = async () => {
    if (!isOnline || isSyncing || pendingActions.length === 0) {
      return;
    }

    setIsSyncing(true);
    
    try {
      const successes: string[] = [];
      const failures: OfflineAction[] = [];

      for (const action of pendingActions) {
        try {
          await syncSingleAction(action);
          successes.push(action.id);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          failures.push(action);
        }
      }

      // Remove successful actions
      for (const actionId of successes) {
        const action = pendingActions.find(a => a.id === actionId);
        if (action) {
          await offlineStorage.removeOfflineRequest(action.timestamp);
        }
      }

      setPendingActions(failures);
      
      // Notify about sync results
      if (successes.length > 0) {
        console.log(`Synced ${successes.length} offline actions`);
      }
      
      if (failures.length > 0) {
        console.warn(`Failed to sync ${failures.length} actions`);
      }
    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncSingleAction = async (action: OfflineAction) => {
    try {
      const response = await apiRequest(
        action.method as any,
        action.endpoint,
        action.data
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  const removeAction = async (actionId: string) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (action) {
      try {
        await offlineStorage.removeOfflineRequest(action.timestamp);
        setPendingActions(prev => prev.filter(a => a.id !== actionId));
      } catch (error) {
        console.error('Failed to remove offline action:', error);
      }
    }
  };

  const clearAllActions = async () => {
    try {
      for (const action of pendingActions) {
        await offlineStorage.removeOfflineRequest(action.timestamp);
      }
      setPendingActions([]);
    } catch (error) {
      console.error('Failed to clear offline actions:', error);
    }
  };

  // Helper functions
  const getActionType = (method: string, url: string): OfflineAction['type'] => {
    if (method === 'POST') return 'create';
    if (method === 'PUT' || method === 'PATCH') return 'update';
    if (method === 'DELETE') return 'delete';
    return 'create';
  };

  const getEntityType = (url: string): OfflineAction['entity'] => {
    if (url.includes('/posts')) return 'post';
    if (url.includes('/events')) return 'event';
    if (url.includes('/messages')) return 'message';
    if (url.includes('/teams')) return 'team';
    if (url.includes('/rsvp')) return 'rsvp';
    return 'post';
  };

  // Offline-first CRUD operations
  const createOffline = useCallback(async (
    entity: OfflineAction['entity'],
    data: any,
    endpoint: string
  ) => {
    if (isOnline) {
      // Try online first
      try {
        const response = await apiRequest('POST', endpoint, data);
        return await response.json();
      } catch (error) {
        // Fall back to offline if network fails
        console.warn('Online create failed, storing offline:', error);
      }
    }

    // Store offline
    const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offlineData = { ...data, id: offlineId, isOffline: true };

    // Store in local cache
    switch (entity) {
      case 'post':
        await offlineStorage.store('posts', offlineData);
        break;
      case 'event':
        await offlineStorage.store('events', offlineData);
        break;
      case 'message':
        await offlineStorage.store('messages', offlineData);
        break;
      case 'team':
        await offlineStorage.store('teams', offlineData);
        break;
    }

    // Queue for sync
    await addOfflineAction({
      type: 'create',
      entity,
      data,
      endpoint,
      method: 'POST'
    });

    return offlineData;
  }, [isOnline, addOfflineAction]);

  const updateOffline = useCallback(async (
    entity: OfflineAction['entity'],
    id: string,
    data: any,
    endpoint: string
  ) => {
    if (isOnline) {
      try {
        const response = await apiRequest('PUT', endpoint, data);
        return await response.json();
      } catch (error) {
        console.warn('Online update failed, storing offline:', error);
      }
    }

    // Update local cache
    const updatedData = { ...data, id, updatedAt: new Date().toISOString() };
    
    switch (entity) {
      case 'post':
        await offlineStorage.store('posts', updatedData);
        break;
      case 'event':
        await offlineStorage.store('events', updatedData);
        break;
      case 'message':
        await offlineStorage.store('messages', updatedData);
        break;
      case 'team':
        await offlineStorage.store('teams', updatedData);
        break;
    }

    // Queue for sync
    await addOfflineAction({
      type: 'update',
      entity,
      data,
      endpoint,
      method: 'PUT'
    });

    return updatedData;
  }, [isOnline, addOfflineAction]);

  const deleteOffline = useCallback(async (
    entity: OfflineAction['entity'],
    id: string,
    endpoint: string
  ) => {
    if (isOnline) {
      try {
        const response = await apiRequest('DELETE', endpoint);
        return await response.json();
      } catch (error) {
        console.warn('Online delete failed, storing offline:', error);
      }
    }

    // Mark as deleted in local cache
    const deletedData = { id, deletedAt: new Date().toISOString(), isDeleted: true };
    
    switch (entity) {
      case 'post':
        await offlineStorage.store('posts', deletedData);
        break;
      case 'event':
        await offlineStorage.store('events', deletedData);
        break;
      case 'message':
        await offlineStorage.store('messages', deletedData);
        break;
      case 'team':
        await offlineStorage.store('teams', deletedData);
        break;
    }

    // Queue for sync
    await addOfflineAction({
      type: 'delete',
      entity,
      data: { id },
      endpoint,
      method: 'DELETE'
    });

    return { success: true };
  }, [isOnline, addOfflineAction]);

  return {
    pendingActions,
    isSyncing,
    syncPendingActions,
    removeAction,
    clearAllActions,
    createOffline,
    updateOffline,
    deleteOffline,
    addOfflineAction
  };
}
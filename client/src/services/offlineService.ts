// Offline Service - IndexedDB and Background Sync Management
import Dexie, { Table } from 'dexie';

export interface OfflineDraft {
  id?: number;
  userId: string;
  type: 'post' | 'message' | 'comment';
  content: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfflineAction {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  retry_count: number;
  created_at: Date;
}

export interface CachedUserData {
  id?: number;
  userId: string;
  profile: any;
  posts: any[];
  lastSync: Date;
}

class OfflineDatabase extends Dexie {
  drafts!: Table<OfflineDraft>;
  actions!: Table<OfflineAction>;
  cachedUsers!: Table<CachedUserData>;

  constructor() {
    super('SurnaOfflineDB');
    
    this.version(1).stores({
      drafts: '++id, userId, type, createdAt',
      actions: '++id, url, method, created_at',
      cachedUsers: '++id, userId, lastSync'
    });
  }
}

export const offlineDB = new OfflineDatabase();

export class OfflineService {
  // Draft Management
  static async saveDraft(userId: string, type: 'post' | 'message' | 'comment', content: string, metadata?: any): Promise<number> {
    const draft: OfflineDraft = {
      userId,
      type,
      content,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return await offlineDB.drafts.add(draft);
  }

  static async getDrafts(userId: string, type?: string): Promise<OfflineDraft[]> {
    let query = offlineDB.drafts.where('userId').equals(userId);
    
    if (type) {
      query = query.and(draft => draft.type === type);
    }
    
    return await query.reverse().sortBy('updatedAt');
  }

  static async updateDraft(id: number, content: string, metadata?: any): Promise<void> {
    await offlineDB.drafts.update(id, {
      content,
      metadata,
      updatedAt: new Date()
    });
  }

  static async deleteDraft(id: number): Promise<void> {
    await offlineDB.drafts.delete(id);
  }

  static async clearDrafts(userId: string): Promise<void> {
    await offlineDB.drafts.where('userId').equals(userId).delete();
  }

  // Offline Action Queue
  static async queueAction(url: string, method: string, headers: Record<string, string>, body?: string): Promise<void> {
    const action: OfflineAction = {
      url,
      method,
      headers,
      body,
      retry_count: 0,
      created_at: new Date()
    };
    
    await offlineDB.actions.add(action);
    
    // Register background sync if service worker is available
    if ('serviceWorker' in navigator && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register('offline-actions');
      }
    }
  }

  static async getQueuedActions(): Promise<OfflineAction[]> {
    return await offlineDB.actions.orderBy('created_at').toArray();
  }

  static async removeAction(id: number): Promise<void> {
    await offlineDB.actions.delete(id);
  }

  static async clearActions(): Promise<void> {
    await offlineDB.actions.clear();
  }

  // User Data Caching
  static async cacheUserData(userId: string, profile: any, posts: any[]): Promise<void> {
    const cachedData: CachedUserData = {
      userId,
      profile,
      posts,
      lastSync: new Date()
    };
    
    await offlineDB.cachedUsers.put(cachedData);
  }

  static async getCachedUserData(userId: string): Promise<CachedUserData | undefined> {
    return await offlineDB.cachedUsers.where('userId').equals(userId).first();
  }

  static async clearCachedData(userId: string): Promise<void> {
    await offlineDB.cachedUsers.where('userId').equals(userId).delete();
  }

  // Network Status
  static isOnline(): boolean {
    return navigator.onLine;
  }

  static onNetworkChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  // Sync Management
  static async syncWhenOnline(): Promise<void> {
    if (!this.isOnline()) return;
    
    const actions = await this.getQueuedActions();
    
    for (const action of actions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        if (response.ok) {
          await this.removeAction(action.id!);
        } else {
          // Update retry count
          await offlineDB.actions.update(action.id!, {
            retry_count: action.retry_count + 1
          });
        }
      } catch (error) {
        console.error('Failed to sync action:', error);
        await offlineDB.actions.update(action.id!, {
          retry_count: action.retry_count + 1
        });
      }
    }
  }
}

// Auto-sync when coming back online
window.addEventListener('online', () => {
  OfflineService.syncWhenOnline();
});
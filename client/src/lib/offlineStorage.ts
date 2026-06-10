// IndexedDB wrapper for offline data storage
export class OfflineStorage {
  private dbName = 'SurnaOfflineDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      console.warn('IndexedDB is not available in this browser');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = (event) => {
          console.error('IndexedDB error:', event);
          reject(new Error(`IndexedDB error: ${request.error?.message || 'Unknown error'}`));
        };

        request.onsuccess = () => {
          this.db = request.result;
          console.log('IndexedDB opened successfully');
          resolve();
        };

        request.onupgradeneeded = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;
            console.log('IndexedDB upgrade needed, creating object stores');
            this.createObjectStores(db);
          } catch (error) {
            console.error('Error creating object stores:', error);
            reject(error);
          }
        };

        request.onblocked = () => {
          console.warn('IndexedDB upgrade blocked by another tab');
        };
      } catch (error) {
        console.error('Error opening IndexedDB:', error);
        reject(error);
      }
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    // Posts store
    if (!db.objectStoreNames.contains('posts')) {
      const postsStore = db.createObjectStore('posts', { keyPath: 'id' });
      postsStore.createIndex('authorId', 'authorId', { unique: false });
      postsStore.createIndex('createdAt', 'createdAt', { unique: false });
      postsStore.createIndex('sport', 'sport', { unique: false });
    }

    // Events store
    if (!db.objectStoreNames.contains('events')) {
      const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
      eventsStore.createIndex('organizerId', 'organizerId', { unique: false });
      eventsStore.createIndex('startDate', 'startDate', { unique: false });
      eventsStore.createIndex('sport', 'sport', { unique: false });
      eventsStore.createIndex('location', 'location', { unique: false });
    }

    // Teams store
    if (!db.objectStoreNames.contains('teams')) {
      const teamsStore = db.createObjectStore('teams', { keyPath: 'id' });
      teamsStore.createIndex('captainId', 'captainId', { unique: false });
      teamsStore.createIndex('sport', 'sport', { unique: false });
      teamsStore.createIndex('location', 'location', { unique: false });
    }

    // Messages store
    if (!db.objectStoreNames.contains('messages')) {
      const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
      messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
      messagesStore.createIndex('senderId', 'senderId', { unique: false });
      messagesStore.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // Conversations store
    if (!db.objectStoreNames.contains('conversations')) {
      const conversationsStore = db.createObjectStore('conversations', { keyPath: 'id' });
      conversationsStore.createIndex('participants', 'participants', { unique: false, multiEntry: true });
      conversationsStore.createIndex('lastMessageAt', 'lastMessageAt', { unique: false });
    }

    // User profiles store
    if (!db.objectStoreNames.contains('users')) {
      const usersStore = db.createObjectStore('users', { keyPath: 'id' });
      usersStore.createIndex('email', 'email', { unique: false });
      usersStore.createIndex('location', 'location', { unique: false });
    }

    // Offline requests store
    if (!db.objectStoreNames.contains('offline-requests')) {
      const requestsStore = db.createObjectStore('offline-requests', { keyPath: 'timestamp' });
      requestsStore.createIndex('url', 'url', { unique: false });
      requestsStore.createIndex('method', 'method', { unique: false });
    }

    // Cache metadata store
    if (!db.objectStoreNames.contains('cache-metadata')) {
      const metadataStore = db.createObjectStore('cache-metadata', { keyPath: 'key' });
      metadataStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
    }
  }

  // Generic methods for CRUD operations
  async store<T>(storeName: string, data: T): Promise<void> {
    return this.performTransaction(storeName, 'readwrite', (store) => {
      store.put(data);
    });
  }

  async storeMultiple<T>(storeName: string, items: T[]): Promise<void> {
    return this.performTransaction(storeName, 'readwrite', (store) => {
      items.forEach(item => store.put(item));
    });
  }

  async get<T>(storeName: string, key: string | number): Promise<T | undefined> {
    return this.performTransaction(storeName, 'readonly', (store) => {
      return store.get(key);
    });
  }

  async getAll<T>(storeName: string, limit?: number): Promise<T[]> {
    return this.performTransaction(storeName, 'readonly', (store) => {
      const request = limit ? store.getAll(undefined, limit) : store.getAll();
      return request;
    });
  }

  async getByIndex<T>(storeName: string, indexName: string, value: any, limit?: number): Promise<T[]> {
    return this.performTransaction(storeName, 'readonly', (store) => {
      const index = store.index(indexName);
      const request = limit ? index.getAll(value, limit) : index.getAll(value);
      return request;
    });
  }

  async delete(storeName: string, key: string | number): Promise<void> {
    return this.performTransaction(storeName, 'readwrite', (store) => {
      store.delete(key);
    });
  }

  async clear(storeName: string): Promise<void> {
    return this.performTransaction(storeName, 'readwrite', (store) => {
      store.clear();
    });
  }

  private async performTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T> | void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction aborted'));

      const result = operation(store);
      
      if (result) {
        result.onsuccess = () => resolve(result.result);
        result.onerror = () => reject(result.error);
      } else {
        transaction.oncomplete = () => resolve(undefined as T);
      }
    });
  }

  // Specific methods for common operations
  async storePosts(posts: any[]): Promise<void> {
    await this.storeMultiple('posts', posts);
    await this.updateCacheMetadata('posts', posts.length);
  }

  async getRecentPosts(limit = 50): Promise<any[]> {
    return this.performTransaction('posts', 'readonly', (store) => {
      const index = store.index('createdAt');
      return index.getAll(IDBKeyRange.lowerBound(0), limit);
    });
  }

  async storeEvents(events: any[]): Promise<void> {
    await this.storeMultiple('events', events);
    await this.updateCacheMetadata('events', events.length);
  }

  async getUpcomingEvents(limit = 20): Promise<any[]> {
    const now = new Date();
    return this.performTransaction('events', 'readonly', (store) => {
      const index = store.index('startDate');
      return index.getAll(IDBKeyRange.lowerBound(now), limit);
    });
  }

  async storeMessages(messages: any[]): Promise<void> {
    await this.storeMultiple('messages', messages);
    await this.updateCacheMetadata('messages', messages.length);
  }

  async getConversationMessages(conversationId: string): Promise<any[]> {
    return this.getByIndex('messages', 'conversationId', conversationId);
  }

  async storeConversations(conversations: any[]): Promise<void> {
    await this.storeMultiple('conversations', conversations);
    await this.updateCacheMetadata('conversations', conversations.length);
  }

  async getUserConversations(userId: string): Promise<any[]> {
    return this.getByIndex('conversations', 'participants', userId);
  }

  async storeUsers(users: any[]): Promise<void> {
    await this.storeMultiple('users', users);
    await this.updateCacheMetadata('users', users.length);
  }

  async getUser(userId: string): Promise<any> {
    return this.get('users', userId);
  }

  async storeTeams(teams: any[]): Promise<void> {
    await this.storeMultiple('teams', teams);
    await this.updateCacheMetadata('teams', teams.length);
  }

  async getUserTeams(userId: string): Promise<any[]> {
    return this.getByIndex('teams', 'captainId', userId);
  }

  // Offline request management
  async storeOfflineRequest(request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
    timestamp: number;
  }): Promise<void> {
    await this.store('offline-requests', request);
  }

  async getOfflineRequests(): Promise<any[]> {
    return this.getAll('offline-requests');
  }

  async removeOfflineRequest(timestamp: number): Promise<void> {
    await this.delete('offline-requests', timestamp);
  }

  // Cache metadata management
  private async updateCacheMetadata(key: string, count: number): Promise<void> {
    const metadata = {
      key,
      lastUpdated: new Date(),
      itemCount: count
    };
    await this.store('cache-metadata', metadata);
  }

  async getCacheMetadata(key: string): Promise<any> {
    return this.get('cache-metadata', key);
  }

  async getAllCacheMetadata(): Promise<any[]> {
    return this.getAll('cache-metadata');
  }

  // Search functionality
  async searchPosts(query: string, limit = 20): Promise<any[]> {
    const posts = await this.getRecentPosts(100);
    const lowercaseQuery = query.toLowerCase();
    
    return posts
      .filter(post => 
        post.content?.toLowerCase().includes(lowercaseQuery) ||
        post.sport?.toLowerCase().includes(lowercaseQuery)
      )
      .slice(0, limit);
  }

  async searchEvents(query: string, limit = 10): Promise<any[]> {
    const events = await this.getUpcomingEvents(50);
    const lowercaseQuery = query.toLowerCase();
    
    return events
      .filter(event =>
        event.title?.toLowerCase().includes(lowercaseQuery) ||
        event.description?.toLowerCase().includes(lowercaseQuery) ||
        event.sport?.toLowerCase().includes(lowercaseQuery) ||
        event.location?.toLowerCase().includes(lowercaseQuery)
      )
      .slice(0, limit);
  }

  // Database management
  async getDatabaseSize(): Promise<{ [storeName: string]: number }> {
    const metadata = await this.getAllCacheMetadata();
    const sizes: { [storeName: string]: number } = {};
    
    metadata.forEach(meta => {
      sizes[meta.key] = meta.itemCount || 0;
    });
    
    return sizes;
  }

  async clearAllData(): Promise<void> {
    const stores = ['posts', 'events', 'teams', 'messages', 'conversations', 'users', 'offline-requests', 'cache-metadata'];
    
    for (const store of stores) {
      await this.clear(store);
    }
  }

  async exportData(): Promise<{ [storeName: string]: any[] }> {
    const stores = ['posts', 'events', 'teams', 'messages', 'conversations', 'users'];
    const exportData: { [storeName: string]: any[] } = {};
    
    for (const store of stores) {
      exportData[store] = await this.getAll(store);
    }
    
    return exportData;
  }
}

// Global instance
export const offlineStorage = new OfflineStorage();
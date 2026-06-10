/**
 * Feed Feature Module
 * 
 * Public API for the feed feature. All imports from outside 
 * this feature should go through this index file.
 */

// Re-export the main page for backward compatibility
export { default as FeedPage } from '@/pages/Feed';

// API functions
export { feedApi } from './api';

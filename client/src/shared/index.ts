/**
 * Shared Module Index
 * 
 * Central export point for all shared modules:
 * - config: Design system tokens, constants
 * - ui: Reusable UI components
 * - hooks: Shared hooks
 * - lib: Shared utilities
 */

export * from './config/design-system';
// UI components have their own export to avoid circular deps
// import from '@/shared/ui' directly

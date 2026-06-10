/**
 * Shared Library
 * 
 * Re-export shared utilities and helpers.
 */

export { apiRequest, queryClient } from '@/lib/queryClient';
export { cn } from '@/lib/utils';
export { toISO, startOfTodayISO, endOfWeekISO, fmtRange } from '@/lib/dates';
export { calculateDistance } from '@/lib/geo';

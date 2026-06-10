// Screen Reader Only component for accessible content
import React from "react";
import { cn } from "@/lib/utils";

interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  className?: string;
  // Whether to show on focus (for skip links)
  showOnFocus?: boolean;
  // ARIA live region for announcements
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
}

export const ScreenReaderOnly: React.FC<ScreenReaderOnlyProps> = ({
  children,
  className,
  showOnFocus = false,
  'aria-live': ariaLive,
  'aria-atomic': ariaAtomic,
}) => {
  return (
    <span
      className={cn(
        "sr-only",
        showOnFocus && "focus:not-sr-only focus:absolute focus:z-50 focus:px-2 focus:py-1 focus:bg-primary focus:text-primary-foreground focus:rounded",
        className
      )}
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
    >
      {children}
    </span>
  );
};

// Live region for screen reader announcements
export const LiveRegion: React.FC<{
  children: React.ReactNode;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}> = ({ 
  children, 
  priority = 'polite', 
  atomic = true,
  className 
}) => {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      className={cn("sr-only", className)}
      data-testid="live-region"
    >
      {children}
    </div>
  );
};

// Status announcements for form submissions, etc.
export const StatusAnnouncement: React.FC<{
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  visible?: boolean;
}> = ({ message, type, visible = false }) => {
  const priority = type === 'error' ? 'assertive' : 'polite';
  
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={cn(
        visible ? "block" : "sr-only",
        type === 'error' && "text-destructive",
        type === 'success' && "text-[#efe7e9]",
        type === 'warning' && "text-[#efe7e9]",
        type === 'info' && "text-[#efe7e9]"
      )}
      data-testid={`status-${type}`}
    >
      {message}
    </div>
  );
};
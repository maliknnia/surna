// Responsive breakpoint management for accessibility
import React, { useState, useEffect } from "react";
import { useAccessibility } from "./AccessibilityProvider";

export interface BreakpointValues {
  xs: boolean;  // < 640px
  sm: boolean;  // >= 640px
  md: boolean;  // >= 768px
  lg: boolean;  // >= 1024px
  xl: boolean;  // >= 1280px
  '2xl': boolean; // >= 1536px
}

export const useResponsiveBreakpoints = (): BreakpointValues => {
  const [breakpoints, setBreakpoints] = useState<BreakpointValues>({
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    '2xl': false,
  });

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth;
      
      setBreakpoints({
        xs: width < 640,
        sm: width >= 640 && width < 768,
        md: width >= 768 && width < 1024,
        lg: width >= 1024 && width < 1280,
        xl: width >= 1280 && width < 1536,
        '2xl': width >= 1536,
      });
    };

    // Initial check
    updateBreakpoints();

    // Add event listener
    window.addEventListener('resize', updateBreakpoints);

    // Cleanup
    return () => window.removeEventListener('resize', updateBreakpoints);
  }, []);

  return breakpoints;
};

// Component to conditionally render based on breakpoints
export const ResponsiveContainer: React.FC<{
  children: React.ReactNode;
  breakpoint?: keyof BreakpointValues;
  direction?: 'up' | 'down' | 'only';
  className?: string;
}> = ({ 
  children, 
  breakpoint = 'md', 
  direction = 'up',
  className 
}) => {
  const breakpoints = useResponsiveBreakpoints();
  const { settings } = useAccessibility();

  const shouldRender = () => {
    const width = window.innerWidth;
    
    switch (direction) {
      case 'up':
        // Show on this breakpoint and larger
        switch (breakpoint) {
          case 'xs': return width >= 0;
          case 'sm': return width >= 640;
          case 'md': return width >= 768;
          case 'lg': return width >= 1024;
          case 'xl': return width >= 1280;
          case '2xl': return width >= 1536;
          default: return true;
        }
      case 'down':
        // Show on this breakpoint and smaller
        switch (breakpoint) {
          case 'xs': return width < 640;
          case 'sm': return width < 768;
          case 'md': return width < 1024;
          case 'lg': return width < 1280;
          case 'xl': return width < 1536;
          case '2xl': return true;
          default: return true;
        }
      case 'only':
        // Show only on this breakpoint
        return breakpoints[breakpoint];
      default:
        return true;
    }
  };

  if (!shouldRender()) {
    return null;
  }

  return (
    <div 
      className={className}
      style={{
        // Apply larger touch targets on mobile if enabled
        ...(settings.largerTouchTargets && breakpoints.xs && {
          fontSize: '1.1rem'
        })
      }}
      data-testid="responsive-container"
    >
      {children}
    </div>
  );
};

// Hook for touch-friendly interactions
export const useTouchOptimization = () => {
  const breakpoints = useResponsiveBreakpoints();
  const { settings } = useAccessibility();

  const isTouchDevice = breakpoints.xs || breakpoints.sm;
  const shouldOptimize = isTouchDevice || settings.largerTouchTargets;

  return {
    isTouchDevice,
    shouldOptimize,
    touchTargetSize: shouldOptimize ? 48 : 32,
    spacing: shouldOptimize ? 'lg' : 'md',
  };
};

// Accessible mobile menu wrapper
export const AccessibleMobileMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ isOpen, onClose, children, className }) => {
  const { announce } = useAccessibility();

  useEffect(() => {
    if (isOpen) {
      // Prevent body scrolling when menu is open
      document.body.style.overflow = 'hidden';
      announce('Mobile menu opened', 'polite');
      
      // Focus trap is handled by FocusManager
    } else {
      document.body.style.overflow = '';
      announce('Mobile menu closed', 'polite');
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, announce]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/50 z-40"
        onClick={onClose}
        aria-hidden="true"
        data-testid="mobile-menu-backdrop"
      />
      
      {/* Menu content */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-background border-l shadow-xl ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        data-testid="mobile-menu-content"
      >
        {children}
      </div>
    </>
  );
};
// Focus Management component for enhanced keyboard navigation
import React, { useEffect, useRef, useCallback } from "react";
import { KeyboardNav } from "@/lib/accessibility";

interface FocusManagerProps {
  children: React.ReactNode;
  // Auto-focus first element on mount
  autoFocus?: boolean;
  // Trap focus within this component
  trapFocus?: boolean;
  // Restore focus when component unmounts
  restoreFocus?: boolean;
  // Custom focus restoration target
  restoreTo?: React.RefObject<HTMLElement>;
  // Skip focus management
  disabled?: boolean;
  className?: string;
}

export const FocusManager: React.FC<FocusManagerProps> = ({
  children,
  autoFocus = false,
  trapFocus = false,
  restoreFocus = false,
  restoreTo,
  disabled = false,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (disabled) return;

    // Store previously focused element
    if (restoreFocus) {
      previouslyFocused.current = document.activeElement as HTMLElement;
    }

    // Auto-focus first focusable element
    if (autoFocus && containerRef.current) {
      const focusableElements = KeyboardNav.getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    // Set up focus trap
    let releaseFocusTrap: (() => void) | undefined;
    if (trapFocus && containerRef.current) {
      releaseFocusTrap = KeyboardNav.trapFocus(containerRef.current);
    }

    return () => {
      // Release focus trap
      if (releaseFocusTrap) {
        releaseFocusTrap();
      }

      // Restore focus
      if (restoreFocus) {
        const target = restoreTo?.current || previouslyFocused.current;
        if (target && document.contains(target)) {
          target.focus();
        }
      }
    };
  }, [autoFocus, trapFocus, restoreFocus, restoreTo, disabled]);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      data-focus-scope="true"
      data-testid="focus-manager"
    >
      {children}
    </div>
  );
};

// Hook for focus management
export const useFocusManager = () => {
  const containerRef = useRef<HTMLElement>(null);

  const focusFirst = useCallback(() => {
    if (containerRef.current) {
      const focusableElements = KeyboardNav.getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, []);

  const focusLast = useCallback(() => {
    if (containerRef.current) {
      const focusableElements = KeyboardNav.getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        focusableElements[focusableElements.length - 1].focus();
      }
    }
  }, []);

  const focusNext = useCallback(() => {
    if (containerRef.current && document.activeElement) {
      const focusableElements = KeyboardNav.getFocusableElements(containerRef.current);
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
        focusableElements[currentIndex + 1].focus();
      }
    }
  }, []);

  const focusPrevious = useCallback(() => {
    if (containerRef.current && document.activeElement) {
      const focusableElements = KeyboardNav.getFocusableElements(containerRef.current);
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      if (currentIndex > 0) {
        focusableElements[currentIndex - 1].focus();
      }
    }
  }, []);

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious
  };
};

// Roving tabindex implementation for complex widgets
export const RovingTabindex: React.FC<{
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
  className?: string;
}> = ({ 
  children, 
  orientation = 'both',
  wrap = true,
  className 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const focusableElements = KeyboardNav.getFocusableElements(container);
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      
      if (currentIndex === -1) return;

      let nextIndex = -1;
      const lastIndex = focusableElements.length - 1;

      switch (event.key) {
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            event.preventDefault();
            nextIndex = currentIndex === lastIndex 
              ? (wrap ? 0 : lastIndex) 
              : currentIndex + 1;
          }
          break;
          
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            event.preventDefault();
            nextIndex = currentIndex === 0 
              ? (wrap ? lastIndex : 0) 
              : currentIndex - 1;
          }
          break;
          
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            event.preventDefault();
            nextIndex = currentIndex === lastIndex 
              ? (wrap ? 0 : lastIndex) 
              : currentIndex + 1;
          }
          break;
          
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            event.preventDefault();
            nextIndex = currentIndex === 0 
              ? (wrap ? lastIndex : 0) 
              : currentIndex - 1;
          }
          break;
          
        case 'Home':
          event.preventDefault();
          nextIndex = 0;
          break;
          
        case 'End':
          event.preventDefault();
          nextIndex = lastIndex;
          break;
      }

      if (nextIndex !== -1) {
        focusableElements[nextIndex].focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [orientation, wrap]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="group"
      data-testid="roving-tabindex"
    >
      {children}
    </div>
  );
};
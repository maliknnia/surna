// Stage 21: Comprehensive Accessibility & Inclusive Design System
// Core accessibility utilities and helpers for WCAG 2.1 compliance

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * WCAG Color Contrast Utilities
 */
export class ColorContrast {
  // Convert hex to RGB
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Calculate relative luminance
  static getLuminance(r: number, g: number, b: number): number {
    const toSrgb = (color: number) => {
      const c = color / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toSrgb(r) + 0.7152 * toSrgb(g) + 0.0722 * toSrgb(b);
  }

  // Calculate contrast ratio between two colors
  static getContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 1;
    
    const lum1 = this.getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = this.getLuminance(rgb2.r, rgb2.g, rgb2.b);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }

  // Check if contrast meets WCAG standards
  static meetsWCAG(foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): {
    normal: boolean;
    large: boolean;
    ratio: number;
  } {
    const ratio = this.getContrastRatio(foreground, background);
    const thresholds = level === 'AAA' ? { normal: 7, large: 4.5 } : { normal: 4.5, large: 3 };
    
    return {
      normal: ratio >= thresholds.normal,
      large: ratio >= thresholds.large,
      ratio
    };
  }
}

/**
 * Screen Reader Utilities
 */
export class ScreenReader {
  // Announce text to screen readers
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }

  // Create visually hidden but screen reader accessible text
  static createSROnlyElement(text: string): HTMLElement {
    const element = document.createElement('span');
    element.className = 'sr-only';
    element.textContent = text;
    return element;
  }
}

/**
 * Keyboard Navigation Utilities
 */
export class KeyboardNav {
  // Focus trap for modals and overlays
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }

  // Get all focusable elements within a container
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector));
  }
}

/**
 * ARIA Utilities
 */
export class AriaUtils {
  // Generate unique IDs for ARIA relationships
  static generateId(prefix: string = 'aria'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set up ARIA describedby relationship
  static setDescribedBy(element: HTMLElement, descriptionId: string): void {
    const existing = element.getAttribute('aria-describedby');
    const ids = existing ? `${existing} ${descriptionId}` : descriptionId;
    element.setAttribute('aria-describedby', ids);
  }

  // Set up ARIA labelledby relationship
  static setLabelledBy(element: HTMLElement, labelId: string): void {
    element.setAttribute('aria-labelledby', labelId);
  }

  // Manage ARIA expanded state for collapsible elements
  static toggleExpanded(trigger: HTMLElement, isExpanded: boolean): void {
    trigger.setAttribute('aria-expanded', isExpanded.toString());
  }
}

/**
 * React Hooks for Accessibility
 */

// Hook for managing focus within a component
export function useFocusManagement() {
  const focusRef = useRef<HTMLElement>(null);
  
  const setFocus = useCallback(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, []);

  const moveFocus = useCallback((direction: 'next' | 'previous') => {
    if (!focusRef.current) return;
    
    const focusableElements = KeyboardNav.getFocusableElements(
      focusRef.current.closest('[data-focus-scope]') || document.body
    );
    
    const currentIndex = focusableElements.indexOf(focusRef.current);
    const nextIndex = direction === 'next' 
      ? (currentIndex + 1) % focusableElements.length
      : (currentIndex - 1 + focusableElements.length) % focusableElements.length;
    
    focusableElements[nextIndex]?.focus();
  }, []);

  return { focusRef, setFocus, moveFocus };
}

// Hook for screen reader announcements
export function useScreenReader() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    ScreenReader.announce(message, priority);
  }, []);

  return { announce };
}

// Hook for ARIA live regions
export function useAriaLive() {
  const liveRef = useRef<HTMLDivElement>(null);

  const announceToLiveRegion = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRef.current) {
      liveRef.current.setAttribute('aria-live', priority);
      liveRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (liveRef.current) {
          liveRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return { liveRef, announceToLiveRegion };
}

// Hook for keyboard navigation
export function useKeyboardNavigation(
  onArrowKey?: (direction: 'up' | 'down' | 'left' | 'right') => void,
  onEnter?: () => void,
  onEscape?: () => void
) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        onArrowKey?.('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        onArrowKey?.('down');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        onArrowKey?.('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        onArrowKey?.('right');
        break;
      case 'Enter':
        event.preventDefault();
        onEnter?.();
        break;
      case 'Escape':
        event.preventDefault();
        onEscape?.();
        break;
    }
  }, [onArrowKey, onEnter, onEscape]);

  return { handleKeyDown };
}

// Hook for reduced motion detection
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Touch Target Utilities for Mobile Accessibility
 */
export class TouchTarget {
  // Minimum touch target size (44px x 44px per WCAG)
  static readonly MIN_SIZE = 44;

  // Check if an element meets minimum touch target size
  static meetsMinimumSize(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width >= this.MIN_SIZE && rect.height >= this.MIN_SIZE;
  }

  // Get recommended spacing for touch targets
  static getRecommendedSpacing(): number {
    return 8; // 8px minimum spacing between targets
  }
}


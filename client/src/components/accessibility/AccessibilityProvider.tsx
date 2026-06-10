// Accessibility Context Provider for global accessibility state management
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useReducedMotion } from '@/lib/accessibility';

interface AccessibilitySettings {
  // Visual preferences
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  
  // Screen reader preferences
  announcements: boolean;
  verboseDescriptions: boolean;
  
  // Keyboard navigation
  showFocusIndicators: boolean;
  skipLinksEnabled: boolean;
  
  // Touch accessibility
  largerTouchTargets: boolean;
  
  // RTL support
  textDirection: 'ltr' | 'rtl';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  resetSettings: () => void;
  
  // Utilities
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  isReducedMotion: boolean;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  fontSize: 'medium',
  announcements: true,
  verboseDescriptions: false,
  showFocusIndicators: true,
  skipLinksEnabled: true,
  largerTouchTargets: false,
  textDirection: 'ltr',
};

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('accessibility-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const isReducedMotion = useReducedMotion();

  // Detect system preferences
  useEffect(() => {
    // Detect high contrast preference
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    if (highContrastQuery.matches) {
      setSettings(prev => ({ ...prev, highContrast: true }));
    }

    // Detect reduced motion preference
    if (isReducedMotion) {
      setSettings(prev => ({ ...prev, reducedMotion: true }));
    }

    // Detect RTL language
    const htmlLang = document.documentElement.lang;
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    if (rtlLanguages.some(lang => htmlLang.startsWith(lang))) {
      setSettings(prev => ({ ...prev, textDirection: 'rtl' }));
    }
  }, [isReducedMotion]);

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Apply high contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Apply font size
    body.classList.remove('text-sm', 'text-base', 'text-lg', 'text-xl');
    switch (settings.fontSize) {
      case 'small':
        body.classList.add('text-sm');
        break;
      case 'medium':
        body.classList.add('text-base');
        break;
      case 'large':
        body.classList.add('text-lg');
        break;
      case 'extra-large':
        body.classList.add('text-xl');
        break;
    }

    // Apply text direction
    root.setAttribute('dir', settings.textDirection);

    // Apply larger touch targets for mobile
    if (settings.largerTouchTargets) {
      body.classList.add('large-touch-targets');
    } else {
      body.classList.remove('large-touch-targets');
    }

    // Show/hide focus indicators
    if (!settings.showFocusIndicators) {
      root.classList.add('no-focus-indicators');
    } else {
      root.classList.remove('no-focus-indicators');
    }

    // Save settings to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('accessibility-settings');
  };

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!settings.announcements) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  const contextValue: AccessibilityContextType = {
    settings,
    updateSetting,
    resetSettings,
    announce,
    isReducedMotion,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Hook for individual setting access
export const useAccessibilitySetting = <K extends keyof AccessibilitySettings>(
  key: K
): [AccessibilitySettings[K], (value: AccessibilitySettings[K]) => void] => {
  const { settings, updateSetting } = useAccessibility();
  return [settings[key], (value) => updateSetting(key, value)];
};
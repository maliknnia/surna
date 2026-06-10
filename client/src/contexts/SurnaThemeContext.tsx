import React, { createContext, useContext, ReactNode } from 'react';

interface SurnaThemeContextType {
  isMainPage: boolean;
  setMainPageTheme: () => void;
  setLightPageTheme: () => void;
}

const SurnaThemeContext = createContext<SurnaThemeContextType | undefined>(undefined);

interface SurnaThemeProviderProps {
  children: ReactNode;
  isMainPage?: boolean;
}

export function SurnaThemeProvider({ children, isMainPage = false }: SurnaThemeProviderProps) {
  const setMainPageTheme = () => {
    document.documentElement.className = 'dark-theme';
  };

  const setLightPageTheme = () => {
    document.documentElement.className = 'light-theme';
  };

  // Apply theme on mount
  React.useEffect(() => {
    // Set default theme first to avoid flash
    document.documentElement.className = isMainPage ? 'dark-theme' : 'light-theme';
    
    if (isMainPage) {
      setMainPageTheme();
    } else {
      setLightPageTheme();
    }
  }, [isMainPage]);

  const value = {
    isMainPage,
    setMainPageTheme,
    setLightPageTheme,
  };

  return (
    <SurnaThemeContext.Provider value={value}>
      {children}
    </SurnaThemeContext.Provider>
  );
}

export function useSurnaTheme() {
  const context = useContext(SurnaThemeContext);
  if (context === undefined) {
    throw new Error('useSurnaTheme must be used within a SurnaThemeProvider');
  }
  return context;
}
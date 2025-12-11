import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

// Light theme colors
const lightTheme = {
  // Backgrounds
  background: '#F8FAFC',
  backgroundSecondary: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  
  // Text colors
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textMuted: '#94A3B8',
  textPlaceholder: '#CBD5E1',
  
  // Accent colors
  primary: '#8B5CF6',
  primaryLight: 'rgba(139, 92, 246, 0.1)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Borders and dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#CBD5E1',
  
  // Shadows
  shadowColor: '#000',
  shadowLight: 'rgba(0, 0, 0, 0.06)',
  shadowMedium: 'rgba(0, 0, 0, 0.1)',
  
  // Decorative elements
  decorative1: 'rgba(139, 92, 246, 0.05)',
  decorative2: 'rgba(168, 85, 247, 0.03)',
  
  // Status bar
  statusBarStyle: 'dark-content',
};

// Dark theme colors
const darkTheme = {
  // Backgrounds
  background: '#0F0F0F',
  backgroundSecondary: '#1A1A1A',
  surface: '#1F1F1F',
  surfaceSecondary: '#2A2A2A',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#E5E5E5',
  textTertiary: '#B3B3B3',
  textMuted: '#808080',
  textPlaceholder: '#666666',
  
  // Accent colors
  primary: '#BB86FC',
  primaryLight: 'rgba(187, 134, 252, 0.15)',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  
  // Borders and dividers
  border: '#333333',
  borderLight: '#404040',
  divider: '#404040',
  
  // Shadows
  shadowColor: '#000',
  shadowLight: 'rgba(0, 0, 0, 0.4)',
  shadowMedium: 'rgba(0, 0, 0, 0.6)',
  
  // Decorative elements
  decorative1: 'rgba(187, 134, 252, 0.08)',
  decorative2: 'rgba(187, 134, 252, 0.04)',
  
  // Status bar
  statusBarStyle: 'light-content',
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const prefersDark = systemColorScheme === 'dark';
  const [isDarkMode, setIsDarkMode] = useState(prefersDark);
  const [theme, setTheme] = useState(prefersDark ? darkTheme : lightTheme);
  const [isReady, setIsReady] = useState(false);

  // Hydrate theme from system color scheme and keep it in sync
  useEffect(() => {
    const newIsDarkMode = systemColorScheme === 'dark';
    setIsDarkMode(newIsDarkMode);
    setTheme(newIsDarkMode ? darkTheme : lightTheme);
    setIsReady(true);
  }, [systemColorScheme]);

  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    setTheme(newIsDarkMode ? darkTheme : lightTheme);
  };

  const value = {
    theme,
    isDarkMode,
    isLightMode: !isDarkMode,
    toggleTheme,
    colors: theme,
  };

  // Avoid flashing the wrong theme (e.g. light before dark) while hydrating
  if (!isReady) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { lightTheme, darkTheme };

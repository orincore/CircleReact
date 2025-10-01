import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

/**
 * Hook to get responsive dimensions for mobile browsers
 * Handles different screen sizes and orientations
 */
export function useResponsiveDimensions() {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return {
      width,
      height,
      isSmallScreen: width < 375, // iPhone SE, small phones
      isMediumScreen: width >= 375 && width < 414, // iPhone 12/13/14
      isLargeScreen: width >= 414, // iPhone Plus, large phones
      isLandscape: width > height,
      isBrowser: Platform.OS === 'web',
      // Responsive values
      horizontalPadding: width < 375 ? 16 : width < 414 ? 20 : 24,
      verticalPadding: width < 375 ? 16 : width < 414 ? 20 : 24,
      fontSize: {
        small: width < 375 ? 11 : 12,
        medium: width < 375 ? 13 : 14,
        large: width < 375 ? 15 : 16,
        xlarge: width < 375 ? 17 : 18,
        xxlarge: width < 375 ? 24 : 28,
      },
      spacing: {
        xs: width < 375 ? 4 : 6,
        sm: width < 375 ? 8 : 10,
        md: width < 375 ? 12 : 16,
        lg: width < 375 ? 16 : 20,
        xl: width < 375 ? 20 : 24,
      },
      avatarSize: width < 375 ? 48 : 56,
      buttonHeight: width < 375 ? 44 : 48,
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const { width, height } = window;
      setDimensions({
        width,
        height,
        isSmallScreen: width < 375,
        isMediumScreen: width >= 375 && width < 414,
        isLargeScreen: width >= 414,
        isLandscape: width > height,
        isBrowser: Platform.OS === 'web',
        horizontalPadding: width < 375 ? 16 : width < 414 ? 20 : 24,
        verticalPadding: width < 375 ? 16 : width < 414 ? 20 : 24,
        fontSize: {
          small: width < 375 ? 11 : 12,
          medium: width < 375 ? 13 : 14,
          large: width < 375 ? 15 : 16,
          xlarge: width < 375 ? 17 : 18,
          xxlarge: width < 375 ? 24 : 28,
        },
        spacing: {
          xs: width < 375 ? 4 : 6,
          sm: width < 375 ? 8 : 10,
          md: width < 375 ? 12 : 16,
          lg: width < 375 ? 16 : 20,
          xl: width < 375 ? 20 : 24,
        },
        avatarSize: width < 375 ? 48 : 56,
        buttonHeight: width < 375 ? 44 : 48,
      });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
}

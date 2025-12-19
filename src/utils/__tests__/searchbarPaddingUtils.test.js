import { getSearchbarPaddingConfig, isAccessiblePaddingConfig } from '../searchbarPaddingUtils';

describe('searchbarPaddingUtils', () => {
  describe('getSearchbarPaddingConfig', () => {
    describe('Android devices', () => {
      it('should return 8px padding for small Android devices (< 5 inches)', () => {
        // Small Android device: width < 400px (typically 4.0-4.7 inch phones)
        const config = getSearchbarPaddingConfig({
          screenWidth: 375,
          screenHeight: 667,
          platform: 'android',
        });

        expect(config.paddingVertical).toBe(8);
        expect(config.screenSize).toBe('small');
        expect(config.containerMinHeight).toBe(44);
      });

      it('should return 10px padding for medium Android devices (5-6 inches)', () => {
        // Medium Android device: width 400-500px (typically 5.0-5.5 inch phones)
        const config = getSearchbarPaddingConfig({
          screenWidth: 450,
          screenHeight: 800,
          platform: 'android',
        });

        expect(config.paddingVertical).toBe(10);
        expect(config.screenSize).toBe('medium');
        expect(config.containerMinHeight).toBe(44);
      });

      it('should return 10px padding for large Android devices (> 6 inches)', () => {
        // Large Android device: width >= 500px (typically 5.5+ inch phones)
        const config = getSearchbarPaddingConfig({
          screenWidth: 540,
          screenHeight: 960,
          platform: 'android',
        });

        expect(config.paddingVertical).toBe(10);
        expect(config.screenSize).toBe('large');
        expect(config.containerMinHeight).toBe(44);
      });

      it('should maintain 44px minimum touch target for all Android devices', () => {
        const testCases = [
          { width: 375, height: 667 }, // Small
          { width: 450, height: 800 }, // Medium
          { width: 540, height: 960 }, // Large
        ];

        testCases.forEach(({ width, height }) => {
          const config = getSearchbarPaddingConfig({
            screenWidth: width,
            screenHeight: height,
            platform: 'android',
          });

          expect(config.containerMinHeight).toBeGreaterThanOrEqual(44);
        });
      });
    });

    describe('iOS devices', () => {
      it('should return 16px padding for iOS devices', () => {
        const config = getSearchbarPaddingConfig({
          screenWidth: 390,
          screenHeight: 844,
          platform: 'ios',
        });

        expect(config.paddingVertical).toBe(16);
        expect(config.containerMinHeight).toBe(48);
      });

      it('should not be affected by screen size on iOS', () => {
        const smallConfig = getSearchbarPaddingConfig({
          screenWidth: 375,
          screenHeight: 667,
          platform: 'ios',
        });

        const largeConfig = getSearchbarPaddingConfig({
          screenWidth: 430,
          screenHeight: 932,
          platform: 'ios',
        });

        expect(smallConfig.paddingVertical).toBe(16);
        expect(largeConfig.paddingVertical).toBe(16);
      });
    });

    describe('Web platform', () => {
      it('should return 16px padding for web platform', () => {
        const config = getSearchbarPaddingConfig({
          screenWidth: 1920,
          screenHeight: 1080,
          platform: 'web',
        });

        expect(config.paddingVertical).toBe(16);
        expect(config.containerMinHeight).toBe(48);
      });
    });

    describe('Edge cases', () => {
      it('should handle boundary at 400px width (small to medium)', () => {
        // Exactly at boundary: 400px width
        const config = getSearchbarPaddingConfig({
          screenWidth: 400,
          screenHeight: 800,
          platform: 'android',
        });

        expect(config.paddingVertical).toBe(10);
        expect(config.screenSize).toBe('medium');
      });

      it('should handle boundary at 500px width (medium to large)', () => {
        // Exactly at boundary: 500px width
        const config = getSearchbarPaddingConfig({
          screenWidth: 500,
          screenHeight: 900,
          platform: 'android',
        });

        expect(config.paddingVertical).toBe(10);
        expect(config.screenSize).toBe('large');
      });

      it('should handle very small Android device (< 400px)', () => {
        // Very small: 360px width
        const config = getSearchbarPaddingConfig({
          screenWidth: 360,
          screenHeight: 640,
          platform: 'android',
        });

        expect(config.paddingVertical).toBe(8);
        expect(config.screenSize).toBe('small');
      });

      it('should handle very large Android device (> 500px)', () => {
        // Very large: 600px width
        const config = getSearchbarPaddingConfig({
          screenWidth: 600,
          screenHeight: 1000,
          platform: 'android',
        });

        expect(config.paddingVertical).toBe(10);
        expect(config.screenSize).toBe('large');
      });
    });
  });

  describe('isAccessiblePaddingConfig', () => {
    it('should return true for accessible Android config', () => {
      const config = getSearchbarPaddingConfig({
        screenWidth: 752,
        screenHeight: 1280,
        platform: 'android',
      });

      expect(isAccessiblePaddingConfig(config)).toBe(true);
    });

    it('should return true for accessible iOS config', () => {
      const config = getSearchbarPaddingConfig({
        screenWidth: 390,
        screenHeight: 844,
        platform: 'ios',
      });

      expect(isAccessiblePaddingConfig(config)).toBe(true);
    });

    it('should return false for null config', () => {
      expect(isAccessiblePaddingConfig(null)).toBe(false);
    });

    it('should return false for undefined config', () => {
      expect(isAccessiblePaddingConfig(undefined)).toBe(false);
    });

    it('should validate minimum touch target of 44px', () => {
      const config = {
        platform: 'android',
        containerMinHeight: 44,
      };

      expect(isAccessiblePaddingConfig(config)).toBe(true);
    });

    it('should fail for config below 44px minimum', () => {
      const config = {
        platform: 'android',
        containerMinHeight: 40,
      };

      expect(isAccessiblePaddingConfig(config)).toBe(false);
    });
  });
});

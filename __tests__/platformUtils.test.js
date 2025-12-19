/**
 * Property-based tests for platform utilities
 * 
 * **Feature: ios-liquid-glass-navbar**
 */

import fc from 'fast-check';
import { Platform } from 'react-native';

// Import the functions we're testing
import {
  getIOSVersion,
  isIOSWithLiquidGlass,
  shouldUseNativeTabBar,
  formatBadgeCount,
  decrementUnreadCount,
} from '../src/utils/platformUtils';

// Store original Platform values
const originalPlatform = { ...Platform };

// Helper to mock Platform
const mockPlatform = (os, version) => {
  Platform.OS = os;
  Platform.Version = version;
};

// Restore Platform after each test
afterEach(() => {
  Platform.OS = originalPlatform.OS;
  Platform.Version = originalPlatform.Version;
});

describe('platformUtils', () => {
  /**
   * **Feature: ios-liquid-glass-navbar, Property 4: iOS Version String Parsing**
   * **Validates: Requirements 3.1**
   * 
   * For any valid iOS version string, parsing should produce a comparable number
   */
  describe('Property 4: iOS Version String Parsing', () => {
    it('should parse any valid iOS version string to a major version number', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }), // major version
          fc.integer({ min: 0, max: 9 }),  // minor version
          fc.integer({ min: 0, max: 9 }),  // patch version
          (major, minor, patch) => {
            // Test string format "major.minor.patch"
            const versionString = `${major}.${minor}.${patch}`;
            mockPlatform('ios', versionString);
            
            const result = getIOSVersion();
            
            // The parsed version should equal the major version
            expect(result).toBe(major);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse any valid iOS version number directly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }),
          (major) => {
            mockPlatform('ios', major);
            
            const result = getIOSVersion();
            
            expect(result).toBe(major);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for non-iOS platforms', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('android', 'web', 'windows', 'macos'),
          fc.anything(),
          (platform, version) => {
            mockPlatform(platform, version);
            
            const result = getIOSVersion();
            
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ios-liquid-glass-navbar, Property 1: iOS Version-Based Tab Bar Selection**
   * **Validates: Requirements 1.1, 1.2**
   * 
   * For any iOS version number, the system should select the native tab bar
   * if and only if the version is 26 or greater
   */
  describe('Property 1: iOS Version-Based Tab Bar Selection', () => {
    it('should use native tab bar for iOS 26+', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 26, max: 50 }),
          (version) => {
            mockPlatform('ios', version);
            
            expect(isIOSWithLiquidGlass()).toBe(true);
            expect(shouldUseNativeTabBar()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use custom tab bar for iOS below 26', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 25 }),
          (version) => {
            mockPlatform('ios', version);
            
            expect(isIOSWithLiquidGlass()).toBe(false);
            expect(shouldUseNativeTabBar()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use custom tab bar for non-iOS platforms', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('android', 'web'),
          fc.integer({ min: 1, max: 50 }),
          (platform, version) => {
            mockPlatform(platform, version);
            
            expect(shouldUseNativeTabBar()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

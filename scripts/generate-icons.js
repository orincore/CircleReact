#!/usr/bin/env node

/**
 * Generate properly formatted Android adaptive icons with correct safe zones.
 * Requires: npm install sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICON_SIZE = 1080;
const PADDING_RATIO = 0.25; // 25% padding on each side = 50% total
const SAFE_ZONE_SIZE = Math.floor(ICON_SIZE * (1 - 2 * PADDING_RATIO));
const OFFSET = Math.floor(ICON_SIZE * PADDING_RATIO);

async function createAdaptiveIcon() {
  try {
    const assetsDir = path.join(__dirname, '..', 'assets', 'images');
    const sourceIcon = path.join(assetsDir, 'icon.png');
    const foregroundPath = path.join(assetsDir, 'android-icon-foreground.png');

    if (!fs.existsSync(sourceIcon)) {
      console.error(`✗ Source icon not found: ${sourceIcon}`);
      process.exit(1);
    }

    console.log('Generating Android adaptive icons...');
    console.log('='.repeat(50));

    // Create transparent background
    const transparentBg = Buffer.alloc(ICON_SIZE * ICON_SIZE * 4);

    // Resize source icon to fit in safe zone
    const resizedIcon = await sharp(sourceIcon)
      .resize(SAFE_ZONE_SIZE, SAFE_ZONE_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    // Create the adaptive icon by compositing
    await sharp({
      create: {
        width: ICON_SIZE,
        height: ICON_SIZE,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        {
          input: resizedIcon,
          top: OFFSET,
          left: OFFSET
        }
      ])
      .png()
      .toFile(foregroundPath);

    console.log(`✓ Created: ${foregroundPath}`);
    console.log(`  Size: ${ICON_SIZE}x${ICON_SIZE}`);
    console.log(`  Safe zone: ${SAFE_ZONE_SIZE}x${SAFE_ZONE_SIZE}`);
    console.log(`  Padding: ${OFFSET}px on each side`);
    console.log();

    // Create monochrome version
    const monochromeIcon = await sharp(sourceIcon)
      .resize(ICON_SIZE, ICON_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .modulate({
        saturation: 0 // Convert to grayscale
      })
      .png()
      .toBuffer();

    const monochromePath = path.join(assetsDir, 'android-icon-monochrome.png');
    await sharp(monochromeIcon)
      .toFile(monochromePath);

    console.log(`✓ Created monochrome: ${monochromePath}`);
    console.log();
    console.log('='.repeat(50));
    console.log('✓ Icon generation complete!');
    console.log();
    console.log('Next steps:');
    console.log('1. Rebuild the app: eas build --platform android');
    console.log('2. Test on Android device');
    console.log('3. Check app drawer - icon should display correctly');

  } catch (error) {
    console.error('✗ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Run if sharp is available
try {
  require.resolve('sharp');
  createAdaptiveIcon();
} catch (e) {
  console.error('✗ sharp is not installed');
  console.error('Install it with: npm install sharp');
  process.exit(1);
}

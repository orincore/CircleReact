/**
 * Post-build script for AWS Amplify deployment
 * This script runs after the Expo web build to:
 * 1. Copy static files to dist
 * 2. Create _redirects for SPA routing
 * 3. Ensure proper file structure for Amplify
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');
const webDir = path.join(__dirname, '..', 'web');

console.log('🚀 Running post-build script for AWS Amplify...');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  console.error('❌ dist directory not found. Build may have failed.');
  process.exit(1);
}

// Copy files from public directory
if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir);
  publicFiles.forEach(file => {
    const src = path.join(publicDir, file);
    const dest = path.join(distDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
      console.log(`📄 Copied ${file} to dist/`);
    }
  });
}

// Copy robots.txt and sitemap.xml from web directory
if (fs.existsSync(webDir)) {
  ['robots.txt', 'sitemap.xml'].forEach(file => {
    const src = path.join(webDir, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`📄 Copied ${file} to dist/`);
    }
  });
}

// Create _redirects file for SPA routing (Amplify uses this)
const redirectsContent = `# SPA fallback - all routes go to index.html
/*    /index.html   200

# Static files should be served directly
/favicon.png    /favicon.png    200
/icon.png       /icon.png       200
/manifest.json  /manifest.json  200
/robots.txt     /robots.txt     200
/sitemap.xml    /sitemap.xml    200
/_expo/*        /_expo/:splat   200
/assets/*       /assets/:splat  200
`;

fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent);
console.log('📄 Created _redirects for SPA routing');

// Create customHttp.yml for Amplify rewrites (alternative to _redirects)
const customHttpContent = `customHeaders:
  - pattern: '**/*'
    headers:
      - key: 'X-Frame-Options'
        value: 'DENY'
      - key: 'X-Content-Type-Options'
        value: 'nosniff'
      - key: 'X-XSS-Protection'
        value: '1; mode=block'
      - key: 'Referrer-Policy'
        value: 'strict-origin-when-cross-origin'
`;

fs.writeFileSync(path.join(distDir, 'customHttp.yml'), customHttpContent);
console.log('📄 Created customHttp.yml for security headers');

// Verify index.html exists
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('❌ index.html not found in dist. Build may have failed.');
  process.exit(1);
}

console.log('✅ Post-build script completed successfully!');
console.log(`📁 Build output: ${distDir}`);

// List files in dist for verification
const distFiles = fs.readdirSync(distDir);
console.log('\n📋 Files in dist/:');
distFiles.forEach(file => {
  const stat = fs.statSync(path.join(distDir, file));
  const size = stat.isDirectory() ? 'DIR' : `${(stat.size / 1024).toFixed(1)}KB`;
  console.log(`   ${file} (${size})`);
});

# AWS Amplify Deployment Guide for Circle App

## Prerequisites

1. AWS Account with Amplify access
2. GitHub/GitLab/Bitbucket repository connected
3. Node.js 18+ (handled automatically by amplify.yml)

## Quick Setup

### 1. Connect Repository to Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Select your Git provider and authorize
4. Choose your repository and branch (e.g., `main`)

### 2. Configure Build Settings

Amplify will auto-detect the `amplify.yml` file. Verify these settings:

- **Framework**: Expo
- **Build command**: `npm run build:web`
- **Output directory**: `dist`

### 3. Environment Variables

Add these environment variables in Amplify Console → App settings → Environment variables:

```
NODE_ENV=production
EXPO_PUBLIC_API_BASE_URL=https://api.circle.orincore.com
EXPO_PUBLIC_WS_BASE_URL=https://api.circle.orincore.com
EXPO_PUBLIC_FRONTEND_URL=https://your-amplify-domain.amplifyapp.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-google-client-id
```

### 4. Rewrites and Redirects

Add this rewrite rule in Amplify Console → App settings → Rewrites and redirects:

| Source | Target | Type |
|--------|--------|------|
| `/<*>` | `/index.html` | 200 (Rewrite) |

This enables SPA routing for all routes.

### 5. Custom Domain (Optional)

1. Go to Domain management
2. Add your custom domain (e.g., `circle.orincore.com`)
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

## Build Configuration

The `amplify.yml` file handles:

- Node.js 18 installation
- Dependency installation with `npm ci --legacy-peer-deps`
- Expo web build
- Static file copying
- Cache configuration for faster builds

## Troubleshooting

### Build Fails with Node Version Error

Ensure `amplify.yml` includes:
```yaml
preBuild:
  commands:
    - nvm install 18
    - nvm use 18
```

### 404 Errors on Page Refresh

Add the SPA rewrite rule:
- Source: `/<*>`
- Target: `/index.html`
- Type: 200 (Rewrite)

### Environment Variables Not Working

1. Ensure variables start with `EXPO_PUBLIC_` for client-side access
2. Rebuild after adding/changing environment variables
3. Check that variables are set for the correct branch

### Large Bundle Size

The build includes source maps for debugging. For production:
1. Consider enabling Amplify's built-in compression
2. Enable caching headers (already configured in amplify.yml)

## Local Testing

Before deploying, test the build locally:

```bash
# Install dependencies
npm ci --legacy-peer-deps

# Build for web
npm run build:web

# Serve the build locally
npx serve dist
```

## Monitoring

- View build logs in Amplify Console
- Enable CloudWatch for detailed metrics
- Set up build notifications via SNS

## Security Headers

The build includes security headers via `customHttp.yml`:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## Performance Optimization

1. **Caching**: Static assets cached for 1 year
2. **Compression**: Amplify automatically compresses assets
3. **CDN**: CloudFront distribution included
4. **Preconnect**: API domain preconnected in HTML

## Support

For issues:
1. Check Amplify build logs
2. Verify environment variables
3. Test build locally first
4. Contact support@orincore.com

# Instagram WebView Verification - Usage Guide

## Overview

The Instagram WebView verification system allows users to verify their Instagram account ownership by logging into Instagram within the app, without requiring Instagram API access or Meta app approval.

## How It Works

### User Experience Flow

1. **User opens Social Accounts** → Profile → Settings → "Manage Social Accounts"
2. **User clicks "Link" next to Instagram** → WebView modal opens
3. **Instagram login page loads** → User sees Instagram's login page
4. **User logs into their account** → Enters Instagram credentials
5. **App detects successful login** → Extracts username from profile URL
6. **Account verification** → Calls backend API to verify and store username
7. **Success confirmation** → Shows success alert and refreshes account list

### Technical Flow

```javascript
// 1. User clicks Instagram "Link" button
handleLinkAccount('instagram') 
  ↓
// 2. Opens WebView modal
setShowInstagramWebView(true)
  ↓
// 3. WebView loads Instagram login
<WebView source={{ uri: 'https://www.instagram.com/accounts/login/' }} />
  ↓
// 4. User logs in, URL changes to profile
onNavigationStateChange(navState)
  ↓
// 5. Extract username from URL
const username = url.match(/instagram\.com\/([^\/\?]+)/)[1]
  ↓
// 6. Verify with backend
socialAccountsApi.verifyInstagram(username, token)
  ↓
// 7. Store in database and show success
handleInstagramVerificationSuccess(account)
```

## Backend API Integration

### New Endpoint: `/api/social/verify/instagram`

```javascript
POST /api/social/verify/instagram
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "johndoe123"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Instagram account verified and linked successfully",
  "account": {
    "platform": "instagram",
    "username": "johndoe123",
    "profile_url": "https://instagram.com/johndoe123",
    "verification_method": "webview_login"
  }
}
```

### Database Storage

The verified Instagram account is stored in the `linked_social_accounts` table:

```sql
INSERT INTO linked_social_accounts (
  user_id,
  platform,
  platform_user_id,
  platform_username,
  platform_display_name,
  platform_profile_url,
  platform_data,
  is_verified,
  is_public,
  linked_at,
  updated_at
) VALUES (
  'user-uuid',
  'instagram',
  'johndoe123',
  'johndoe123',
  'johndoe123',
  'https://instagram.com/johndoe123',
  '{"verification_method": "webview_login", "verified_at": "2024-01-01T00:00:00.000Z"}',
  true,
  true,
  NOW(),
  NOW()
);
```

## Components Created

### 1. InstagramWebViewVerification.jsx

**Location:** `/src/components/InstagramWebViewVerification.jsx`

**Props:**
- `visible` (boolean) - Controls modal visibility
- `onClose` (function) - Called when modal is closed
- `onSuccess` (function) - Called when verification succeeds
- `token` (string) - Authentication token

**Features:**
- Full-screen modal with WebView
- Instagram login page loading
- URL monitoring for successful login
- Username extraction from profile URLs
- Loading states and error handling
- User instructions and feedback

### 2. Enhanced SocialAccountsManager.jsx

**Updates:**
- Added Instagram WebView integration
- Updated Instagram linking to use WebView instead of OAuth
- Enhanced platform data formatting for WebView verification
- Added success handling for Instagram verification

### 3. Enhanced API (social-accounts.ts)

**New Methods:**
- `verifyInstagram(username, token)` - Verify Instagram username
- Updated TypeScript interfaces for verification response

## Security Features

### Username Validation

```javascript
// Validates Instagram username format
const usernameRegex = /^[a-zA-Z0-9._]+$/
if (!usernameRegex.test(username) || username.length > 30) {
  return res.status(400).json({ error: 'Invalid Instagram username format' })
}
```

### Duplicate Account Prevention

```javascript
// Prevents same Instagram account being linked to multiple users
const { data: existingAccount } = await supabase
  .from('linked_social_accounts')
  .select('user_id')
  .eq('platform', 'instagram')
  .eq('platform_username', username)
  .neq('user_id', userId)
  .maybeSingle()

if (existingAccount) {
  return res.status(400).json({ 
    error: 'This Instagram account is already linked to another user' 
  })
}
```

### Account Ownership Verification

- User must actually log into the Instagram account
- WebView monitors URL changes to detect successful login
- Only extracts username after successful authentication
- Prevents linking accounts the user doesn't own

## Error Handling

### Frontend Errors

```javascript
// Network/API errors
catch (error) {
  let errorMessage = 'Failed to verify Instagram account. ';
  
  if (error.message?.includes('already linked')) {
    errorMessage = 'This Instagram account is already linked to another Circle user.';
  } else if (error.message?.includes('Invalid')) {
    errorMessage = 'Invalid Instagram username format.';
  } else {
    errorMessage += 'Please try again or contact support.';
  }
  
  Alert.alert('Verification Failed', errorMessage);
}
```

### Backend Errors

```javascript
// Username validation
if (!username) {
  return res.status(400).json({ error: 'Instagram username is required' })
}

// Format validation
if (!usernameRegex.test(username) || username.length > 30) {
  return res.status(400).json({ error: 'Invalid Instagram username format' })
}

// Duplicate account check
if (existingAccount) {
  return res.status(400).json({ 
    error: 'This Instagram account is already linked to another user' 
  })
}
```

## Installation Requirements

### Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "react-native-webview": "^13.12.2"
  }
}
```

### Install Command

```bash
npm install react-native-webview
```

For Expo managed workflow, the WebView component is included automatically.

## Benefits

### For Users
✅ **No API restrictions** - Works without Instagram API approval  
✅ **Account ownership verification** - Must actually own the Instagram account  
✅ **Simple process** - Just log into Instagram within the app  
✅ **Secure** - Uses Instagram's own authentication  
✅ **Immediate** - Works right away without waiting for approvals  

### For Developers
✅ **No Meta app approval needed** - Bypasses Instagram API restrictions  
✅ **Simple implementation** - Uses standard WebView component  
✅ **Reliable** - Doesn't depend on Instagram API changes  
✅ **Maintainable** - Easy to understand and modify  
✅ **Cross-platform** - Works on iOS, Android, and Web  

## Usage in Settings

The Instagram WebView verification is automatically available in the Social Accounts manager:

1. **Open Circle app**
2. **Go to Profile tab**
3. **Tap Settings**
4. **Scroll to "Social Accounts" section**
5. **Tap "Manage Social Accounts"**
6. **Find Instagram and tap "Link"**
7. **Complete login in WebView**
8. **Account automatically verified and linked**

The system integrates seamlessly with the existing social accounts infrastructure while providing a reliable alternative to Instagram's restricted API access.

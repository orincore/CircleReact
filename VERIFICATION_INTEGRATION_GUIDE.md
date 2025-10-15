# Face Verification Integration Guide

## ✅ Components Created

### 1. **VerificationContext** (`/contexts/VerificationContext.jsx`)
Global state management for verification status.

**Features:**
- Checks verification status on app load
- Provides verification state to all components
- Auto-refreshes when needed

**Usage:**
```jsx
import { useVerification } from '@/contexts/VerificationContext';

function MyComponent() {
  const { isVerified, needsVerification, loading } = useVerification();
  
  if (needsVerification) {
    return <Text>Please verify your account</Text>;
  }
  
  return <Text>You're verified!</Text>;
}
```

### 2. **VerificationBanner** (`/components/VerificationBanner.jsx`)
Non-intrusive banner shown at top of screens.

**Features:**
- Shows different states: Required, Pending, Rejected
- Dismissible
- Direct link to verification screen
- Beautiful gradient design

**Usage:**
```jsx
import VerificationBanner from '@/components/VerificationBanner';

export default function HomeScreen() {
  return (
    <View>
      <VerificationBanner />
      {/* Rest of your content */}
    </View>
  );
}
```

### 3. **VerificationGuard** (`/components/VerificationGuard.jsx`)
Blocks entire features until verified.

**Features:**
- Full-screen lock
- Shows benefits of verification
- Direct CTA to verify
- Loading state

**Usage:**
```jsx
import VerificationGuard from '@/components/VerificationGuard';

export default function MessagesScreen() {
  return (
    <VerificationGuard feature="messaging">
      {/* This content only shows if verified */}
      <MessageList />
    </VerificationGuard>
  );
}
```

### 4. **useRequireVerification Hook** (`/hooks/useRequireVerification.js`)
Auto-redirects to verification if not verified.

**Usage:**
```jsx
import { useRequireVerification } from '@/hooks/useRequireVerification';

export default function ProfileScreen() {
  const { canAccess, shouldBlock } = useRequireVerification();
  
  if (shouldBlock) {
    return <Text>Redirecting to verification...</Text>;
  }
  
  return <ProfileContent />;
}
```

## 📋 Implementation Steps

### Step 1: Add VerificationBanner to Main Screens

Add to each tab screen where you want to show the banner:

**`/app/secure/(tabs)/match.jsx`:**
```jsx
import VerificationBanner from '@/components/VerificationBanner';

export default function MatchScreen() {
  return (
    <View style={{ flex: 1 }}>
      <VerificationBanner />
      {/* Existing content */}
    </View>
  );
}
```

**`/app/secure/(tabs)/messages.jsx`:**
```jsx
import VerificationBanner from '@/components/VerificationBanner';

export default function MessagesScreen() {
  return (
    <View style={{ flex: 1 }}>
      <VerificationBanner />
      {/* Existing content */}
    </View>
  );
}
```

### Step 2: Lock Critical Features with VerificationGuard

Wrap features that require verification:

**Example: Lock Messaging**
```jsx
import VerificationGuard from '@/components/VerificationGuard';

export default function ChatScreen() {
  return (
    <VerificationGuard feature="messaging">
      <ChatInterface />
    </VerificationGuard>
  );
}
```

**Example: Lock Profile Viewing**
```jsx
import VerificationGuard from '@/components/VerificationGuard';

export default function UserProfileScreen() {
  return (
    <VerificationGuard feature="viewing profiles">
      <UserProfile />
    </VerificationGuard>
  );
}
```

**Example: Lock Matching**
```jsx
import VerificationGuard from '@/components/VerificationGuard';

export default function MatchScreen() {
  return (
    <View style={{ flex: 1 }}>
      <VerificationBanner />
      <VerificationGuard feature="matching">
        <MatchCards />
      </VerificationGuard>
    </View>
  );
}
```

### Step 3: Use Hook for Auto-Redirect

For screens that should auto-redirect:

```jsx
import { useRequireVerification } from '@/hooks/useRequireVerification';

export default function PremiumFeatureScreen() {
  useRequireVerification(); // Auto-redirects if not verified
  
  return <PremiumContent />;
}
```

## 🎨 UI States

### 1. **Not Verified (Default)**
- **Banner:** Purple gradient with "Verification Required"
- **Button:** "Verify Now"
- **Icon:** Shield checkmark

### 2. **Pending Review**
- **Banner:** Orange gradient with "Verification Pending"
- **No button** (can't retry while pending)
- **Icon:** Clock

### 3. **Rejected**
- **Banner:** Red gradient with "Verification Failed"
- **Button:** "Retry Verification"
- **Icon:** Close circle

### 4. **Verified**
- **No banner shown**
- **All features unlocked**

## 🔒 Features to Lock

### High Priority (Must Lock):
1. ✅ **Messaging** - Prevent spam/fake accounts
2. ✅ **Matching/Swiping** - Ensure real users
3. ✅ **Profile Viewing** - Protect user privacy
4. ✅ **Sending Friend Requests** - Prevent abuse

### Medium Priority (Recommended):
5. ⚠️ **Commenting** - Reduce fake engagement
6. ⚠️ **Liking Posts** - Prevent bot activity
7. ⚠️ **Creating Posts** - Ensure authentic content

### Low Priority (Optional):
8. 📝 **Viewing Feed** - Can allow for discovery
9. 📝 **Browsing Public Profiles** - Limited access OK
10. 📝 **Settings** - Should always be accessible

## 📱 Example Implementation

### Complete Match Screen Example:

```jsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import VerificationBanner from '@/components/VerificationBanner';
import VerificationGuard from '@/components/VerificationGuard';
import MatchCards from '@/components/MatchCards';

export default function MatchScreen() {
  return (
    <View style={styles.container}>
      {/* Show banner at top */}
      <VerificationBanner />
      
      {/* Lock the matching feature */}
      <VerificationGuard feature="matching and swiping">
        <MatchCards />
      </VerificationGuard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0b2e',
  },
});
```

### Complete Messages Screen Example:

```jsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import VerificationBanner from '@/components/VerificationBanner';
import VerificationGuard from '@/components/VerificationGuard';
import MessageList from '@/components/MessageList';

export default function MessagesScreen() {
  return (
    <View style={styles.container}>
      <VerificationBanner />
      
      <VerificationGuard feature="messaging">
        <MessageList />
      </VerificationGuard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0b2e',
  },
});
```

## 🧪 Testing

### Test Scenarios:

1. **New User (Not Verified)**
   - Should see banner on all screens
   - Should be blocked from locked features
   - Banner should have "Verify Now" button

2. **Pending Verification**
   - Should see orange "Pending" banner
   - Should still be blocked
   - No action button (can't retry)

3. **Rejected Verification**
   - Should see red "Failed" banner
   - Should be blocked
   - Banner should have "Retry" button

4. **Verified User**
   - No banner shown
   - All features accessible
   - Normal app experience

### Test Commands:

```sql
-- Set user as not verified
UPDATE profiles SET verification_status = 'pending' WHERE id = 'USER_ID';

-- Set user as rejected
UPDATE profiles SET verification_status = 'rejected' WHERE id = 'USER_ID';

-- Set user as verified
UPDATE profiles SET verification_status = 'verified', verified_at = NOW() WHERE id = 'USER_ID';
```

## 🔄 State Flow

```
User Signs Up
     ↓
verification_status = 'pending'
verification_required = true
     ↓
App loads → VerificationContext checks status
     ↓
needsVerification = true
     ↓
VerificationBanner shows
VerificationGuard blocks features
     ↓
User clicks "Verify Now"
     ↓
Redirects to /auth/verify-face
     ↓
User completes verification
     ↓
Backend updates: verification_status = 'verified'
     ↓
Context refreshes
     ↓
needsVerification = false
     ↓
Banner hides, features unlock ✅
```

## 🎯 Quick Start Checklist

- [x] VerificationProvider added to `_layout.jsx`
- [ ] Add VerificationBanner to main tab screens
- [ ] Wrap critical features with VerificationGuard
- [ ] Test all verification states
- [ ] Update backend to set `verification_required = true` for new users
- [ ] Test complete flow from signup to verification

## 📝 Notes

- **Banner is dismissible** - Users can close it temporarily
- **Guard is not dismissible** - Features stay locked until verified
- **Auto-refresh** - Status updates automatically when verification completes
- **Graceful degradation** - If verification service is down, users can still access app
- **Security** - All checks happen on backend, frontend is just UI

## 🚀 Deployment

1. Deploy Python verification service
2. Deploy Node.js backend with verification routes
3. Run database migration
4. Deploy React Native app with verification components
5. Test end-to-end flow
6. Monitor verification success rate

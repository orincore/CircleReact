# Notification Icon Setup for Android

## Issue Fixed
The live activity notifications weren't showing on Android because the `expo-notifications` plugin was missing from `app.json`.

## Changes Made

### 1. Updated app.json
Added the `expo-notifications` plugin to the plugins array:
```json
[
  "expo-notifications",
  {
    "icon": "./assets/images/notification-icon.png",
    "color": "#7C2B86",
    "defaultChannel": "default",
    "sounds": []
  }
]
```

### 2. Notification Icon Required
You need to create a notification icon at: `assets/images/notification-icon.png`

**Requirements:**
- **Size**: 96x96 pixels (will be scaled automatically)
- **Format**: PNG with transparency
- **Design**: White icon on transparent background
- **Style**: Simple, recognizable Circle app logo or "C" letter

**Quick Solution:**
You can use your existing app icon and convert it to white on transparent background using:
1. Online tool: https://romannurik.github.io/AndroidAssetStudio/icons-notification.html
2. Or copy your splash-icon.png and convert it to white silhouette

**Temporary Workaround:**
If you don't have the icon ready, you can:
1. Copy your existing icon: `cp assets/images/icon.png assets/images/notification-icon.png`
2. The app will still work, but the notification icon won't be perfect

### 3. Rebuild Required
After adding the plugin and icon, you need to rebuild the app:

```bash
# For development
npx expo prebuild --clean
npx expo run:android

# Or for EAS build
eas build --platform android --profile development
```

## How It Works Now

### Live Activity Notifications
When activities happen (user joins, matches, etc.), Android users will receive:
- ✅ **Push notifications** in the notification panel
- ✅ **Live activity feed** updates in the app
- ✅ **Sound and vibration** based on notification type
- ✅ **Notification channels** for different activity types

### Notification Channels Created
1. **Activities** - Live activity updates (default importance)
2. **Friend Requests** - Friend request notifications (high importance)
3. **Messages** - Chat messages (high importance)
4. **Matches** - Match notifications (high importance)
5. **Voice Calls** - Incoming calls (max importance)
6. **Profile Visits** - Profile view notifications (default importance)

### Testing
1. **Build the app** with the new configuration
2. **Grant notification permissions** when prompted
3. **Trigger an activity** (e.g., update location, send friend request)
4. **Check notification panel** - you should see the notification

## Troubleshooting

### If notifications still don't show:
1. **Check permissions**: Settings > Apps > Circle > Notifications (should be enabled)
2. **Check channels**: Each channel should be enabled in app notification settings
3. **Check logs**: Look for "🔔" emoji logs in console
4. **Verify socket**: Ensure socket connection is established
5. **Test manually**: Use the AndroidNotificationService directly

### Manual Test:
```javascript
import androidNotificationService from '@/src/services/AndroidNotificationService';

// Test a notification
androidNotificationService.showActivityNotification({
  type: 'user_joined',
  title: 'Test Notification',
  body: 'This is a test notification',
  data: { test: true }
});
```

## What's Already Implemented
- ✅ AndroidNotificationService - Complete notification service
- ✅ useAndroidNotifications hook - Socket integration
- ✅ NotificationManager - Integrated with app
- ✅ Notification channels - All configured
- ✅ Permission handling - Automatic requests
- ✅ Activity handlers - All activity types supported

## Next Steps
1. Create the notification icon (see requirements above)
2. Rebuild the app with `npx expo run:android`
3. Test notifications on a physical Android device
4. Enjoy live activity notifications! 🎉

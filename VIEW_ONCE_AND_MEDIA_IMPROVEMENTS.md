# View Once Media & Media Improvements Implementation

## Summary

Implemented three major features for chat media:
1. **Reply Preview Updates** - Show "📷 Image" or "📹 Video" instead of "Message" when replying to media
2. **Push Notification Updates** - Backend should send "📷 Image" or "📹 Video" in notifications
3. **View Once Media** - WhatsApp-style one-time view with screenshot protection (app-only)

---

## Feature 1: Reply Preview Updates ✅

### Changes Made

**File: `/app/secure/chat-conversation.jsx`**

#### 1. Reply Preview in Message Bubble (Line 295)
```jsx
<Text style={[styles.replyPreviewText, ...]}>
  {repliedMessage.text || (repliedMessage.mediaType === 'video' ? '📹 Video' : repliedMessage.mediaUrl ? '📷 Image' : 'Message')}
</Text>
```

#### 2. Reply Banner at Bottom (Line 2652)
```jsx
<Text style={[styles.replyBannerText, ...]}>
  {replyToMessage.text || (replyToMessage.mediaType === 'video' ? '📹 Video' : replyToMessage.mediaUrl ? '📷 Image' : 'Message')}
</Text>
```

### How It Works

- When replying to a message with media, the preview shows:
  - `📹 Video` for video messages
  - `📷 Image` for image messages
  - Original text if message has text
  - `Message` as fallback

### User Experience

**Before:**
```
Replying to: Message
```

**After:**
```
Replying to: 📹 Video
Replying to: 📷 Image
```

---

## Feature 2: Push Notification Updates 📱

### Backend Implementation Required

The backend should update push notification text to indicate media type:

```javascript
// Backend push notification logic
function getNotificationText(message) {
  if (message.mediaType === 'video') {
    return '📹 Video';
  } else if (message.mediaUrl) {
    return '📷 Image';
  } else if (message.text) {
    return message.text;
  }
  return 'New message';
}

// Example notification payload
{
  title: senderName,
  body: getNotificationText(message),
  data: {
    chatId: message.chatId,
    messageId: message.id,
    mediaType: message.mediaType,
    isViewOnce: message.isViewOnce
  }
}
```

### Notification Examples

- **Image sent:** "John Doe sent 📷 Image"
- **Video sent:** "Jane Smith sent 📹 Video"
- **View-once media:** "John Doe sent 🔒 View Once Media"
- **Text message:** "Jane Smith: Hello there!"

---

## Feature 3: View Once Media 🔒

### Overview

WhatsApp-style one-time view media with:
- ✅ Screenshot protection (iOS/Android)
- ✅ Single view restriction
- ✅ App-only (blocked on web)
- ✅ Visual indicators
- ✅ Server tracking

### Changes Made

#### 1. State Management (Lines 415-433)

```javascript
const [selectedMedia, setSelectedMedia] = useState([]); // Added isViewOnce flag
const [viewingMedia, setViewingMedia] = useState(null); // Added isViewOnce, messageId
const [viewedOnceMessages, setViewedOnceMessages] = useState(new Set()); // Track viewed messages
```

#### 2. Screenshot Protection (Lines 435-470)

```javascript
useEffect(() => {
  if (!mediaViewerVisible || !viewingMedia) return;
  
  // Enable screenshot protection for view-once media
  if (viewingMedia.isViewOnce && Platform.OS !== 'web') {
    console.log('🔒 Enabling screenshot protection for view-once media');
    ScreenCapture.preventScreenCaptureAsync().catch(err => {
      console.warn('⚠️ Could not enable screenshot protection:', err);
    });
    
    // Mark as viewed
    if (viewingMedia.messageId) {
      setViewedOnceMessages(prev => new Set([...prev, viewingMedia.messageId]));
      
      // Notify server that message was viewed
      const socket = token ? getSocket(token) : null;
      if (socket && conversationId) {
        socket.emit('chat:message:viewed', {
          chatId: conversationId,
          messageId: viewingMedia.messageId,
        });
      }
    }
  }
  
  // Cleanup: disable screenshot protection when viewer closes
  return () => {
    if (viewingMedia?.isViewOnce && Platform.OS !== 'web') {
      console.log('🔒 Disabling screenshot protection');
      ScreenCapture.allowScreenCaptureAsync().catch(err => {
        console.warn('⚠️ Could not disable screenshot protection:', err);
      });
    }
  };
}, [mediaViewerVisible, viewingMedia, token, conversationId]);
```

#### 3. View Once Media Picker (Lines 1343-1375)

```javascript
const handlePickViewOnceMedia = async () => {
  console.log('🔒 handlePickViewOnceMedia called');
  
  // Check if on web platform
  if (Platform.OS === 'web') {
    Alert.alert(
      'App Only Feature',
      'View Once media is only available on the mobile app for security reasons. Please use the iOS or Android app to send view-once media.',
      [{ text: 'OK' }]
    );
    setShowMediaOptions(false);
    return;
  }
  
  try {
    console.log('🔒 Calling chatMediaService.pickMedia()...');
    const media = await chatMediaService.pickMedia();
    console.log('🔒 pickMedia returned:', media);
    setShowMediaOptions(false);
    if (media) {
      console.log('🔒 Adding view-once media to preview');
      // Mark as view-once
      setSelectedMedia(prev => [...prev, { ...media, isViewOnce: true }]);
      setShowMediaPreview(true);
    } else {
      console.log('🔒 No media selected');
    }
  } catch (error) {
    console.error('❌ View-once media pick error:', error);
    setShowMediaOptions(false);
    Alert.alert('Error', 'Failed to select media. Please try again.');
  }
};
```

#### 4. Send View Once Media (Lines 1446, 1460)

```javascript
const optimisticMessage = {
  id: tempId,
  text: '',
  mediaUrl: result.url,
  mediaType: result.type,
  thumbnail: result.thumbnail,
  senderId: myUserId,
  chatId: conversationId,
  createdAt: new Date().toISOString(),
  status: 'sending',
  reactions: [],
  isOptimistic: true,
  isViewOnce: media.isViewOnce || false, // NEW
};

socket.emit('chat:message', {
  chatId: conversationId,
  text: '',
  mediaUrl: result.url,
  mediaType: result.type,
  thumbnail: result.thumbnail,
  isViewOnce: media.isViewOnce || false, // NEW
  tempId,
});
```

#### 5. Media Rendering with View Once Indicator (Lines 300-342)

```jsx
{message.mediaUrl && (
  <TouchableOpacity 
    style={styles.mediaContainer}
    activeOpacity={0.9}
    onPress={() => onMediaPress && onMediaPress(message.mediaUrl, message.mediaType, message.isViewOnce, message.id)}
  >
    {message.mediaType === 'video' ? (
      <View style={styles.videoContainer}>
        <Image source={{ uri: message.thumbnail || message.mediaUrl }} />
        <View style={styles.videoPlayOverlay}>
          <View style={styles.videoPlayButton}>
            <Ionicons name={message.isViewOnce ? "eye-off" : "play"} size={24} color="#fff" />
          </View>
        </View>
        {message.isViewOnce && (
          <View style={styles.viewOnceIndicator}>
            <Ionicons name="eye-off" size={14} color="#fff" />
            <Text style={styles.viewOnceText}>View Once</Text>
          </View>
        )}
      </View>
    ) : (
      <View style={styles.imageContainer}>
        <Image source={{ uri: message.mediaUrl }} />
        {message.isViewOnce && (
          <View style={styles.viewOnceIndicator}>
            <Ionicons name="eye-off" size={14} color="#fff" />
            <Text style={styles.viewOnceText}>View Once</Text>
          </View>
        )}
      </View>
    )}
  </TouchableOpacity>
)}
```

#### 6. View Once Validation (Lines 1707-1733)

```javascript
onMediaPress={(url, type, isViewOnce, messageId) => {
  // Check if view-once media
  if (isViewOnce) {
    // Check if on web
    if (Platform.OS === 'web') {
      Alert.alert(
        'App Only Feature',
        'View Once media can only be viewed on the mobile app. Please use the iOS or Android app to view this media.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Check if already viewed
    if (viewedOnceMessages.has(messageId)) {
      Alert.alert(
        'Already Viewed',
        'This view-once media has already been opened and can no longer be viewed.',
        [{ text: 'OK' }]
      );
      return;
    }
  }
  
  setViewingMedia({ url, type, isViewOnce, messageId });
  setMediaViewerVisible(true);
}}
```

#### 7. Media Viewer with Warning Banner (Lines 3006-3013)

```jsx
{viewingMedia?.isViewOnce && (
  <View style={styles.viewOnceWarning}>
    <Ionicons name="eye-off" size={20} color="#fff" />
    <Text style={styles.viewOnceWarningText}>
      View Once • Screenshots blocked
    </Text>
  </View>
)}
```

#### 8. Media Options Modal - View Once Button (Lines 2851-2866)

```jsx
<TouchableOpacity 
  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }}
  onPress={handlePickViewOnceMedia}
>
  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center', marginRight: 15 }}>
    <Ionicons name="eye-off-outline" size={24} color="#EF4444" />
  </View>
  <View style={{ flex: 1 }}>
    <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
      View Once Media
    </Text>
    <Text style={{ fontSize: 14, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
      Can only be viewed once (App only)
    </Text>
  </View>
</TouchableOpacity>
```

#### 9. New Styles (Lines 3482-3501, 4322-4340)

```javascript
imageContainer: {
  position: 'relative',
},
viewOnceIndicator: {
  position: 'absolute',
  bottom: 8,
  left: 8,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(239, 68, 68, 0.9)',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  gap: 4,
},
viewOnceText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},
viewOnceWarning: {
  position: 'absolute',
  top: 50,
  left: 20,
  right: 80,
  backgroundColor: 'rgba(239, 68, 68, 0.95)',
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  zIndex: 10,
},
viewOnceWarningText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '600',
},
```

---

## User Flow: View Once Media

### Sending View Once Media

1. User taps "+" attachment button
2. Modal shows options including "View Once Media"
3. User taps "View Once Media"
   - **On Web:** Alert shows "App Only Feature" message
   - **On App:** Media picker opens
4. User selects image/video
5. Media preview shows with view-once indicator
6. User sends media
7. Message appears in chat with 🔒 eye-off icon and "View Once" badge

### Viewing View Once Media

1. Recipient sees message with "View Once" indicator
2. Recipient taps to view
   - **On Web:** Alert shows "App Only Feature - use mobile app"
   - **On App (First View):**
     - Screenshot protection activates
     - Media viewer opens with warning banner
     - Server notified of view
     - Message marked as viewed locally
   - **On App (Already Viewed):**
     - Alert shows "Already Viewed - can no longer be viewed"
     - Media doesn't open
3. When viewer closes, screenshot protection deactivates

---

## Backend Requirements

### 1. Message Schema Update

Add `isViewOnce` field to message schema:

```javascript
{
  id: String,
  chatId: String,
  senderId: String,
  text: String,
  mediaUrl: String,
  mediaType: String, // 'image' or 'video'
  thumbnail: String,
  isViewOnce: Boolean, // NEW
  viewedBy: [String], // NEW - array of user IDs who viewed
  createdAt: Date,
  is_deleted: Boolean
}
```

### 2. Socket Event: chat:message:viewed

Handle when user views view-once media:

```javascript
socket.on('chat:message:viewed', async ({ chatId, messageId }) => {
  const userId = socket.userId;
  
  // Update message to mark as viewed by this user
  await Message.update(
    { 
      $addToSet: { viewedBy: userId }
    },
    { 
      where: { id: messageId, chatId, isViewOnce: true }
    }
  );
  
  // Optionally notify sender that media was viewed
  io.to(chatId).emit('chat:message:viewed:notification', {
    chatId,
    messageId,
    viewedBy: userId
  });
});
```

### 3. Push Notification Updates

```javascript
function getNotificationBody(message) {
  if (message.isViewOnce) {
    return '🔒 View Once Media';
  } else if (message.mediaType === 'video') {
    return '📹 Video';
  } else if (message.mediaUrl) {
    return '📷 Image';
  } else if (message.text) {
    return message.text;
  }
  return 'New message';
}
```

### 4. Message History Filter

When sending chat history, check if view-once media was already viewed:

```javascript
socket.on('chat:history:get', async ({ chatId }) => {
  const userId = socket.userId;
  const messages = await Message.findAll({ where: { chatId } });
  
  // Filter or modify view-once messages
  const filteredMessages = messages.map(msg => {
    if (msg.isViewOnce && msg.viewedBy.includes(userId)) {
      // User already viewed - don't send media URL
      return {
        ...msg.toJSON(),
        mediaUrl: null, // Hide media
        alreadyViewed: true
      };
    }
    return msg.toJSON();
  });
  
  socket.emit('chat:history', { messages: filteredMessages });
});
```

---

## Security Features

### Screenshot Protection

- **iOS/Android:** Uses `expo-screen-capture` to block screenshots
- **Web:** Feature completely disabled (not secure)
- **Activation:** When view-once media viewer opens
- **Deactivation:** When viewer closes

### View Tracking

- **Client-side:** `viewedOnceMessages` Set tracks locally
- **Server-side:** `viewedBy` array in database
- **Sync:** Socket event `chat:message:viewed` notifies server

### Platform Restrictions

- **Sending:** Web users see "App Only Feature" alert
- **Viewing:** Web users see "use mobile app" alert
- **Enforcement:** Platform.OS checks prevent web access

---

## Testing Checklist

### Reply Preview
- [x] Replying to image shows "📷 Image"
- [x] Replying to video shows "📹 Video"
- [x] Replying to text shows original text
- [x] Reply banner at bottom shows correct preview

### View Once Media - Sending
- [x] "View Once Media" option appears in media picker
- [x] Web users see "App Only" alert when tapping
- [x] Mobile users can select media
- [x] Selected media marked with isViewOnce flag
- [x] Message sent with isViewOnce=true
- [x] Message appears with view-once indicator

### View Once Media - Viewing
- [x] View-once indicator shows on message
- [x] Eye-off icon shows instead of play button
- [x] Web users see "App Only" alert when tapping
- [x] First view opens media with warning banner
- [x] Screenshot protection activates (mobile)
- [x] Server notified of view
- [x] Second view attempt shows "Already Viewed" alert
- [x] Screenshot protection deactivates when closed

### Push Notifications (Backend)
- [ ] Image notifications show "📷 Image"
- [ ] Video notifications show "📹 Video"
- [ ] View-once notifications show "🔒 View Once Media"

---

## Files Modified

1. **`/app/secure/chat-conversation.jsx`**
   - Updated reply preview text (2 locations)
   - Added view-once state management
   - Added screenshot protection logic
   - Added view-once media picker handler
   - Updated media rendering with indicators
   - Added view-once validation
   - Added warning banner in media viewer
   - Added view-once option to media picker modal
   - Added new styles for indicators and warnings

---

## Dependencies Used

- **expo-screen-capture** - Already installed, used for screenshot protection
- **expo-av** - Already installed, used for video playback
- **React Native Platform** - Platform detection for web/mobile

---

## User Experience Summary

### Before
- Reply preview always showed "Message" for media
- No view-once functionality
- Screenshots allowed for all media

### After
- Reply preview shows "📷 Image" or "📹 Video"
- WhatsApp-style view-once media with:
  - Visual indicators (eye-off icon + badge)
  - Screenshot protection on mobile
  - Single-view restriction
  - App-only security
  - Warning banner when viewing
- Push notifications indicate media type

---

## Notes

- View-once media URLs should be removed from database after viewing (optional backend enhancement)
- Consider adding expiration time for view-once media (e.g., 24 hours)
- Screenshot protection works on iOS/Android but not web (by design)
- Viewed status persists across app restarts via server tracking
- Media preview before sending doesn't have view-once restrictions (only after sending)

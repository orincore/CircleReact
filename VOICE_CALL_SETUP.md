# Voice Call Feature Setup Guide

## Overview
The Circle app now includes a comprehensive voice call feature using WebRTC technology. This allows users to make high-quality voice calls directly within the app.

## Installation Steps

### 1. Install Dependencies
```bash
cd /Users/orincore/Documents/circle\ prj/Circle
npm install react-native-webrtc@^124.0.4
```

### 2. Platform-Specific Setup

#### iOS Setup
Add the following to your `ios/Podfile`:
```ruby
permissions_path = '../node_modules/react-native-permissions/ios'
pod 'Permission-Microphone', :path => "#{permissions_path}/Microphone"
```

Then run:
```bash
cd ios && pod install
```

#### Android Setup
Add the following permissions to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### 3. Web Setup
No additional setup required for web - uses browser's native WebRTC APIs.

## Features Implemented

### ✅ Core Voice Call System
- **WebRTC Integration**: High-quality peer-to-peer voice calls
- **Cross-Platform**: Works on iOS, Android, and Web
- **Real-time Signaling**: Socket.io-based call signaling
- **STUN Servers**: Google STUN servers for NAT traversal

### ✅ User Interface
- **Full-Screen Call Modal**: Beautiful call interface with user avatar
- **Call Controls**: Mute, speaker toggle, and end call buttons
- **Call States**: Visual feedback for calling, ringing, connecting, connected states
- **Responsive Design**: Adapts to different screen sizes

### ✅ Chat Integration
- **Call Button**: Added to chat header for easy access
- **Friend Restriction**: Only friends can call each other
- **Incoming Call Handling**: Automatic call modal for incoming calls
- **Call History**: Integrated with existing chat system

### ✅ Backend Infrastructure
- **Socket Handlers**: Complete WebRTC signaling server
- **Call Management**: Redis-based call state tracking
- **Security**: Friendship verification before allowing calls
- **Error Handling**: Comprehensive error handling and logging

### ✅ Browser Notifications
- **Incoming Call Alerts**: Browser notifications for incoming calls
- **Background Support**: Notifications when app is not active
- **Click to Focus**: Clicking notification brings app to foreground

## How to Use

### Making a Call
1. Open a chat with a friend
2. Click the phone icon (📞) in the chat header
3. Wait for the other person to accept
4. Enjoy your voice call!

### Receiving a Call
1. You'll see a full-screen incoming call modal
2. Click "Accept" to answer or "Decline" to reject
3. If you're not in the app, you'll get a browser notification

### Call Controls
- **Mute**: Toggle your microphone on/off
- **Speaker**: Switch between earpiece and speaker (mobile only)
- **End Call**: Hang up the call

## Technical Architecture

### Frontend Components
- `VoiceCallService.js`: Core WebRTC service
- `VoiceCallModal.jsx`: Call UI component
- Chat integration in `chat-conversation.jsx`

### Backend Components
- Socket handlers in `optimized-socket.ts`
- Redis-based call state management
- Friendship verification system

### Security Features
- **Friend-Only Calls**: Only friends can call each other
- **Permission Checks**: Microphone permission required
- **Secure Signaling**: Authenticated socket connections
- **Call Validation**: Server-side call authorization

## Troubleshooting

### Common Issues

#### "Microphone access denied"
- Grant microphone permission in browser/device settings
- Reload the app after granting permission

#### "Cannot call yourself"
- This is expected behavior for security

#### "You can only call friends"
- Send a friend request first, then try calling

#### Call not connecting
- Check internet connection
- Ensure both users have granted microphone permission
- Try refreshing the app

### Debug Logs
The app includes comprehensive logging. Check browser console for:
- `📞` Voice call events
- `🔌` Socket connection status
- `🎤` Microphone access logs
- `📡` WebRTC signaling logs

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

### Mobile Support
- ✅ iOS Safari 11+
- ✅ Android Chrome 60+
- ✅ React Native iOS/Android

## Performance Considerations

### Optimizations Implemented
- **Efficient WebRTC**: Uses optimal codec settings
- **Smart Cleanup**: Proper resource cleanup on call end
- **Memory Management**: Prevents memory leaks
- **Battery Optimization**: Minimal battery impact

### Network Requirements
- **Minimum**: 64 kbps for voice calls
- **Recommended**: 128 kbps for best quality
- **Latency**: <200ms for optimal experience

## Future Enhancements

### Planned Features
- **Call History**: Detailed call logs
- **Group Calls**: Multi-participant voice calls
- **Video Calls**: Camera support
- **Call Recording**: With user consent
- **Call Quality**: Adaptive bitrate

## Support

If you encounter any issues with voice calls:
1. Check the troubleshooting section above
2. Review browser console logs
3. Ensure all permissions are granted
4. Test with a different browser/device

The voice call feature is now fully integrated and ready for use! 🎉

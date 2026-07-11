/**
 * Content for the in-app "prominent disclosure" screens required by Google
 * Play's User Data policy (https://support.google.com/googleplay/android-developer/answer/10144311)
 * and Apple's equivalent App Store guidance: before requesting a sensitive
 * runtime permission, the app must show a developer-controlled explanation
 * of what is collected and why, distinct from the OS permission dialog and
 * the privacy policy, that the user can affirmatively accept or decline.
 *
 * Each entry here is rendered by PermissionDisclosureModal via
 * PermissionDisclosureContext / utils/permissionGate.js, which shows the
 * matching disclosure immediately before the corresponding OS permission
 * request fires.
 */
export const PERMISSION_DISCLOSURES = {
  location: {
    icon: 'location',
    title: 'Location Access',
    body: 'Circle uses your location while you use the app to find nearby matches, show distance on profiles, and power the map view.',
    points: [
      { icon: 'navigate-outline', text: 'Used to find and rank matches near you' },
      { icon: 'map-outline', text: 'Shown as approximate distance on profiles you view' },
      { icon: 'eye-off-outline', text: 'Never shared with other members as an exact address' },
    ],
    allowLabel: 'Allow Location Access',
    denyLabel: 'Not Now',
  },
  camera: {
    icon: 'camera',
    title: 'Camera Access',
    body: 'Circle uses your camera when you choose to take a photo — for your profile picture, chat media, or identity verification.',
    points: [
      { icon: 'image-outline', text: 'Only used for the photo you choose to take' },
      { icon: 'cloud-upload-outline', text: 'Uploaded only when you confirm and send/save it' },
      { icon: 'ban-outline', text: 'Circle never accesses your camera in the background' },
    ],
    allowLabel: 'Allow Camera Access',
    denyLabel: 'Not Now',
  },
  microphone: {
    icon: 'mic',
    title: 'Microphone Access',
    body: 'Circle uses your microphone so the other person can hear you during voice calls with matches and friends.',
    points: [
      { icon: 'call-outline', text: 'Only active during a live call you started or accepted' },
      { icon: 'stop-circle-outline', text: 'Automatically turned off the moment the call ends' },
      { icon: 'ban-outline', text: 'Circle never records or accesses your microphone otherwise' },
    ],
    allowLabel: 'Allow Microphone Access',
    denyLabel: 'Not Now',
  },
  photoLibrary: {
    icon: 'images',
    title: 'Photo Library Access',
    body: 'Circle uses your photo library when you choose to upload a picture — for your profile, chat, or to save media someone shared with you.',
    points: [
      { icon: 'checkmark-circle-outline', text: 'Only the photo/video you pick is accessed' },
      { icon: 'cloud-upload-outline', text: 'Uploaded only when you confirm and send/save it' },
      { icon: 'lock-closed-outline', text: 'Circle never scans or uploads your library automatically' },
    ],
    allowLabel: 'Allow Photo Access',
    denyLabel: 'Not Now',
  },
  notifications: {
    icon: 'notifications',
    title: 'Notifications',
    body: 'Circle can notify you about new messages, matches, and activity so you don’t have to keep the app open.',
    points: [
      { icon: 'chatbubble-outline', text: 'New messages, matches, and call alerts' },
      { icon: 'options-outline', text: 'Fully customizable, or turn off anytime in Settings' },
    ],
    allowLabel: 'Allow Notifications',
    denyLabel: 'Not Now',
  },
};

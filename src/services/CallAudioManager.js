import InCallManager from 'react-native-incall-manager';
import { Platform } from 'react-native';

class CallAudioManager {
  constructor() {
    this.isSpeakerOn = false;
    this.isActive = false;
  }

  start() {
    if (Platform.OS === 'web' || this.isActive) return;
    try {
      InCallManager.start({ media: 'audio' });
      InCallManager.setForceSpeakerphoneOn(false);
      InCallManager.setKeepScreenOn(false);
      this.isSpeakerOn = false;
      this.isActive = true;
    } catch (e) {
      console.error('Failed to start CallAudioManager', e);
    }
  }

  setSpeakerEnabled(enabled) {
    if (Platform.OS === 'web' || !this.isActive) return;
    const value = !!enabled;
    try {
      InCallManager.setForceSpeakerphoneOn(value);
      InCallManager.setKeepScreenOn(value);
      this.isSpeakerOn = value;
    } catch (e) {
      console.error('Failed to set speaker state', e);
    }
  }

  stop() {
    if (Platform.OS === 'web' || !this.isActive) return;
    try {
      InCallManager.setForceSpeakerphoneOn(false);
      InCallManager.setKeepScreenOn(false);
      InCallManager.stop();
    } catch (e) {
      console.error('Failed to stop CallAudioManager', e);
    } finally {
      this.isActive = false;
      this.isSpeakerOn = false;
    }
  }
}

export const callAudioManager = new CallAudioManager();
export default callAudioManager;

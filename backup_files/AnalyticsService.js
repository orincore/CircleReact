import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/config';

/**
 * Comprehensive Analytics Service
 * Tracks all user activities and interactions for detailed analytics
 */
class AnalyticsService {
  constructor() {
    this.sessionId = null;
    this.sessionStartTime = null;
    this.eventQueue = [];
    this.flushInterval = null;
    this.isEnabled = true;
  }

  /**
   * Initialize analytics tracking
   */
  async initialize() {
    try {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStartTime = new Date();
      
      // Start auto-flush every 30 seconds
      this.startAutoFlush();
      
      // Track session start
      await this.trackEvent('session_start', {
        timestamp: this.sessionStartTime.toISOString(),
        sessionId: this.sessionId,
      });
      
      console.log('📊 Analytics initialized:', this.sessionId);
    } catch (error) {
      console.error('Analytics initialization error:', error);
    }
  }

  /**
   * Track a custom event
   */
  async trackEvent(eventName, properties = {}) {
    if (!this.isEnabled) return;

    try {
      const userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('token');

      const event = {
        event_name: eventName,
        user_id: userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        properties: {
          ...properties,
          platform: 'mobile', // or 'web' based on Platform.OS
        },
      };

      // Add to queue
      this.eventQueue.push(event);

      // If queue is large, flush immediately
      if (this.eventQueue.length >= 10) {
        await this.flush();
      }
    } catch (error) {
      console.error('Track event error:', error);
    }
  }

  /**
   * Track screen view
   */
  async trackScreenView(screenName, params = {}) {
    await this.trackEvent('screen_view', {
      screen_name: screenName,
      ...params,
    });
  }

  /**
   * Track user action
   */
  async trackAction(actionName, details = {}) {
    await this.trackEvent('user_action', {
      action: actionName,
      ...details,
    });
  }

  /**
   * Track match interactions
   */
  async trackMatchAction(action, matchData = {}) {
    await this.trackEvent('match_action', {
      action, // 'accept', 'pass', 'view_profile'
      ...matchData,
    });
  }

  /**
   * Track messaging activity
   */
  async trackMessage(action, messageData = {}) {
    await this.trackEvent('message_action', {
      action, // 'sent', 'received', 'read', 'typing'
      ...messageData,
    });
  }

  /**
   * Track friend interactions
   */
  async trackFriendAction(action, friendData = {}) {
    await this.trackEvent('friend_action', {
      action, // 'request_sent', 'request_accepted', 'unfriend'
      ...friendData,
    });
  }

  /**
   * Track profile updates
   */
  async trackProfileUpdate(field, oldValue, newValue) {
    await this.trackEvent('profile_update', {
      field,
      old_value: oldValue,
      new_value: newValue,
    });
  }

  /**
   * Track search activity
   */
  async trackSearch(searchType, query, results = {}) {
    await this.trackEvent('search', {
      search_type: searchType,
      query,
      results_count: results.count || 0,
      ...results,
    });
  }

  /**
   * Track location activity
   */
  async trackLocation(action, locationData = {}) {
    await this.trackEvent('location_action', {
      action, // 'view_map', 'search_location', 'view_nearby_users'
      ...locationData,
    });
  }

  /**
   * Track app lifecycle events
   */
  async trackAppState(state) {
    await this.trackEvent('app_state', {
      state, // 'active', 'background', 'inactive'
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track errors
   */
  async trackError(errorType, errorMessage, stackTrace = null) {
    await this.trackEvent('error', {
      error_type: errorType,
      error_message: errorMessage,
      stack_trace: stackTrace,
    });
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(featureName, usageData = {}) {
    await this.trackEvent('feature_usage', {
      feature: featureName,
      ...usageData,
    });
  }

  /**
   * Track button clicks
   */
  async trackButtonClick(buttonName, context = {}) {
    await this.trackEvent('button_click', {
      button: buttonName,
      ...context,
    });
  }

  /**
   * Track time spent on screen
   */
  async trackTimeOnScreen(screenName, duration) {
    await this.trackEvent('time_on_screen', {
      screen_name: screenName,
      duration_seconds: duration,
    });
  }

  /**
   * Track session end
   */
  async trackSessionEnd() {
    const sessionDuration = (new Date() - this.sessionStartTime) / 1000; // seconds
    
    await this.trackEvent('session_end', {
      session_id: this.sessionId,
      duration_seconds: sessionDuration,
      timestamp: new Date().toISOString(),
    });

    // Flush remaining events
    await this.flush();
  }

  /**
   * Flush events to backend
   */
  async flush() {
    if (this.eventQueue.length === 0) return;

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const events = [...this.eventQueue];
      this.eventQueue = [];

      const response = await fetch(`${API_BASE_URL}/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ events }),
      });

      if (response.ok) {
        console.log(`📊 Flushed ${events.length} analytics events`);
      } else {
        console.error('Analytics flush failed:', response.status);
        // Re-add events to queue on failure
        this.eventQueue.unshift(...events);
      }
    } catch (error) {
      console.error('Analytics flush error:', error);
    }
  }

  /**
   * Start auto-flush interval
   */
  startAutoFlush() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    // Flush every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);
  }

  /**
   * Stop auto-flush
   */
  stopAutoFlush() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Clear all queued events
   */
  clearQueue() {
    this.eventQueue = [];
  }
}

export default new AnalyticsService();

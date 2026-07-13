import LocationTrackingService from "@/services/LocationTrackingService";
import { authApi } from "@/src/api/auth";
import { meGql, updateMeGql } from "@/src/api/graphql";
import socketService from "@/src/services/socketService";
import { onTokenRenewed } from "@/src/api/tokenStore";
import { onInvalidToken } from "@/src/api/authEvents";
import { getOrCreateDeviceId } from "@/src/services/deviceId";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from 'expo-device';
import { useRouter, useSegments } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

// Gathered once per call site (login/signup/google auth) so a new
// auth_sessions row on the backend can be tied to a device -- see
// src/services/deviceId.js for why deviceId (not the push token) is the
// stable per-install identifier.
async function getDeviceInfo() {
  const deviceId = await getOrCreateDeviceId();
  return {
    deviceId,
    deviceType: Platform.OS,
    deviceName: Device.deviceName || `${Platform.OS} Device`,
  };
}

const AuthContext = createContext(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const segments = useSegments();
  const router = useRouter();
  const AUTH_STORAGE_KEY = "@circle:isAuthenticated";
  const TOKEN_KEY = "@circle:access_token";
  const USER_KEY = "@circle:user";
  const statusCheckIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const statusCheckRetries = useRef(0);
  const maxStatusCheckRetries = 3;
  const isLoggingOutRef = useRef(false);

  const checkAccountStatus = useCallback(async (userData, accessToken) => {
    // Check if account is deleted or suspended
    if (userData.deleted_at) {
      //console.log('❌ Account is deleted');
      router.replace({
        pathname: '/account-blocked',
        params: {
          status: 'deleted',
          reason: userData.deletion_reason || 'Your account has been deleted',
          username: userData.username || '',
          email: userData.email || '',
        }
      });
      return false;
    }
    
    if (userData.is_suspended) {
      //console.log('⚠️ Account is suspended');
      router.replace({
        pathname: '/account-blocked',
        params: {
          status: 'suspended',
          reason: userData.suspension_reason || 'Your account has been suspended',
          username: userData.username || '',
          email: userData.email || '',
          suspensionEndsAt: userData.suspension_ends_at || '',
        }
      });
      return false;
    }
    
    return true;
  }, [router]);

  const applyAuth = useCallback(async (resp, opts = { navigate: true }) => {
    setToken(resp.access_token);
    // Immediately fetch full profile via GraphQL
    let fullUser;
    try {
      fullUser = await meGql(resp.access_token);
      
      // If user data is null or undefined, use resp.user as fallback
      if (!fullUser && !resp.user) {
        console.warn('⚠️ Unable to fetch full user profile - using login response data');
      }
      
      // Merge REST user snapshot with GraphQL user so we preserve fields
      // like verification_status that might not be present in GraphQL
      const mergedUser = fullUser || resp.user ? { ...(resp.user || {}), ...(fullUser || {}) } : null;
      setUser(mergedUser);
    } catch (_e) {
      const isAuthError = _e?.isAuthError === true || _e?.status === 401 || _e?.status === 403;
      
      if (isAuthError && !resp.user) {
        // Authentication failed and no fallback data
        console.error('❌ Authentication failed during login - logging out');
        await logOut();
        return;
      }
      
      // Network error or we have fallback data from login response
      console.warn('⚠️ Failed to fetch full user profile, using login response data:', _e.message);
      fullUser = resp.user;
      const mergedUser = resp.user || null;
      setUser(mergedUser);
    }
    
    // Check account status before proceeding
    const accountOk = await checkAccountStatus(fullUser || resp.user, resp.access_token);
    if (!accountOk) {
      // Don't set authenticated if account is blocked
      return;
    }
    
    setIsAuthenticated(true);
    
    // Initialize socket service for background messaging
    socketService.initialize(resp.access_token);
    
    // Refresh and save push notification token to database after authentication
    // Use refreshAndSaveToken to get fresh token and save it reliably
    try {
      const AndroidNotificationService = await import('../src/services/AndroidNotificationService');
      const notificationService = AndroidNotificationService.default;
      await notificationService.refreshAndSaveToken(resp.access_token);
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
    
    // Resume location tracking if it was previously enabled -- never
    // prompts for permission here (no in-app disclosure precedes this
    // path), it only continues if permission is already granted.
    try {
      await LocationTrackingService.resumeTrackingIfPermitted(resp.access_token);
    } catch (error) {
      console.error('Failed to resume location tracking:', error);
    }

    try {
      await Promise.all([
        AsyncStorage.setItem(AUTH_STORAGE_KEY, "true"),
        AsyncStorage.setItem(TOKEN_KEY, resp.access_token),
        // Persist last known user snapshot
        AsyncStorage.setItem(USER_KEY, JSON.stringify(resp.user)),
      ]);
    } catch (error) {
      console.warn("Failed to persist auth state", error);
    }
    if (opts?.navigate) {
      router.replace("/secure/match");
    }
  }, [router, checkAccountStatus]);

  const logIn = useCallback(async (identifier, password) => {
    const deviceInfo = await getDeviceInfo();
    const resp = await authApi.login({ identifier, password, ...deviceInfo });
    
    //console.log('🔍 [Frontend] Login response:', JSON.stringify(resp, null, 2));
    //console.log('🔍 [Frontend] User emailVerified:', resp.user.emailVerified);
    
    // Check if email is verified
    if (!resp.user.emailVerified) {
      //console.log('❌ [Frontend] Email not verified, redirecting to OTP page');
      
      // Store token and user data but don't set as authenticated
      setToken(resp.access_token);
      setUser(resp.user);
      // Don't set isAuthenticated to true for unverified users
      
      // Store auth data for later use
      try {
        await Promise.all([
          AsyncStorage.setItem(TOKEN_KEY, resp.access_token),
          AsyncStorage.setItem(USER_KEY, JSON.stringify(resp.user)),
        ]);
      } catch (error) {
        console.warn("Failed to persist auth state", error);
      }
      
      // Redirect to email verification
      router.replace({
        pathname: '/auth/verify-email-post-signup',
        params: {
          email: resp.user.email,
          name: resp.user.firstName,
        }
      });
      return;
    }
    
    //console.log('✅ [Frontend] Email verified, proceeding to main app');
    await applyAuth(resp, { navigate: true });
  }, [applyAuth, router]);

  const signUp = useCallback(
    async (payload) => {
      // payload must include: firstName, lastName, dateOfBirth, gender, email, username, password
      // and may include: phoneNumber, interests, needs
      const deviceInfo = await getDeviceInfo();
      const resp = await authApi.signup({
        firstName: payload.firstName,
        lastName: payload.lastName,
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender,
        email: payload.email.toLowerCase(),
        username: payload.username, // Added missing username field
        password: payload.password,
        phoneNumber: payload.phoneNumber || undefined,
        interests: Array.isArray(payload.interests) ? payload.interests : (payload.interests ? payload.interests : []),
        needs: Array.isArray(payload.needs) ? payload.needs : (payload.needs ? payload.needs : []),
        about: payload.about || undefined,
        instagramUsername: payload.instagramUsername || undefined,
        referralCode: payload.referralCode || undefined,
        ...deviceInfo,
      });
      
      // For new signups, store token and user but don't set as authenticated
      // They need to verify email first
      setToken(resp.access_token);
      setUser(resp.user);
      // Don't set isAuthenticated to true for new signups
      
      // Store auth data for later use
      try {
        await Promise.all([
          AsyncStorage.setItem(TOKEN_KEY, resp.access_token),
          AsyncStorage.setItem(USER_KEY, JSON.stringify(resp.user)),
        ]);
      } catch (error) {
        console.warn("Failed to persist auth state", error);
      }
      },
    [router]
  );

  const googleAuth = useCallback(async (idToken) => {
    const deviceInfo = await getDeviceInfo();
    const resp = await authApi.googleAuth(idToken, deviceInfo);
    
    if (resp.isNewUser) {
      // New user - return Google profile data for signup completion
      return resp;
    } else {
      // Existing user - log them in
      await applyAuth(resp, { navigate: true });
      return resp;
    }
  }, [applyAuth]);

  const googleCompleteSignup = useCallback(async (signupData) => {
    const deviceInfo = await getDeviceInfo();
    const resp = await authApi.googleCompleteSignup({ ...signupData, ...deviceInfo });
    
    // For Google OAuth users, email is pre-verified, so complete authentication
    setToken(resp.access_token);
    setUser(resp.user);
    setIsAuthenticated(true);
    
    // Initialize socket service for background messaging
    socketService.initialize(resp.access_token);
    
    // Refresh and save push notification token for new Google signup
    try {
      const AndroidNotificationService = await import('../src/services/AndroidNotificationService');
      const notificationService = AndroidNotificationService.default;
      await notificationService.refreshAndSaveToken(resp.access_token);
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
    
    // Resume location tracking if it was previously enabled -- never
    // prompts for permission here (no in-app disclosure precedes this
    // path), it only continues if permission is already granted.
    try {
      await LocationTrackingService.resumeTrackingIfPermitted(resp.access_token);
    } catch (error) {
      console.error('Failed to resume location tracking:', error);
    }

    // Update storage to mark as authenticated
    try {
      await Promise.all([
        AsyncStorage.setItem(AUTH_STORAGE_KEY, "true"),
        AsyncStorage.setItem(TOKEN_KEY, resp.access_token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(resp.user)),
      ]);
    } catch (error) {
      console.warn("Failed to persist auth state", error);
    }

    // Navigate to main app
    router.replace("/secure/(tabs)/match");

    return resp;
  }, [router]);

  const completeEmailVerification = useCallback(async () => {
    // This function is called after successful email verification
    // It completes the authentication process
    
    if (token && user) {
      setIsAuthenticated(true);
      
      // Initialize socket service for background messaging
      socketService.initialize(token);
      
      // Refresh and save push notification token after email verification (new signup)
      try {
        const AndroidNotificationService = await import('../src/services/AndroidNotificationService');
        const notificationService = AndroidNotificationService.default;
        await notificationService.refreshAndSaveToken(token);
      } catch (error) {
        console.error('Failed to save push token:', error);
      }
      
      // Resume location tracking if it was previously enabled -- never
      // prompts for permission here (no in-app disclosure precedes this
      // path), it only continues if permission is already granted.
      try {
        await LocationTrackingService.resumeTrackingIfPermitted(token);
      } catch (error) {
        console.error('Failed to resume location tracking:', error);
      }
      
      // Update storage to mark as authenticated
      try {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
      } catch (error) {
        console.warn("Failed to persist auth state", error);
      }
      
      // Navigate to main app
      router.replace("/secure/(tabs)/match");
    }
  }, [token, user, router]);

  const logOut = useCallback(async () => {
    // Guards against a burst of concurrent 401s (e.g. several screens firing
    // requests with the same now-invalid token) each triggering their own
    // logOut() call before state has a chance to update.
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
    // IMPORTANT: Get the current token BEFORE clearing state
    // We need it to unregister push notifications
    const currentToken = token;

    // Unregister push token for this user on logout FIRST (before clearing auth)
    // This ensures we can still make the API call with valid auth
    if (currentToken) {
      // Server-side logout: revokes this session (rejected on its next
      // request once session-revocation enforcement is turned on) and
      // disables push for this device. Called alongside -- not instead of
      // -- the unregister-token call below for this release, as a
      // belt-and-suspenders safety net while that enforcement rolls out.
      try {
        const deviceInfo = await getDeviceInfo();
        const AndroidNotificationService = await import('../src/services/AndroidNotificationService');
        const notificationService = AndroidNotificationService.default;
        const pushToken = notificationService?.getPushToken ? notificationService.getPushToken() : null;
        await authApi.logout({ deviceId: deviceInfo.deviceId, token: pushToken || undefined }, currentToken);
      } catch (error) {
        console.error('Failed to call server logout:', error);
      }

      try {
        const AndroidNotificationService = await import('../src/services/AndroidNotificationService');
        const notificationService = AndroidNotificationService.default;
        if (notificationService && typeof notificationService.unregisterPushTokenForCurrentUser === 'function') {
          await notificationService.unregisterPushTokenForCurrentUser(currentToken);
        }
      } catch (error) {
        console.error('Failed to unregister push token on logout:', error);
      }
    }
    
    // Now clear auth state
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    
    // Cleanup socket service
    socketService.disconnect();
    
    // Stop location tracking on logout
    try {
      await LocationTrackingService.stopTracking();
    } catch (error) {
      console.error('Failed to stop location tracking on logout:', error);
    }
    
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_STORAGE_KEY),
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
    } catch (error) {
      // Ignore storage cleanup errors
    }

    // On web, also clear any direct localStorage copies and do a hard redirect
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.localStorage?.removeItem?.(AUTH_STORAGE_KEY);
        window.localStorage?.removeItem?.(TOKEN_KEY);
        window.localStorage?.removeItem?.(USER_KEY);
      } catch {
        // Best-effort only
      }

      // Use both router and location to avoid stale bundles/routes
      router.replace("/");
      try {
        window.location.href = "/";
      } catch {
        // Fallback to router-only navigation if direct redirect fails
      }
    } else {
      // Native: normal router navigation is enough
      router.replace("/");
    }
    } finally {
      isLoggingOutRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const [flag, savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_STORAGE_KEY),
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        const authed = flag === "true" && !!savedToken;
        setToken(savedToken);
        let snapshot = savedUser ? JSON.parse(savedUser) : null;
        if (authed && savedToken) {
          try {
            const fullUser = await meGql(savedToken);
            // Merge persisted REST snapshot with GraphQL user so we keep
            // fields like verification_status that may not exist in GraphQL
            snapshot = fullUser ? { ...(snapshot || {}), ...fullUser } : snapshot;
          } catch (_e) {
            // keep snapshot
          }
          
          // Check account status before restoring auth
          if (snapshot) {
            const accountOk = await checkAccountStatus(snapshot, savedToken);
            if (!accountOk) {
              // Account is blocked, don't restore auth
              setIsAuthenticated(false);
              setUser(null);
              setToken(null);
              setIsRestoring(false);
              return;
            }
          }
          
          // Account is OK, restore auth
          setIsAuthenticated(true);
          // Initialize socket service for restored auth
          socketService.initialize(savedToken);
          
          // Refresh and save push notification token after auth is restored
          // Use refreshAndSaveToken for reliable token capture
          try {
            const AndroidNotificationService = await import('../src/services/AndroidNotificationService');
            const notificationService = AndroidNotificationService.default;
            // Small delay to ensure notification service is initialized
            setTimeout(async () => {
              await notificationService.refreshAndSaveToken(savedToken);
            }, 1000);
          } catch (error) {
            console.error('Failed to save push token after auth restoration:', error);
          }
        } else {
          setIsAuthenticated(false);
        }
        setUser(snapshot);
      } catch (e) {
        console.warn("Failed to restore auth state", e);
      } finally {
        setIsRestoring(false);
      }
    })();
  }, [checkAccountStatus]);

  // The server silently reissues an access token once the current one is past
  // the midpoint of its 7-day life (there is no refresh-token endpoint — see
  // src/api/tokenStore.ts). http.ts/graphql.ts persist it to storage; pick it
  // up here so React state and the socket's auth handshake stay in sync,
  // otherwise an active user's session would still hit the hard 7-day wall
  // the next time checkCurrentAccountStatus ran with the stale in-memory token.
  useEffect(() => {
    return onTokenRenewed((newToken) => {
      setToken(newToken);
      socketService.updateToken(newToken);
    });
  }, []);

  // A token we sent was rejected by the server as invalid (bad signature,
  // revoked session, etc. -- see src/api/authEvents.ts). Unlike expiry, this
  // can't be detected locally before the request goes out, so every screen
  // that fires a request keeps sending the same bad token and keeps getting
  // 401'd until the backend's brute-force rate limiter trips. Log out on the
  // first report instead of letting that repeat.
  useEffect(() => {
    return onInvalidToken(() => {
      if (isAuthenticated) {
        console.error('❌ Server rejected current token as invalid - logging out');
        logOut();
      }
    });
  }, [isAuthenticated, logOut]);

  useEffect(() => {
    if (isRestoring) {
      return;
    }

    const firstSegment = segments[0];
    const isSecureRoute = firstSegment === "secure";
    const isSignupFlow = firstSegment === "signup"; // allow viewing summary even when authed
    const isAuthFlow = firstSegment === "auth"; // allow email verification even when authed
    const isAdminRoute = firstSegment === "admin"; // admin panel has its own auth (AdminAuthGuard), independent of this context
    // Public marketing pages that should remain accessible on web even when authenticated
    const publicWebFirstSegments = new Set([
      undefined, // home route
      "",       // home on some platforms
      "index",  // home on expo-router
      "features",
      "privacy",
      "terms",
      "contact",
      "careers",
    ]);
    const isPublicWebRoute = Platform.OS === 'web' && publicWebFirstSegments.has(firstSegment);

    if (!isAuthenticated && isSecureRoute) {
      router.replace("/");
      return;
    }

    if (isAuthenticated && !isSecureRoute && !isSignupFlow && !isAuthFlow && !isAdminRoute && !isPublicWebRoute) {
      router.replace("/secure/match");
    }
  }, [isAuthenticated, isRestoring, router, segments]);

  const updateProfile = useCallback(async (input) => {
    if (!token) throw new Error("Not authenticated");
    const updated = await updateMeGql(input, token);
    const normalizedUpdated =
      input && Object.prototype.hasOwnProperty.call(input, 'instagramUsername')
        ? {
            ...updated,
            instagramUsername:
              input.instagramUsername == null || input.instagramUsername === ''
                ? null
                : updated?.instagramUsername,
          }
        : updated;

    setUser(normalizedUpdated);
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalizedUpdated));
    } catch {}
    return normalizedUpdated;
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    try {
      const fullUser = await meGql(token);
      
      // If unable to fetch user data, return null but don't logout
      if (!fullUser) {
        console.warn('⚠️ Unable to fetch user data during refresh');
        return null;
      }
      
      setUser(fullUser);
      try { await AsyncStorage.setItem(USER_KEY, JSON.stringify(fullUser)); } catch {}
      return fullUser;
    } catch (e) {
      const isAuthError = e?.isAuthError === true || e?.status === 401 || e?.status === 403;
      
      if (isAuthError) {
        // Authentication failed - token is invalid
        console.error("❌ Authentication failed during refresh - logging out", e.status);
        await logOut();
        return null;
      }
      
      // Network error - don't logout, just log warning
      console.warn("⚠️ Network error during user refresh - keeping current session:", e.message);
      return null;
    }
  }, [token, logOut]);

  const checkCurrentAccountStatus = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    
    try {
      const fullUser = await meGql(token);
      if (fullUser) {
        // Reset retry counter on success
        statusCheckRetries.current = 0;
        
        const accountOk = await checkAccountStatus(fullUser, token);
        if (!accountOk) {
          // Account is blocked, force logout
          console.log('⚠️ Account blocked, forcing logout');
          await logOut();
        }
      } else {
        // Unable to fetch user data but no error thrown - could be temporary
        console.warn('⚠️ Unable to fetch user data during status check - will retry');
        statusCheckRetries.current++;
        
        // Only logout after multiple consecutive failures
        if (statusCheckRetries.current >= maxStatusCheckRetries) {
          console.error('❌ Multiple failed status checks - logging out');
          await logOut();
        }
      }
    } catch (e) {
      // Check if this is an authentication error (401/403)
      const isAuthError = e?.isAuthError === true || e?.status === 401 || e?.status === 403;
      
      if (isAuthError) {
        // Authentication failed - token is invalid, logout immediately
        console.error('❌ Authentication error during status check - logging out', e.status);
        await logOut();
      } else {
        // Network or other transient error - don't logout, just log and retry
        console.warn('⚠️ Network error during status check - will retry later:', e.message);
        statusCheckRetries.current++;
        
        // Only logout after multiple consecutive failures
        if (statusCheckRetries.current >= maxStatusCheckRetries) {
          console.error('❌ Multiple consecutive network failures during status check - logging out for security');
          await logOut();
        }
      }
    }
  }, [token, isAuthenticated, checkAccountStatus, logOut]);

  // Periodic account status check (every 30 minutes for better user experience)
  useEffect(() => {
    if (isAuthenticated && token) {
      // Check immediately on mount
      checkCurrentAccountStatus();
      
      // Set up interval for periodic checks (30 minutes)
      // This prevents unnecessary network requests and aggressive logouts
      // Users stay logged in even if backend restarts or network is temporarily unavailable
      statusCheckIntervalRef.current = setInterval(() => {
        checkCurrentAccountStatus();
      }, 1800000); // Check every 30 minutes (1800000ms)
      
      return () => {
        if (statusCheckIntervalRef.current) {
          clearInterval(statusCheckIntervalRef.current);
        }
      };
    }
  }, [isAuthenticated, token, checkCurrentAccountStatus]);

  // Check account status and refresh FCM token when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated &&
        token
      ) {
        // Check account status
        checkCurrentAccountStatus();
        
        // Refresh and update FCM token on app foreground
        // This ensures the token is always up-to-date for this device
        try {
          const AndroidNotificationService = await import('../src/services/AndroidNotificationService');
          const notificationService = AndroidNotificationService.default;
          await notificationService.refreshAndSaveToken(token);
        } catch (error) {
          console.error('Failed to refresh push token on foreground:', error);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, token, checkCurrentAccountStatus]);

  // Fallback net for the notification-permission-granted-in-Settings case:
  // some Android OEM ROMs don't reliably fire the AppState 'active' transition
  // above when returning from the system Settings app, which otherwise leaves
  // a user stuck with notifications enabled at the OS level but no push token
  // ever registered. This polls cheaply (see AndroidNotificationService) and
  // only fetches a token once one is actually missing.
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    let cancelled = false;

    import('../src/services/AndroidNotificationService').then((mod) => {
      if (cancelled) return;
      mod.default.startPermissionWatcher(() => token);
    }).catch((error) => {
      console.error('Failed to start push permission watcher:', error);
    });

    return () => {
      cancelled = true;
      import('../src/services/AndroidNotificationService').then((mod) => {
        mod.default.stopPermissionWatcher();
      }).catch(() => {});
    };
  }, [isAuthenticated, token]);

  const value = useMemo(() => ({
    isAuthenticated,
    token,
    user,
    logIn,
    signUp,
    googleAuth,
    googleCompleteSignup,
    logOut,
    updateProfile,
    refreshUser,
    completeEmailVerification,
  }), [isAuthenticated, token, user, logIn, signUp, googleAuth, googleCompleteSignup, logOut, updateProfile, refreshUser, completeEmailVerification]);

  if (isRestoring) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

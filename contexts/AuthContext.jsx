import LocationTrackingService from "@/services/LocationTrackingService";
import { authApi } from "@/src/api/auth";
import { meGql, updateMeGql } from "@/src/api/graphql";
import socketService from "@/src/services/socketService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

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
      
      setUser(fullUser || resp.user || null);
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
      setUser(resp.user || null);
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
    
    // Save push notification token to database after authentication
    try {
      const AndroidNotificationService = await import('../src/services/AndroidNotificationService');
      const notificationService = AndroidNotificationService.default;
      const pushToken = notificationService.getPushToken();
      
      if (pushToken && pushToken !== 'undefined') {
        //console.log('💾 Saving push token to database after authentication');
        // Pass the auth token directly to avoid AsyncStorage timing issues
        await notificationService.savePushTokenToDatabase(pushToken, resp.access_token);
      }
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
    
    // Initialize location tracking if it was previously enabled
    try {
      const trackingEnabled = await LocationTrackingService.isTrackingEnabled();
      if (trackingEnabled) {
        //console.log('🔄 Resuming location tracking after authentication');
        await LocationTrackingService.startTracking(resp.access_token);
      }
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
    const resp = await authApi.login({ identifier, password });
    
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
      // payload must include: firstName, lastName, age, gender, email, username, password
      // and may include: phoneNumber, interests, needs
      const resp = await authApi.signup({
        firstName: payload.firstName,
        lastName: payload.lastName,
        age: Number(payload.age),
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
    const resp = await authApi.googleAuth(idToken);
    
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
    const resp = await authApi.googleCompleteSignup(signupData);
    
    // For Google OAuth users, email is pre-verified, so complete authentication
    setToken(resp.access_token);
    setUser(resp.user);
    setIsAuthenticated(true);
    
    // Initialize socket service for background messaging
    socketService.initialize(resp.access_token);
    
    // Initialize location tracking if it was previously enabled
    try {
      const trackingEnabled = await LocationTrackingService.isTrackingEnabled();
      if (trackingEnabled) {
        await LocationTrackingService.startTracking(resp.access_token);
      }
    } catch (error) {
      console.error('Failed to start location tracking:', error);
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
    ;
    
    if (token && user) {
      //console.log('✅ [Frontend] Email verified, completing authentication');
      setIsAuthenticated(true);
      
      // Initialize socket service for background messaging
      socketService.initialize(token);
      
      // Initialize location tracking if it was previously enabled
      try {
        const trackingEnabled = await LocationTrackingService.isTrackingEnabled();
        if (trackingEnabled) {
          //console.log('🔄 Resuming location tracking after email verification');
          await LocationTrackingService.startTracking(token);
        }
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
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    
    // Cleanup socket service
    socketService.disconnect();
    
    // Stop location tracking on logout
    try {
      await LocationTrackingService.stopTracking();
      //console.log('🛑 Location tracking stopped on logout');
    } catch (error) {
      console.error('Failed to stop location tracking on logout:', error);
    }

    // Unregister push token for this user on logout
    try {
      const AndroidNotificationService = await import('../src/services/AndroidNotificationService');
      const notificationService = AndroidNotificationService.default;
      if (notificationService && typeof notificationService.unregisterPushTokenForCurrentUser === 'function') {
        await notificationService.unregisterPushTokenForCurrentUser();
      }
    } catch (error) {
      console.error('Failed to unregister push token on logout:', error);
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
            snapshot = fullUser || snapshot;
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
          
          // Save push notification token after auth is restored
          // Wait a bit for the notification service to initialize
          setTimeout(async () => {
            try {
              const AndroidNotificationService = await import('../src/services/AndroidNotificationService');
              const notificationService = AndroidNotificationService.default;
              const pushToken = notificationService.getPushToken();
              
              
              
              if (pushToken && pushToken !== 'undefined') {
                //console.log('💾 Saving push token after auth restoration');
                // Pass the auth token directly to avoid AsyncStorage timing issues
                await notificationService.savePushTokenToDatabase(pushToken, savedToken);
              } else {
                //console.log('⏳ Push token not ready yet, will save on next login');
              }
            } catch (error) {
              console.error('Failed to save push token after auth restoration:', error);
            }
          }, 2000); // Wait 2 seconds for notification service to initialize
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

  useEffect(() => {
    if (isRestoring) {
      return;
    }

    const firstSegment = segments[0];
    const isSecureRoute = firstSegment === "secure";
    const isSignupFlow = firstSegment === "signup"; // allow viewing summary even when authed
    const isAuthFlow = firstSegment === "auth"; // allow email verification even when authed
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

    if (isAuthenticated && !isSecureRoute && !isSignupFlow && !isAuthFlow && !isPublicWebRoute) {
      router.replace("/secure/match");
    }
  }, [isAuthenticated, isRestoring, router, segments]);

  const updateProfile = useCallback(async (input) => {
    if (!token) throw new Error("Not authenticated");
    const updated = await updateMeGql(input, token);
    setUser(updated);
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
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

  // Periodic account status check (every 5 minutes - reduced from 30 seconds)
  useEffect(() => {
    if (isAuthenticated && token) {
      // Check immediately on mount
      checkCurrentAccountStatus();
      
      // Set up interval for periodic checks (5 minutes instead of 30 seconds)
      // This reduces unnecessary network requests and prevents aggressive logouts
      statusCheckIntervalRef.current = setInterval(() => {
        checkCurrentAccountStatus();
      }, 300000); // Check every 5 minutes (300000ms)
      
      return () => {
        if (statusCheckIntervalRef.current) {
          clearInterval(statusCheckIntervalRef.current);
        }
      };
    }
  }, [isAuthenticated, token, checkCurrentAccountStatus]);

  // Check account status when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated &&
        token
      ) {
        //console.log('📱 App came to foreground, checking account status');
        checkCurrentAccountStatus();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, token, checkCurrentAccountStatus]);

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

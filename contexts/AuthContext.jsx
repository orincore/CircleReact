import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useSegments } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "@/src/api/auth";
import { meGql, updateMeGql } from "@/src/api/graphql";
import socketService from "@/src/services/socketService";
import LocationTrackingService from "@/services/LocationTrackingService";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const segments = useSegments();
  const AUTH_STORAGE_KEY = "@circle:isAuthenticated";
  const TOKEN_KEY = "@circle:access_token";
  const USER_KEY = "@circle:user";

  const applyAuth = useCallback(async (resp, opts = { navigate: true }) => {
    setToken(resp.access_token);
    // Immediately fetch full profile via GraphQL
    try {
      const fullUser = await meGql(resp.access_token);
      setUser(fullUser || resp.user || null);
    } catch (_e) {
      setUser(resp.user || null);
    }
    setIsAuthenticated(true);
    
    // Initialize socket service for background messaging
    socketService.initialize(resp.access_token);
    
    // Initialize location tracking if it was previously enabled
    try {
      const trackingEnabled = await LocationTrackingService.isTrackingEnabled();
      if (trackingEnabled) {
        console.log('🔄 Resuming location tracking after authentication');
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
  }, [router]);

  const logIn = useCallback(async (identifier, password) => {
    const resp = await authApi.login({ identifier, password });
    await applyAuth(resp, { navigate: true });
  }, [applyAuth]);

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
        password: payload.password,
        phoneNumber: payload.phoneNumber || undefined,
        interests: Array.isArray(payload.interests) ? payload.interests : (payload.interests ? payload.interests : []),
        needs: Array.isArray(payload.needs) ? payload.needs : (payload.needs ? payload.needs : []),
      });
      await applyAuth(resp, { navigate: false });
      },
    [applyAuth]
  );
  const logOut = useCallback(async () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    
    // Cleanup socket service
    socketService.disconnect();
    
    // Stop location tracking on logout
    try {
      await LocationTrackingService.stopTracking();
      console.log('🛑 Location tracking stopped on logout');
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
    }
    router.replace("/");
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
        setIsAuthenticated(authed);
        setToken(savedToken);
        let snapshot = savedUser ? JSON.parse(savedUser) : null;
        if (authed && savedToken) {
          // Initialize socket service for restored auth
          socketService.initialize(savedToken);
          
          try {
            const fullUser = await meGql(savedToken);
            snapshot = fullUser || snapshot;
          } catch (_e) {
            // keep snapshot
          }
        }
        setUser(snapshot);
      } catch (e) {
        console.warn("Failed to restore auth state", e);
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isRestoring) {
      return;
    }

    const firstSegment = segments[0];
    const isSecureRoute = firstSegment === "secure";
    const isSignupFlow = firstSegment === "signup"; // allow viewing summary even when authed

    if (!isAuthenticated && isSecureRoute) {
      router.replace("/");
      return;
    }

    if (isAuthenticated && !isSecureRoute && !isSignupFlow) {
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
      setUser(fullUser);
      try { await AsyncStorage.setItem(USER_KEY, JSON.stringify(fullUser)); } catch {}
      return fullUser;
    } catch (e) {
      console.warn("Failed to refresh user", e);
      return null;
    }
  }, [token]);

  const value = useMemo(() => ({
    isAuthenticated,
    token,
    user,
    logIn,
    signUp,
    logOut,
    updateProfile,
    refreshUser,
  }), [isAuthenticated, token, user, logIn, signUp, logOut, updateProfile, refreshUser]);

  if (isRestoring) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

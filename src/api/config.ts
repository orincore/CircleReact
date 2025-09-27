// Centralized API base URL configuration
// - In development, prefer using the device/LAN IP instead of localhost to avoid "Network request failed".
// - Keep SSL disabled (HTTP) for testing in development.
// - Allow overriding via EXPO_PUBLIC_API_BASE_URL.

import { Platform, NativeModules } from "react-native";

// Prefer React Native's __DEV__ when available
// Fallback to NODE_ENV when __DEV__ is undefined (e.g., SSR or tooling)
export const DEV = (typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production");

function inferDevHost(): string | null {
  try {
    // Native (Expo/React Native): parse from scriptURL
    if (Platform.OS === "ios" || Platform.OS === "android") {
      const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
      if (scriptURL) {
        // e.g. "http://192.168.1.100:19000/index.bundle?platform=ios&dev=true"
        const withoutProtocol = scriptURL.split("://")[1] ?? scriptURL;
        const host = withoutProtocol.split(":")[0];
        if (host && host !== "localhost" && host !== "127.0.0.1") return host;
      }
    }
    // Web (Expo web): use window.location.hostname
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host && host !== "localhost" && host !== "127.0.0.1") return host;
    }
  } catch {}
  return null;
}

const DEV_PORT = Number(process.env.EXPO_PUBLIC_API_PORT || 8080);
const DEFAULT_DEV_HOST = "172.20.10.14"; // fallback LAN IP; will prefer inferred host when available

// Build base URL
export const API_BASE_URL: string = (() => {
  // Highest priority: explicit override via env
  const override = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (override && override.trim()) return override.trim();

  if (DEV) {
    // Prefer inference from packager scriptURL or window.location
    const inferred = inferDevHost();
    const host = inferred || DEFAULT_DEV_HOST;
    return `http://${host}:${DEV_PORT}`;
  }

  // Production default (can still be overridden via env)
  return `https://localhost:${DEV_PORT}`;
})();

// Helpful at runtime to confirm which base URL the app is using
// console.log("API_BASE_URL", API_BASE_URL);

export const withBase = (path: string) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
};

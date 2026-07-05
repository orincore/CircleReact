import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWeather } from '../src/api/weather';

const CACHE_KEY = '@circle:header_weather_cache_v1';
const REFRESH_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
const FOREGROUND_STALE_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Fetches and caches the header's decorative weather condition based on the
 * user's already-collected location (no new permission prompt). Returns
 * `{ condition: null }` until a location is available and a fetch succeeds
 * (or a fresh-enough cache exists) — callers should fall back to their
 * default icon whenever `condition` is null.
 * @param {{ latitude: number, longitude: number } | null} userLocation
 * @returns {{ condition: string | null }}
 */
export function useHeaderWeather(userLocation) {
  const [condition, setCondition] = useState(null);
  const lastFetchedAtRef = useRef(0);

  // Hydrate from cache once on mount, regardless of location, so a
  // returning user sees last-known weather immediately.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (!raw || cancelled) return;
        const cached = JSON.parse(raw);
        if (cached?.condition && Date.now() - cached.fetchedAt < CACHE_MAX_AGE_MS) {
          setCondition(cached.condition);
          lastFetchedAtRef.current = cached.fetchedAt;
        }
      } catch {
        // Corrupt or unavailable cache: treat as no cache.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userLocation?.latitude || !userLocation?.longitude) return;

    let cancelled = false;

    const refresh = async () => {
      const result = await fetchWeather(userLocation.latitude, userLocation.longitude);
      if (cancelled) return;

      if (result) {
        lastFetchedAtRef.current = Date.now();
        setCondition(result.condition);
        try {
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ condition: result.condition, fetchedAt: lastFetchedAtRef.current })
          );
        } catch {
          // Ignore cache write failures — in-memory state still updated.
        }
      } else if (Date.now() - lastFetchedAtRef.current >= CACHE_MAX_AGE_MS) {
        setCondition(null);
      }
    };

    refresh();
    const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && Date.now() - lastFetchedAtRef.current >= FOREGROUND_STALE_MS) {
        refresh();
      }
    });

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [userLocation?.latitude, userLocation?.longitude]);

  return { condition };
}

# Match Header Time-of-Day + Weather Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Match screen header's background video reflect real time-of-day and its decorative icon reflect real local weather, with a 3-provider free/keyless fallback chain so one dead API doesn't blank the icon.

**Architecture:** Two new pure/testable modules (`src/utils/weatherMapping.js` for provider-code → condition mapping and time→video-bucket logic, `src/api/weather.js` for the actual network calls with fallback), one new hook (`hooks/useHeaderWeather.js`) that wires location → weather → cached state, and a wiring pass in `app/secure/(tabs)/match.jsx` that consumes both. No backend changes, no new permissions.

**Tech Stack:** React Native / Expo SDK 56, `expo-video` (already used for the header video), `lottie-react-native` (already used for the header icon), `@react-native-async-storage/async-storage` (already a dependency), global `fetch`/`AbortController` (no new HTTP library needed), Jest (`testEnvironment: 'node'`) for unit tests.

## Global Constraints

- Weather providers must be free and require no API key/signup (per approved design): Open-Meteo, MET Norway Locationforecast, wttr.in — in that order.
- No new location-permission prompt — reuse the `userLocation` state `match.jsx` already populates via its existing `recordUserLocation()` flow.
- Time-of-day video has no failure mode (device clock only) and always applies. Only the weather icon has a fallback: on denied location / all providers failing / no usable cache, it silently reverts to the existing `animationLottie` sparkle — no error UI, no loading spinner.
- Time-of-day hour boundaries must exactly mirror `match.jsx`'s existing `getGreeting()`: `[5,12)` morning, `[12,17)` afternoon, `[17,22)` evening, else night — morning+afternoon share one video bucket (`morningAfternoon`) since only one video asset covers both.
- The asset `assets/lottie/Breezy_Weather .json` has a literal space before `.json` in its real filename on disk — import it exactly as-is; do not "fix" the space or the import will fail to resolve.
- `jest.config.js` only transforms/matches `.js` files (`testMatch: ['**/__tests__/**/*.test.js']`, no `.ts` in `moduleFileExtensions`) — new source files with automated tests must be `.js`, not `.ts`, even though the approved design doc used TypeScript-style type annotations for documentation purposes only.
- Two pre-existing test suites (`__tests__/platformUtils.test.js` and one other) already fail on this baseline for unrelated reasons (a `Platform` mocking issue) — this is not something this plan fixes; only verify the *new* test files pass cleanly, not the whole suite.

---

### Task 1: Weather mapping helpers (`src/utils/weatherMapping.js`)

**Files:**
- Create: `src/utils/weatherMapping.js`
- Test: `src/utils/__tests__/weatherMapping.test.js`

**Interfaces:**
- Produces: `getTimeOfDayVideoBucket(hour: number): 'morningAfternoon' | 'evening' | 'night'`
- Produces: `mapOpenMeteoCode(weatherCode: number, windSpeedKmh?: number): 'sunny'|'cloudy'|'rainy'|'snow'|'stormy'|'windy'|null`
- Produces: `mapMetNorwaySymbol(symbolCode: string, windSpeedMs?: number): same union | null`
- Produces: `mapWttrDescription(description: string, windSpeedKmh?: number): same union | null`
- These four are consumed by Task 2 (`src/api/weather.js`) and by Task 4 (`match.jsx`, only `getTimeOfDayVideoBucket`).

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/weatherMapping.test.js`:

```js
import {
  getTimeOfDayVideoBucket,
  mapOpenMeteoCode,
  mapMetNorwaySymbol,
  mapWttrDescription,
} from '../weatherMapping';

describe('getTimeOfDayVideoBucket', () => {
  it('returns morningAfternoon for hours 5-16', () => {
    expect(getTimeOfDayVideoBucket(5)).toBe('morningAfternoon');
    expect(getTimeOfDayVideoBucket(12)).toBe('morningAfternoon');
    expect(getTimeOfDayVideoBucket(16)).toBe('morningAfternoon');
  });

  it('returns evening for hours 17-21', () => {
    expect(getTimeOfDayVideoBucket(17)).toBe('evening');
    expect(getTimeOfDayVideoBucket(21)).toBe('evening');
  });

  it('returns night for hours 22-23 and 0-4', () => {
    expect(getTimeOfDayVideoBucket(22)).toBe('night');
    expect(getTimeOfDayVideoBucket(23)).toBe('night');
    expect(getTimeOfDayVideoBucket(0)).toBe('night');
    expect(getTimeOfDayVideoBucket(4)).toBe('night');
  });

  it('handles the exact boundary hours correctly', () => {
    expect(getTimeOfDayVideoBucket(4)).toBe('night');
    expect(getTimeOfDayVideoBucket(5)).toBe('morningAfternoon');
    expect(getTimeOfDayVideoBucket(16)).toBe('morningAfternoon');
    expect(getTimeOfDayVideoBucket(17)).toBe('evening');
    expect(getTimeOfDayVideoBucket(21)).toBe('evening');
    expect(getTimeOfDayVideoBucket(22)).toBe('night');
  });
});

describe('mapOpenMeteoCode', () => {
  it('maps clear-sky codes to sunny', () => {
    expect(mapOpenMeteoCode(0)).toBe('sunny');
    expect(mapOpenMeteoCode(1)).toBe('sunny');
  });

  it('maps overcast/fog codes to cloudy', () => {
    expect(mapOpenMeteoCode(2)).toBe('cloudy');
    expect(mapOpenMeteoCode(3)).toBe('cloudy');
    expect(mapOpenMeteoCode(45)).toBe('cloudy');
  });

  it('maps rain codes to rainy', () => {
    expect(mapOpenMeteoCode(61)).toBe('rainy');
    expect(mapOpenMeteoCode(80)).toBe('rainy');
  });

  it('maps snow codes to snow', () => {
    expect(mapOpenMeteoCode(71)).toBe('snow');
    expect(mapOpenMeteoCode(85)).toBe('snow');
  });

  it('maps thunderstorm codes to stormy', () => {
    expect(mapOpenMeteoCode(95)).toBe('stormy');
    expect(mapOpenMeteoCode(99)).toBe('stormy');
  });

  it('returns windy when a clear/cloudy code has high wind speed', () => {
    expect(mapOpenMeteoCode(1, 35)).toBe('windy');
    expect(mapOpenMeteoCode(3, 40)).toBe('windy');
  });

  it('does not override rain/snow/storm with windy', () => {
    expect(mapOpenMeteoCode(61, 50)).toBe('rainy');
  });

  it('returns null for an unrecognized code', () => {
    expect(mapOpenMeteoCode(4)).toBeNull();
  });
});

describe('mapMetNorwaySymbol', () => {
  it('maps clearsky/fair symbols to sunny', () => {
    expect(mapMetNorwaySymbol('clearsky_day')).toBe('sunny');
    expect(mapMetNorwaySymbol('fair_night')).toBe('sunny');
  });

  it('maps cloud/fog symbols to cloudy', () => {
    expect(mapMetNorwaySymbol('cloudy')).toBe('cloudy');
    expect(mapMetNorwaySymbol('fog')).toBe('cloudy');
  });

  it('maps rain symbols to rainy', () => {
    expect(mapMetNorwaySymbol('lightrain')).toBe('rainy');
    expect(mapMetNorwaySymbol('heavyrainshowers_day')).toBe('rainy');
  });

  it('maps snow/sleet symbols to snow', () => {
    expect(mapMetNorwaySymbol('snow')).toBe('snow');
    expect(mapMetNorwaySymbol('sleet')).toBe('snow');
  });

  it('maps thunder symbols to stormy', () => {
    expect(mapMetNorwaySymbol('heavyrainandthunder')).toBe('stormy');
  });

  it('returns windy when a clear/cloudy symbol has high wind speed', () => {
    expect(mapMetNorwaySymbol('clearsky_day', 10)).toBe('windy');
  });

  it('returns null for an unrecognized symbol or missing input', () => {
    expect(mapMetNorwaySymbol('unknown_symbol')).toBeNull();
    expect(mapMetNorwaySymbol(null)).toBeNull();
  });
});

describe('mapWttrDescription', () => {
  it('maps "Sunny"/"Clear" to sunny', () => {
    expect(mapWttrDescription('Sunny')).toBe('sunny');
    expect(mapWttrDescription('Clear')).toBe('sunny');
  });

  it('maps cloud/overcast/mist descriptions to cloudy', () => {
    expect(mapWttrDescription('Partly cloudy')).toBe('cloudy');
    expect(mapWttrDescription('Overcast')).toBe('cloudy');
    expect(mapWttrDescription('Mist')).toBe('cloudy');
  });

  it('maps rain/drizzle descriptions to rainy', () => {
    expect(mapWttrDescription('Patchy rain possible')).toBe('rainy');
    expect(mapWttrDescription('Light drizzle')).toBe('rainy');
  });

  it('maps snow/blizzard/ice descriptions to snow', () => {
    expect(mapWttrDescription('Moderate snow')).toBe('snow');
    expect(mapWttrDescription('Blizzard')).toBe('snow');
  });

  it('maps thunder descriptions to stormy', () => {
    expect(mapWttrDescription('Thundery outbreaks possible')).toBe('stormy');
  });

  it('returns windy when a clear/cloudy description has high wind speed', () => {
    expect(mapWttrDescription('Sunny', 35)).toBe('windy');
  });

  it('returns null for an unrecognized or missing description', () => {
    expect(mapWttrDescription('Something weird')).toBeNull();
    expect(mapWttrDescription(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/weatherMapping.test.js`
Expected: FAIL — `Cannot find module '../weatherMapping'`

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/weatherMapping.js`:

```js
/**
 * Pure mapping helpers for the match-screen header's time-of-day video and
 * weather icon. No network/storage/React here — see src/api/weather.js and
 * hooks/useHeaderWeather.js for the parts that use these.
 *
 * WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snow' | 'stormy' | 'windy'
 */

const WINDY_WIND_SPEED_KMH = 30;
const WINDY_WIND_SPEED_MS = 8; // ~30 km/h

/**
 * Buckets an hour-of-day (0-23, local time) into which background video
 * should play. Mirrors the hour boundaries match.jsx's getGreeting() already
 * uses: morning [5,12) and afternoon [12,17) share one video.
 * @param {number} hour
 * @returns {'morningAfternoon'|'evening'|'night'}
 */
export function getTimeOfDayVideoBucket(hour) {
  if (hour >= 5 && hour < 17) return 'morningAfternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Maps an Open-Meteo WMO weather code (+ optional wind speed in km/h) to our
 * shared WeatherCondition vocabulary. Returns null for codes we don't
 * recognize, signalling the caller to try the next provider.
 * @param {number} weatherCode
 * @param {number} [windSpeedKmh]
 * @returns {string|null}
 */
export function mapOpenMeteoCode(weatherCode, windSpeedKmh) {
  let base = null;
  if (weatherCode === 0 || weatherCode === 1) base = 'sunny';
  else if (weatherCode === 2 || weatherCode === 3 || weatherCode === 45 || weatherCode === 48) base = 'cloudy';
  else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) base = 'rainy';
  else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) base = 'snow';
  else if ([95, 96, 99].includes(weatherCode)) base = 'stormy';

  if (base === null) return null;
  if ((base === 'sunny' || base === 'cloudy') && typeof windSpeedKmh === 'number' && windSpeedKmh >= WINDY_WIND_SPEED_KMH) {
    return 'windy';
  }
  return base;
}

/**
 * Maps a MET Norway `symbol_code` (e.g. "clearsky_day", "lightrain") + optional
 * wind speed in m/s to our shared WeatherCondition vocabulary via substring
 * matching (MET Norway builds ~150 symbol codes from a handful of root
 * words). Returns null when no root word matches.
 * @param {string} symbolCode
 * @param {number} [windSpeedMs]
 * @returns {string|null}
 */
export function mapMetNorwaySymbol(symbolCode, windSpeedMs) {
  if (!symbolCode) return null;
  const code = symbolCode.toLowerCase();

  let base = null;
  if (code.includes('thunder')) base = 'stormy';
  else if (code.includes('sleet') || code.includes('snow')) base = 'snow';
  else if (code.includes('rain')) base = 'rainy';
  else if (code.includes('fog') || code.includes('cloud')) base = 'cloudy';
  else if (code.includes('clearsky') || code.includes('fair')) base = 'sunny';

  if (base === null) return null;
  if ((base === 'sunny' || base === 'cloudy') && typeof windSpeedMs === 'number' && windSpeedMs >= WINDY_WIND_SPEED_MS) {
    return 'windy';
  }
  return base;
}

/**
 * Maps a wttr.in human-readable weather description (e.g. "Patchy rain
 * possible", "Thundery outbreaks possible") + optional wind speed in km/h to
 * our shared WeatherCondition vocabulary via substring matching. Returns
 * null when no keyword matches.
 * @param {string} description
 * @param {number} [windSpeedKmh]
 * @returns {string|null}
 */
export function mapWttrDescription(description, windSpeedKmh) {
  if (!description) return null;
  const text = description.toLowerCase();

  let base = null;
  if (text.includes('thunder')) base = 'stormy';
  else if (text.includes('snow') || text.includes('blizzard') || text.includes('ice') || text.includes('sleet')) base = 'snow';
  else if (text.includes('rain') || text.includes('drizzle')) base = 'rainy';
  else if (text.includes('fog') || text.includes('mist') || text.includes('cloud') || text.includes('overcast')) base = 'cloudy';
  else if (text.includes('sunny') || text.includes('clear')) base = 'sunny';

  if (base === null) return null;
  if ((base === 'sunny' || base === 'cloudy') && typeof windSpeedKmh === 'number' && windSpeedKmh >= WINDY_WIND_SPEED_KMH) {
    return 'windy';
  }
  return base;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/utils/__tests__/weatherMapping.test.js`
Expected: PASS — all `describe` blocks green (26 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/weatherMapping.js src/utils/__tests__/weatherMapping.test.js
git commit -m "feat: add time-of-day and weather condition mapping helpers"
```

---

### Task 2: Multi-provider weather fetch (`src/api/weather.js`)

**Files:**
- Create: `src/api/weather.js`
- Test: `src/api/__tests__/weather.test.js`

**Interfaces:**
- Consumes: `mapOpenMeteoCode`, `mapMetNorwaySymbol`, `mapWttrDescription` from `../utils/weatherMapping` (Task 1).
- Produces: `fetchWeather(latitude: number, longitude: number): Promise<{condition: string, isDay: boolean, tempC: number|undefined} | null>` — never throws. Consumed by Task 3 (`hooks/useHeaderWeather.js`).

- [ ] **Step 1: Write the failing test**

Create `src/api/__tests__/weather.test.js`:

```js
import { fetchWeather } from '../weather';

describe('fetchWeather', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns the Open-Meteo result when the primary provider succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { temperature_2m: 22, weather_code: 0, is_day: 1, wind_speed_10m: 5 },
      }),
    });

    const result = await fetchWeather(12.34, 56.78);

    expect(result).toEqual({ condition: 'sunny', isDay: true, tempC: 22 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toContain('api.open-meteo.com');
  });

  it('falls back to MET Norway when Open-Meteo fails', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          properties: {
            timeseries: [{
              data: {
                instant: { details: { air_temperature: 10, wind_speed: 2 } },
                next_1_hours: { summary: { symbol_code: 'cloudy' } },
              },
            }],
          },
        }),
      });

    const result = await fetchWeather(12.34, 56.78);

    expect(result.condition).toBe('cloudy');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][0]).toContain('api.met.no');
  });

  it('falls back to wttr.in when Open-Meteo and MET Norway both fail', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current_condition: [{
            weatherDesc: [{ value: 'Patchy rain possible' }],
            windspeedKmph: '10',
            temp_C: '18',
          }],
        }),
      });

    const result = await fetchWeather(12.34, 56.78);

    expect(result.condition).toBe('rainy');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch.mock.calls[2][0]).toContain('wttr.in');
  });

  it('returns null when all three providers fail', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const result = await fetchWeather(12.34, 56.78);

    expect(result).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/api/__tests__/weather.test.js`
Expected: FAIL — `Cannot find module '../weather'`

- [ ] **Step 3: Write minimal implementation**

Create `src/api/weather.js`:

```js
import {
  mapOpenMeteoCode,
  mapMetNorwaySymbol,
  mapWttrDescription,
} from '../utils/weatherMapping';

const FETCH_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchOpenMeteo(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=auto`;
  const data = await fetchWithTimeout(url);
  const current = data?.current;
  if (!current || typeof current.weather_code !== 'number') {
    throw new Error('Open-Meteo response missing current.weather_code');
  }
  const condition = mapOpenMeteoCode(current.weather_code, current.wind_speed_10m);
  if (!condition) {
    throw new Error(`Open-Meteo returned unmapped weather_code ${current.weather_code}`);
  }
  return {
    condition,
    isDay: current.is_day === 1,
    tempC: current.temperature_2m,
  };
}

async function fetchMetNorway(latitude, longitude) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`;
  const data = await fetchWithTimeout(url, {
    headers: { 'User-Agent': 'Circle-App/1.0' },
  });
  const first = data?.properties?.timeseries?.[0];
  const details = first?.data?.instant?.details;
  const summary =
    first?.data?.next_1_hours?.summary?.symbol_code ||
    first?.data?.next_6_hours?.summary?.symbol_code;
  if (!summary) {
    throw new Error('MET Norway response missing symbol_code');
  }
  const condition = mapMetNorwaySymbol(summary, details?.wind_speed);
  if (!condition) {
    throw new Error(`MET Norway returned unmapped symbol_code ${summary}`);
  }
  const hour = new Date().getHours();
  return {
    condition,
    isDay: hour >= 6 && hour < 18,
    tempC: details?.air_temperature,
  };
}

async function fetchWttr(latitude, longitude) {
  const url = `https://wttr.in/${latitude},${longitude}?format=j1`;
  const data = await fetchWithTimeout(url);
  const current = data?.current_condition?.[0];
  const description = current?.weatherDesc?.[0]?.value;
  if (!description) {
    throw new Error('wttr.in response missing weatherDesc');
  }
  const windSpeedKmh = current.windspeedKmph ? Number(current.windspeedKmph) : undefined;
  const condition = mapWttrDescription(description, windSpeedKmh);
  if (!condition) {
    throw new Error(`wttr.in returned unmapped description "${description}"`);
  }
  const hour = new Date().getHours();
  return {
    condition,
    isDay: hour >= 6 && hour < 18,
    tempC: current.temp_C ? Number(current.temp_C) : undefined,
  };
}

const PROVIDERS = [fetchOpenMeteo, fetchMetNorway, fetchWttr];

/**
 * Tries each free/keyless weather provider in order (Open-Meteo, MET Norway,
 * wttr.in), returning the first successful, mappable result. Never throws —
 * resolves to null if every provider fails or returns unmappable data.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{condition: string, isDay: boolean, tempC: number|undefined}|null>}
 */
export async function fetchWeather(latitude, longitude) {
  for (const provider of PROVIDERS) {
    try {
      return await provider(latitude, longitude);
    } catch (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[weather] provider failed, trying next: ${error.message}`);
      }
    }
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/api/__tests__/weather.test.js`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/api/weather.js src/api/__tests__/weather.test.js
git commit -m "feat: add multi-provider weather fetch with automatic fallback"
```

---

### Task 3: `useHeaderWeather` hook

**Files:**
- Create: `hooks/useHeaderWeather.js`

**Interfaces:**
- Consumes: `fetchWeather` from `../src/api/weather` (Task 2).
- Produces: `useHeaderWeather(userLocation: {latitude: number, longitude: number} | null): { condition: string | null }`. Consumed by Task 4 (`match.jsx`).

No automated test for this task (per the approved design's Testing/Verification section — this hook's value is in its runtime AsyncStorage/AppState/interval integration, which is exercised manually in Task 5). Its two dependencies (`fetchWeather`'s fallback behavior and the mapping tables it relies on) are already unit-tested in Tasks 1-2.

- [ ] **Step 1: Write the implementation**

Create `hooks/useHeaderWeather.js`:

```js
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
```

- [ ] **Step 2: Verify it loads with no syntax errors**

Run: `node -e "const babel = require('@babel/core'); babel.transformFileSync('hooks/useHeaderWeather.js', { babelrc: true, configFile: './babel.config.js' }); console.log('PARSE OK');"`
Expected: `PARSE OK`

- [ ] **Step 3: Commit**

```bash
git add hooks/useHeaderWeather.js
git commit -m "feat: add useHeaderWeather hook with AsyncStorage caching and refresh"
```

---

### Task 4: Wire time-of-day video + weather icon into `match.jsx`

**Files:**
- Modify: `app/secure/(tabs)/match.jsx` (imports ~line 28, module-scope lookup tables ~line 336, `headerVideoPlayer` init ~line 433, new periodic-bucket effect after ~line 447, weather hook call ~line 449, JSX icon block ~lines 2438-2452)

**Interfaces:**
- Consumes: `getTimeOfDayVideoBucket` from `@/src/utils/weatherMapping` (Task 1), `useHeaderWeather` from `@/hooks/useHeaderWeather` (Task 3).

- [ ] **Step 1: Add new asset + module imports**

In `app/secure/(tabs)/match.jsx`, immediately after the existing line:
```js
import nightVideo from "@/assets/lottie/night.mp4";
```
add:
```js
import morningAfternoonVideo from "@/assets/lottie/morning-afternoon-sky.mp4";
import eveningVideo from "@/assets/lottie/evening-sky.mp4";
import sunnyWeatherLottie from "@/assets/lottie/sunny_weather.json";
import cloudyWeatherLottie from "@/assets/lottie/cloudy_weather.json";
import rainyWeatherLottie from "@/assets/lottie/rainy_weather.json";
import snowWeatherLottie from "@/assets/lottie/snow_weather.json";
import stormyWeatherLottie from "@/assets/lottie/lightening_weather.json";
import windyWeatherLottie from "@/assets/lottie/Breezy_Weather .json";
import { getTimeOfDayVideoBucket } from "@/src/utils/weatherMapping";
import { useHeaderWeather } from "@/hooks/useHeaderWeather";
```

**Note:** `Breezy_Weather .json` has a literal space before `.json` — this is the real filename on disk (verified via `ls assets/lottie/`). Copy the import path exactly as written above.

- [ ] **Step 2: Add module-scope lookup tables**

Find the `const mockMatches = [` line (module scope, after the `headerStyles`/`hexToRgba` definitions). Immediately before it, add:

```js
const TIME_OF_DAY_VIDEOS = {
  morningAfternoon: morningAfternoonVideo,
  evening: eveningVideo,
  night: nightVideo,
};

const WEATHER_ICONS = {
  sunny: sunnyWeatherLottie,
  cloudy: cloudyWeatherLottie,
  rainy: rainyWeatherLottie,
  snow: snowWeatherLottie,
  stormy: stormyWeatherLottie,
  windy: windyWeatherLottie,
};

const mockMatches = [
```
(i.e. keep the existing `const mockMatches = [` line and everything after it unchanged — only insert the two new objects above it.)

- [ ] **Step 3: Use the time-of-day bucket for the initial video source**

Replace:
```js
  const headerVideoPlayer = useVideoPlayer(nightVideo, (player) => {
    player.loop = true;
    player.muted = true;
  });
```
with:
```js
  const headerVideoPlayer = useVideoPlayer(
    TIME_OF_DAY_VIDEOS[getTimeOfDayVideoBucket(new Date().getHours())],
    (player) => {
      player.loop = true;
      player.muted = true;
    }
  );
```

- [ ] **Step 4: Re-check the time bucket periodically and swap the video source**

Immediately after the existing effect:
```js
  useEffect(() => {
    // Seek to the middle of the clip once loaded for the cropped background effect
    const subscription = headerVideoPlayer.addListener('sourceLoad', ({ duration }) => {
      if (duration > 0) {
        headerVideoPlayer.currentTime = duration / 2;
      }
      headerVideoPlayer.play();
    });
    return () => subscription.remove();
  }, [headerVideoPlayer]);
```
add a new effect:
```js
  useEffect(() => {
    // Device clock only — no network dependency, so this never fails. Keeps
    // a long-lived session's header video correct across bucket boundaries
    // (e.g. 5pm) without requiring an app restart. Replacing the source
    // re-triggers the 'sourceLoad' listener above, which re-seeks and plays.
    let currentBucket = getTimeOfDayVideoBucket(new Date().getHours());
    const intervalId = setInterval(() => {
      const nextBucket = getTimeOfDayVideoBucket(new Date().getHours());
      if (nextBucket !== currentBucket) {
        currentBucket = nextBucket;
        headerVideoPlayer.replaceAsync(TIME_OF_DAY_VIDEOS[nextBucket]);
      }
    }, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [headerVideoPlayer]);
```

- [ ] **Step 5: Call the weather hook and derive the icon source**

Find:
```js
  const [publicStats, setPublicStats] = useState({ totalUsers: 0, goal: 10000 });
```
Immediately before it, add:
```js
  const { condition: headerWeatherCondition } = useHeaderWeather(userLocation);
  const weatherIconSource = headerWeatherCondition ? WEATHER_ICONS[headerWeatherCondition] : animationLottie;

  const [publicStats, setPublicStats] = useState({ totalUsers: 0, goal: 10000 });
```
(i.e. keep the existing `useState` line, just insert the two new lines above it.)

- [ ] **Step 6: Swap the header icon's source in JSX**

Replace:
```jsx
                {Platform.OS !== 'web' ? (
                  <View style={styles.z_lottieContainer}>
                    <LottieView
                      source={animationLottie}
                      autoPlay
                      loop
                      speed={0.5}
                      style={styles.z_lottie}
                    />
                  </View>
                ) : (
```
with:
```jsx
                {Platform.OS !== 'web' ? (
                  <View style={styles.z_lottieContainer}>
                    <LottieView
                      key={headerWeatherCondition || 'sparkle'}
                      source={weatherIconSource}
                      autoPlay
                      loop
                      speed={0.5}
                      style={styles.z_lottie}
                    />
                  </View>
                ) : (
```
(the `key` forces Lottie to re-mount/re-initialize when the condition changes, since swapping only the `source` prop on a mounted `LottieView` doesn't reliably restart playback with the new animation.)

- [ ] **Step 7: Verify the file still parses and Metro can bundle it**

Run:
```bash
node -e "
const babel = require('@babel/core');
babel.transformFileSync('app/secure/(tabs)/match.jsx', { babelrc: true, configFile: './babel.config.js' });
console.log('PARSE OK');
"
curl -s -o /dev/null -w "bundle status: %{http_code}\n" "http://localhost:8081/app/secure/(tabs)/match.bundle?platform=ios&dev=true"
```
Expected: `PARSE OK` and `bundle status: 200`. (Metro must already be running — reuse the existing dev server on `localhost:8081` from this session if it's still up; otherwise start it with `npx expo start` first.)

- [ ] **Step 8: Commit**

```bash
git add "app/secure/(tabs)/match.jsx"
git commit -m "feat: drive match header video and icon from time-of-day and weather"
```

---

### Task 5: Manual verification

No new automated tests here — this is a runtime UI change, verified per the `verify` skill by exercising the actual app.

- [ ] **Step 1: Confirm the time-of-day video**

Reload the app on device/simulator. Check the current device time and confirm the header shows the matching video: `morning-afternoon-sky.mp4` for 5:00-16:59, `evening-sky.mp4` for 17:00-21:59, `night.mp4` otherwise. If feasible, change the device/simulator system clock across a boundary (e.g. to 16:59 then 17:01) and confirm the video updates within 15 minutes without an app restart (or force it sooner by temporarily lowering the interval during this check only, then confirming it's back to `15 * 60 * 1000` before committing anything further).

- [ ] **Step 2: Confirm the weather icon with a real location**

With location services enabled and permission granted, reload the app and confirm the icon next to the greeting matches real current local weather (compare against a weather app/website for the same coordinates) instead of the old static sparkle.

- [ ] **Step 3: Confirm the provider fallback chain**

Temporarily edit `src/api/weather.js`'s `fetchOpenMeteo` URL to an invalid host (e.g. `https://api.open-meteo-invalid.example.com/...`), reload, and confirm the icon still resolves correctly (now via MET Norway). Revert the edit. Repeat by breaking both Open-Meteo and MET Norway URLs to confirm wttr.in still resolves it. Revert all edits before continuing — `git diff src/api/weather.js` must be empty.

- [ ] **Step 4: Confirm the silent fallback**

Deny location permission (or disable location services) for the app, reload, and confirm the header shows the correct time-of-day video with the original sparkle icon in the weather-icon slot — no error banner, no loading spinner, no visual regression versus the app's current behavior.

- [ ] **Step 5: Final check**

Run `git status` and `git diff` to confirm no stray debug `console.log` statements or temporary test edits remain from Steps 1-4, then confirm all three commits from Tasks 1, 2, 3, 4 are present via `git log --oneline -5`.

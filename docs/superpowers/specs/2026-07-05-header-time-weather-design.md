# Match Screen Header: Time-of-Day Video + Weather Icon

## Goal

The Match screen header (`app/secure/(tabs)/match.jsx`) currently always shows the same background video (`night.mp4`) regardless of the actual time of day, and a static decorative sparkle Lottie animation next to the greeting regardless of real weather. The header already computes a time-of-day greeting (`getGreeting()`: Good Morning/Afternoon/Evening/Night) and already collects the user's location (`userLocation`, via the existing `recordUserLocation()` flow) for the Nearby-matching feature — this work makes the header's video and icon actually reflect that same time-of-day and the user's real local weather, reusing both of those existing signals rather than adding new ones.

## Scope

- **In scope**: the Gen-Z header block in `app/secure/(tabs)/match.jsx` (background video source, and the small icon rendered next to the greeting/name). A new `src/api/weather.ts` module. A new `hooks/useHeaderWeather.js` hook.
- **Out of scope**: any other screen. No new location-permission prompt (reuses `userLocation` state as-is). No UI for showing temperature, forecast, or any weather text — only the video + icon change.
- **Non-goal**: 100% weather accuracy or forecast features — this is a decorative header enhancement, not a weather product. If we can't get a confident reading, we silently do nothing rather than guess.

## Time-of-Day → Background Video

Pure function of the device clock (`new Date().getHours()`), no network dependency, so it never fails. Uses the exact same hour boundaries as the existing `getGreeting()`:

| Hours | Video |
|---|---|
| 5:00–16:59 | `assets/lottie/morning-afternoon-sky.mp4` |
| 17:00–21:59 | `assets/lottie/evening-sky.mp4` |
| 22:00–4:59 | `assets/lottie/night.mp4` |

Computed once on mount and re-checked every 15 minutes (cheap `setInterval`, cleared on unmount) so a session left open across a boundary (e.g. 5pm) picks up the new video without requiring an app restart. When the bucket changes, the existing `headerVideoPlayer` (an `expo-video` `useVideoPlayer` instance) is updated via `player.replaceAsync(newSource)` rather than remounting the `VideoView`, so the seek-to-middle/loop/mute setup already wired up keeps working.

## Weather → Icon

Replaces the current `animationLottie` (sparkle) Lottie in the `z_lottieContainer` slot when real weather data is available; falls back to that same sparkle whenever it isn't (see Fallback Behavior below).

### `src/api/weather.ts`

```ts
export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snow' | 'stormy' | 'windy';
export type WeatherResult = { condition: WeatherCondition; isDay: boolean; tempC: number } | null;

export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherResult>;
```

Tries three independent, free, keyless, open providers in order, returning the first success:

1. **Open-Meteo** (`api.open-meteo.com/v1/forecast`) — primary. No key, generous free tier, fully open-source project. Returns a numeric WMO weather code + `is_day`.
2. **MET Norway Locationforecast** (`api.met.no/weatherapi/locationforecast/2.0/compact`) — fallback 1. No key; free for any use with a descriptive `User-Agent` header (required by their terms — set to `"Circle-App/1.0"`). Returns a `symbol_code` string (e.g. `"clearsky_day"`, `"rain"`, `"heavysnow"`).
3. **wttr.in** (`wttr.in/<lat>,<lon>?format=j1`) — fallback 2. No key, open-source, simple JSON. Returns a weather description string + code.

Each call:
- Uses an `AbortController` with a ~6s timeout so one slow/hanging provider doesn't block the chain.
- Is wrapped in try/catch; a thrown error or non-2xx response just moves to the next provider.
- On success, maps that provider's own vocabulary to the shared `WeatherCondition` enum via a small lookup table local to that provider's branch (three separate mapping tables, since each provider encodes conditions differently — WMO numeric codes for Open-Meteo, `symbol_code` strings for MET Norway, description text for wttr.in).

If all three throw/timeout, `fetchWeather` resolves to `null` (never rejects — callers never need a catch).

### `hooks/useHeaderWeather.js`

```js
function useHeaderWeather(userLocation) {
  // returns { condition: WeatherCondition | null }
}
```

- Does nothing until `userLocation?.latitude` and `userLocation?.longitude` are present (no new permission request — purely reactive to the location the screen already collects).
- On first coordinates, and then every 20 minutes while mounted, and whenever `AppState` transitions to `'active'` with the cached result older than 15 minutes: calls `fetchWeather`.
- Persists the last successful `{ condition, fetchedAt }` to `AsyncStorage` (key `header_weather_cache_v1`) and hydrates from it synchronously on mount, so a returning user sees last-known weather immediately instead of the sparkle flashing in first.
- `fetchWeather` returning `null` leaves the last cached condition in place if one exists and is < 2 hours old (avoids flapping the icon back to sparkle on a single transient failure); beyond that staleness window, or if there's never been a successful fetch, `condition` is `null`.

## Fallback Behavior

- **Time-of-day video**: always applied — it has no failure mode (local clock only).
- **Weather icon**: shows the real weather Lottie only when `useHeaderWeather` returns a non-null `condition`. Whenever it's `null` (location permission denied, all three providers failed and no usable cache), the icon slot silently reverts to today's sparkle `animationLottie` — no error message, no loading spinner, no visual difference from the current app.

## Icon Mapping

| `WeatherCondition` | Asset |
|---|---|
| `sunny` | `assets/lottie/sunny_weather.json` |
| `cloudy` | `assets/lottie/cloudy_weather.json` |
| `rainy` | `assets/lottie/rainy_weather.json` |
| `snow` | `assets/lottie/snow_weather.json` |
| `stormy` | `assets/lottie/lightening_weather.json` |
| `windy` | `assets/lottie/Breezy_Weather.json` |

`isDay` from the weather result is not currently used for icon selection (no day/night variants among the provided Lottie files) — kept on the result type for potential future use, not wired to anything yet.

## Changes to `match.jsx`

1. Add `getTimeOfDayVideoSource()` helper (module scope, mirrors `getGreeting`'s hour buckets) and a small `useEffect` recomputing it every 15 min, calling `headerVideoPlayer.replaceAsync(...)` on change.
2. Call `useHeaderWeather(userLocation)`; derive `weatherIconSource` from its `condition` via the mapping table above (`null` → keep using `animationLottie`).
3. In the `z_lottieContainer` block, swap the hardcoded `source={animationLottie}` for `source={weatherIconSource || animationLottie}` (native branch only; the web branch already renders a static `Ionicons` sparkle and is unchanged).
4. No changes to `userLocation`/`recordUserLocation` — consumed as-is.

## Error Handling

- Network/timeout/parsing errors inside `fetchWeather` are caught per-provider and never thrown to the caller.
- AsyncStorage read/write failures (corrupt cache, storage full) are caught and treated as "no cache" — never crash the header.
- No user-facing error state anywhere in this feature, per Fallback Behavior above.

## Testing / Verification

- Unit-testable pure logic: the three provider→`WeatherCondition` mapping tables and `getTimeOfDayVideoSource`'s hour-boundary logic (project already has `jest.config.js` / `@testing-library/react-native`). Add focused tests for these mapping functions with representative inputs (a code from each condition bucket, and boundary hours like 4:59/5:00/16:59/17:00/21:59/22:00).
- Manual verification (per the `verify` skill, this touches runtime UI): run the app, confirm the header video matches current device time, and confirm the weather icon matches the actual current local weather. Temporarily force each provider to fail (e.g. by pointing its URL at an invalid host) to confirm the chain falls through to the next one, and confirm airplane mode / denied location permission leaves the header exactly as it looks today.

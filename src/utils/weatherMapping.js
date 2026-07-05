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

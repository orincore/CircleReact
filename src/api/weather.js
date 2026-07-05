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

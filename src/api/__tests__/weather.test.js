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

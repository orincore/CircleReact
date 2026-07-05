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

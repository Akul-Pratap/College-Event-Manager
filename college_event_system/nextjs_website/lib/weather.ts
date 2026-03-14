/**
 * lib/weather.ts — OpenWeatherMap client + auto theme engine
 * LTSU College Event Management System
 *
 * Fetches current weather for a location and returns a theme name
 * based on the combination of time-of-day and weather condition.
 *
 * Themes: morning | afternoon | evening | night | rainy | sunny | cloudy
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ThemeName =
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "rainy"
  | "sunny"
  | "cloudy";

export interface WeatherData {
  city: string;
  country: string;
  temperature: number;       // Celsius
  feelsLike: number;         // Celsius
  humidity: number;          // %
  condition: string;         // e.g. "Rain", "Clear", "Clouds"
  conditionId: number;       // OpenWeatherMap condition code
  conditionDescription: string; // e.g. "light rain"
  icon: string;              // OWM icon code, e.g. "10d"
  windSpeed: number;         // m/s
  visibility: number;        // metres
  sunrise: number;           // Unix timestamp
  sunset: number;            // Unix timestamp
  timezone: number;          // UTC offset in seconds
  fetchedAt: number;         // Date.now()
}

export interface ThemeResult {
  theme: ThemeName;
  weather: WeatherData | null;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  isWeatherDriven: boolean;  // true = weather overrode time-of-day theme
  label: string;             // human-readable description
  emoji: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const OWM_BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

// Cache duration: 10 minutes (weather doesn't change that fast)
const CACHE_TTL_MS = 10 * 60 * 1000;

// Default location: LTSU campus approximate coordinates (Himachal Pradesh, India)
const DEFAULT_LAT = 32.2432;
const DEFAULT_LON = 76.3234;

// OpenWeatherMap condition code ranges
// https://openweathermap.org/weather-conditions
const THUNDERSTORM_RANGE = [200, 299];
const DRIZZLE_RANGE      = [300, 399];
const RAIN_RANGE         = [500, 531];
const SNOW_RANGE         = [600, 622];
const ATMOSPHERE_RANGE   = [700, 781]; // fog, haze, dust, etc.
const CLEAR_CODE         = 800;
const CLOUDS_RANGE       = [801, 804];

// ─────────────────────────────────────────────────────────────────────────────
// In-memory cache (server-side)
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: WeatherData;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// ─────────────────────────────────────────────────────────────────────────────
// Core: Fetch weather from OpenWeatherMap
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch current weather data for the given coordinates.
 * Results are cached in memory for CACHE_TTL_MS to avoid rate-limiting.
 *
 * @param lat  Latitude  (default: LTSU campus)
 * @param lon  Longitude (default: LTSU campus)
 * @returns    WeatherData or null on error
 */
export async function fetchWeather(
  lat: number = DEFAULT_LAT,
  lon: number = DEFAULT_LON
): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.warn("[weather] OPENWEATHER_API_KEY is not set — skipping weather fetch.");
    return null;
  }

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const url = new URL(OWM_BASE_URL);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("appid", apiKey);
    url.searchParams.set("units", "metric");
    url.searchParams.set("lang", "en");

    const response = await fetch(url.toString(), {
      next: { revalidate: 600 }, // Next.js fetch cache: 10 minutes
    });

    if (!response.ok) {
      console.error(`[weather] OWM API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const raw = await response.json();
    const data = parseOWMResponse(raw);

    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } catch (err) {
    console.error("[weather] Fetch failed:", err);
    return null;
  }
}

/**
 * Fetch weather by city name instead of coordinates.
 * Useful when coordinates are not available.
 */
export async function fetchWeatherByCity(
  city: string,
  countryCode: string = "IN"
): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  const cacheKey = `city:${city.toLowerCase()},${countryCode.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const url = new URL(OWM_BASE_URL);
    url.searchParams.set("q", `${city},${countryCode}`);
    url.searchParams.set("appid", apiKey);
    url.searchParams.set("units", "metric");
    url.searchParams.set("lang", "en");

    const response = await fetch(url.toString(), {
      next: { revalidate: 600 },
    });

    if (!response.ok) return null;

    const raw = await response.json();
    const data = parseOWMResponse(raw);
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: Determine theme
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the current UI theme based on time-of-day and live weather.
 *
 * Priority:
 *   1. Severe weather (thunderstorm, heavy rain, snow) → always override
 *   2. Light rain / drizzle                            → rainy theme
 *   3. Clear sky during day hours                     → sunny theme
 *   4. Overcast / heavy clouds                        → cloudy theme
 *   5. Time of day (morning / afternoon / evening / night)
 *
 * @param lat  Latitude  (optional)
 * @param lon  Longitude (optional)
 */
export async function getTheme(
  lat?: number,
  lon?: number
): Promise<ThemeResult> {
  const weather = await fetchWeather(
    lat ?? DEFAULT_LAT,
    lon ?? DEFAULT_LON
  );

  const timeOfDay = getCurrentTimeOfDay();
  const { theme, isWeatherDriven } = resolveTheme(weather, timeOfDay);

  return {
    theme,
    weather,
    timeOfDay,
    isWeatherDriven,
    label: getThemeLabel(theme),
    emoji: getThemeEmoji(theme),
  };
}

/**
 * Get the theme synchronously using only time-of-day (no API call).
 * Use this as the fallback when weather is unavailable or on the client.
 */
export function getTimeBasedTheme(): ThemeResult {
  const timeOfDay = getCurrentTimeOfDay();
  const theme: ThemeName =
    timeOfDay === "morning"   ? "morning"   :
    timeOfDay === "afternoon" ? "afternoon" :
    timeOfDay === "evening"   ? "evening"   :
    "night";

  return {
    theme,
    weather: null,
    timeOfDay,
    isWeatherDriven: false,
    label: getThemeLabel(theme),
    emoji: getThemeEmoji(theme),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme Resolution Logic
// ─────────────────────────────────────────────────────────────────────────────

function resolveTheme(
  weather: WeatherData | null,
  timeOfDay: ThemeResult["timeOfDay"]
): { theme: ThemeName; isWeatherDriven: boolean } {
  if (!weather) {
    // No weather data — fall back to time-of-day
    return { theme: timeOfDay, isWeatherDriven: false };
  }

  const id = weather.conditionId;
  const isNight = timeOfDay === "night";

  // ── Thunderstorm (200–299) → always rainy/dark ─────────────────────────────
  if (id >= THUNDERSTORM_RANGE[0] && id <= THUNDERSTORM_RANGE[1]) {
    return { theme: "rainy", isWeatherDriven: true };
  }

  // ── Drizzle (300–399) → rainy ──────────────────────────────────────────────
  if (id >= DRIZZLE_RANGE[0] && id <= DRIZZLE_RANGE[1]) {
    return { theme: "rainy", isWeatherDriven: true };
  }

  // ── Rain (500–531) → rainy ─────────────────────────────────────────────────
  if (id >= RAIN_RANGE[0] && id <= RAIN_RANGE[1]) {
    return { theme: "rainy", isWeatherDriven: true };
  }

  // ── Snow (600–622) → cloudy (closest available theme) ─────────────────────
  if (id >= SNOW_RANGE[0] && id <= SNOW_RANGE[1]) {
    return { theme: "cloudy", isWeatherDriven: true };
  }

  // ── Atmosphere (fog, haze, dust — 700–781) → cloudy ───────────────────────
  if (id >= ATMOSPHERE_RANGE[0] && id <= ATMOSPHERE_RANGE[1]) {
    return { theme: "cloudy", isWeatherDriven: true };
  }

  // ── Clear sky (800) ────────────────────────────────────────────────────────
  if (id === CLEAR_CODE) {
    if (isNight) return { theme: "night", isWeatherDriven: false };
    if (timeOfDay === "morning") return { theme: "morning", isWeatherDriven: false };
    if (timeOfDay === "evening") return { theme: "evening", isWeatherDriven: false };
    return { theme: "sunny", isWeatherDriven: true }; // clear afternoon = sunny
  }

  // ── Clouds (801–804) ───────────────────────────────────────────────────────
  if (id >= CLOUDS_RANGE[0] && id <= CLOUDS_RANGE[1]) {
    if (isNight) return { theme: "night", isWeatherDriven: false };
    if (id >= 803) return { theme: "cloudy", isWeatherDriven: true }; // broken/overcast
    // Few/scattered clouds — use time-of-day
    return { theme: timeOfDay, isWeatherDriven: false };
  }

  // ── Default: time-of-day ───────────────────────────────────────────────────
  return { theme: timeOfDay, isWeatherDriven: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Time-of-Day Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the time-of-day bucket for the current local time.
 *
 * Morning:   05:00 – 11:59
 * Afternoon: 12:00 – 16:59
 * Evening:   17:00 – 20:59
 * Night:     21:00 – 04:59
 */
export function getCurrentTimeOfDay(): ThemeResult["timeOfDay"] {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * Returns the time-of-day for an arbitrary hour (0–23).
 * Useful for server-side rendering with a specific timezone offset.
 */
export function getTimeOfDayForHour(hour: number): ThemeResult["timeOfDay"] {
  if (hour >= 5  && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * Convert a Unix timestamp + UTC offset to a local hour (0–23).
 * Useful when you want to display sunrise/sunset in local time.
 */
export function utcTimestampToLocalHour(
  unixTimestamp: number,
  utcOffsetSeconds: number
): number {
  const localMs = (unixTimestamp + utcOffsetSeconds) * 1000;
  const localDate = new Date(localMs);
  return localDate.getUTCHours();
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme Metadata
// ─────────────────────────────────────────────────────────────────────────────

const THEME_LABELS: Record<ThemeName, string> = {
  morning:   "Morning",
  afternoon: "Afternoon",
  evening:   "Evening",
  night:     "Night",
  rainy:     "Rainy",
  sunny:     "Sunny",
  cloudy:    "Cloudy",
};

const THEME_EMOJIS: Record<ThemeName, string> = {
  morning:   "🌅",
  afternoon: "☀️",
  evening:   "🌆",
  night:     "🌙",
  rainy:     "🌧️",
  sunny:     "🌞",
  cloudy:    "⛅",
};

export function getThemeLabel(theme: ThemeName): string {
  return THEME_LABELS[theme] ?? theme;
}

export function getThemeEmoji(theme: ThemeName): string {
  return THEME_EMOJIS[theme] ?? "🌤️";
}

/**
 * Returns the CSS class name to apply to the <html> element for the given theme.
 * Matches the .theme-* classes defined in globals.css.
 */
export function getThemeCssClass(theme: ThemeName): string {
  return `theme-${theme}`;
}

/**
 * Returns whether the given theme is considered a "dark" theme.
 * Used to set the `dark` class on <html> for Tailwind dark mode.
 */
export function isDarkTheme(theme: ThemeName): boolean {
  return theme === "night" || theme === "evening" || theme === "rainy";
}

/**
 * Returns all available themes in display order.
 */
export function getAllThemes(): { name: ThemeName; label: string; emoji: string }[] {
  return (Object.keys(THEME_LABELS) as ThemeName[]).map((name) => ({
    name,
    label: THEME_LABELS[name],
    emoji: THEME_EMOJIS[name],
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Response Parser
// ─────────────────────────────────────────────────────────────────────────────

type OWMResponse = {
  name?: string;
  sys?: { country?: string; sunrise?: number; sunset?: number };
  main?: { temp?: number; feels_like?: number; humidity?: number };
  wind?: { speed?: number };
  visibility?: number;
  timezone?: number;
  weather?: Array<{
    main?: string;
    id?: number;
    description?: string;
    icon?: string;
  }>;
};

function parseOWMResponse(raw: OWMResponse): WeatherData {
  return {
    city:                 raw.name ?? "Unknown",
    country:              raw.sys?.country ?? "IN",
    temperature:          Math.round(raw.main?.temp ?? 0),
    feelsLike:            Math.round(raw.main?.feels_like ?? 0),
    humidity:             raw.main?.humidity ?? 0,
    condition:            raw.weather?.[0]?.main ?? "Clear",
    conditionId:          raw.weather?.[0]?.id ?? 800,
    conditionDescription: raw.weather?.[0]?.description ?? "",
    icon:                 raw.weather?.[0]?.icon ?? "01d",
    windSpeed:            raw.wind?.speed ?? 0,
    visibility:           raw.visibility ?? 10000,
    sunrise:              raw.sys?.sunrise ?? 0,
    sunset:               raw.sys?.sunset ?? 0,
    timezone:             raw.timezone ?? 19800, // IST default (+5:30)
    fetchedAt:            Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Weather condition helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the weather condition indicates rain of any kind. */
export function isRainy(weather: WeatherData): boolean {
  const id = weather.conditionId;
  return (
    (id >= THUNDERSTORM_RANGE[0] && id <= THUNDERSTORM_RANGE[1]) ||
    (id >= DRIZZLE_RANGE[0]      && id <= DRIZZLE_RANGE[1])      ||
    (id >= RAIN_RANGE[0]         && id <= RAIN_RANGE[1])
  );
}

/** Returns true if the sky is clear. */
export function isClear(weather: WeatherData): boolean {
  return weather.conditionId === CLEAR_CODE;
}

/** Returns true if the sky is overcast or heavily clouded. */
export function isOvercast(weather: WeatherData): boolean {
  return weather.conditionId >= 803 && weather.conditionId <= 804;
}

/** Returns true if it is currently snowing. */
export function isSnowing(weather: WeatherData): boolean {
  return weather.conditionId >= SNOW_RANGE[0] && weather.conditionId <= SNOW_RANGE[1];
}

/**
 * Returns the full URL of the weather icon from OpenWeatherMap CDN.
 *
 * @param icon  Icon code from WeatherData.icon (e.g. "10d")
 * @param size  "1x" | "2x" | "4x" (default "2x")
 */
export function getWeatherIconUrl(icon: string, size: "1x" | "2x" | "4x" = "2x"): string {
  return `https://openweathermap.org/img/wn/${icon}@${size}.png`;
}

/**
 * Format temperature for display (e.g. "28°C").
 */
export function formatTemperature(celsius: number): string {
  return `${Math.round(celsius)}°C`;
}

/**
 * Format wind speed for display (e.g. "12 km/h").
 * Converts m/s to km/h.
 */
export function formatWindSpeed(ms: number): string {
  return `${Math.round(ms * 3.6)} km/h`;
}

/**
 * Format a Unix timestamp as a local time string (e.g. "06:15 AM").
 *
 * @param unixTimestamp  Seconds since epoch.
 * @param utcOffset      UTC offset in seconds (from WeatherData.timezone).
 */
export function formatLocalTime(
  unixTimestamp: number,
  utcOffset: number
): string {
  const localMs = (unixTimestamp + utcOffset) * 1000;
  const d = new Date(localMs);
  const hours   = d.getUTCHours();
  const minutes = d.getUTCMinutes().toString().padStart(2, "0");
  const ampm    = hours >= 12 ? "PM" : "AM";
  const h12     = hours % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

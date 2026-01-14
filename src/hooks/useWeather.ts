import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  isDay: boolean;
}

export interface ForecastDay {
  date: string;
  dayName: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  windSpeedMax: number;
}

export interface WeatherWithForecast {
  current: WeatherData;
  forecast: ForecastDay[];
}

export interface UserWeatherLocation {
  lat: number;
  lon: number;
  name: string;
}

// Weather codes from Open-Meteo WMO codes
const WEATHER_DESCRIPTIONS: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Foggy", icon: "🌫️" },
  48: { label: "Depositing rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌧️" },
  53: { label: "Moderate drizzle", icon: "🌧️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  56: { label: "Light freezing drizzle", icon: "🌨️" },
  57: { label: "Dense freezing drizzle", icon: "🌨️" },
  61: { label: "Slight rain", icon: "🌧️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Light freezing rain", icon: "🌨️" },
  67: { label: "Heavy freezing rain", icon: "🌨️" },
  71: { label: "Slight snow", icon: "🌨️" },
  73: { label: "Moderate snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "❄️" },
  80: { label: "Slight rain showers", icon: "🌦️" },
  81: { label: "Moderate rain showers", icon: "🌦️" },
  82: { label: "Violent rain showers", icon: "⛈️" },
  85: { label: "Slight snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "🌨️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with slight hail", icon: "⛈️" },
  99: { label: "Thunderstorm with heavy hail", icon: "⛈️" },
};

export function getWeatherInfo(code: number) {
  return WEATHER_DESCRIPTIONS[code] || { label: "Unknown", icon: "🌡️" };
}

// Default location: Phoenix, AZ
const DEFAULT_LOCATION: UserWeatherLocation = {
  lat: 33.4484,
  lon: -112.0740,
  name: "Phoenix, AZ",
};

// Preset locations for Arizona service areas
export const PRESET_LOCATIONS: UserWeatherLocation[] = [
  { lat: 33.4484, lon: -112.0740, name: "Phoenix, AZ" },
  { lat: 33.4152, lon: -111.8315, name: "Scottsdale, AZ" },
  { lat: 33.3528, lon: -111.7890, name: "Mesa, AZ" },
  { lat: 33.4373, lon: -112.3496, name: "Glendale, AZ" },
  { lat: 33.3942, lon: -111.9281, name: "Tempe, AZ" },
  { lat: 33.3061, lon: -111.8413, name: "Gilbert, AZ" },
  { lat: 33.5387, lon: -112.1860, name: "Peoria, AZ" },
  { lat: 33.6095, lon: -112.2276, name: "Surprise, AZ" },
  { lat: 33.3083, lon: -112.0347, name: "Chandler, AZ" },
  { lat: 33.4255, lon: -111.9400, name: "Old Town Scottsdale, AZ" },
  { lat: 34.5400, lon: -112.4685, name: "Prescott, AZ" },
  { lat: 32.2226, lon: -110.9747, name: "Tucson, AZ" },
  { lat: 35.1983, lon: -111.6513, name: "Flagstaff, AZ" },
];

// Hook to get user's saved weather location
export function useUserWeatherLocation() {
  return useQuery({
    queryKey: ["user-weather-location"],
    queryFn: async (): Promise<UserWeatherLocation> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return DEFAULT_LOCATION;

      const { data, error } = await supabase
        .from("profiles")
        .select("weather_location_lat, weather_location_lon, weather_location_name")
        .eq("id", user.id)
        .single();

      if (error || !data) return DEFAULT_LOCATION;

      return {
        lat: data.weather_location_lat || DEFAULT_LOCATION.lat,
        lon: data.weather_location_lon || DEFAULT_LOCATION.lon,
        name: data.weather_location_name || DEFAULT_LOCATION.name,
      };
    },
  });
}

// Hook to update user's weather location
export function useUpdateWeatherLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (location: UserWeatherLocation) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          weather_location_lat: location.lat,
          weather_location_lon: location.lon,
          weather_location_name: location.name,
        })
        .eq("id", user.id);

      if (error) throw error;
      return location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-weather-location"] });
      queryClient.invalidateQueries({ queryKey: ["weather"] });
      toast.success("Weather location updated");
    },
    onError: (error) => {
      toast.error("Failed to update location: " + error.message);
    },
  });
}

export function useWeather() {
  const { data: location } = useUserWeatherLocation();

  return useQuery({
    queryKey: ["weather", location?.lat, location?.lon],
    queryFn: async (): Promise<WeatherWithForecast> => {
      const lat = location?.lat || DEFAULT_LOCATION.lat;
      const lon = location?.lon || DEFAULT_LOCATION.lon;

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=6`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }

      const data = await response.json();
      const current = data.current;
      const daily = data.daily;

      // Parse forecast days (skip today, get next 5 days)
      const forecast: ForecastDay[] = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      
      for (let i = 1; i <= 5; i++) {
        if (daily.time[i]) {
          const date = new Date(daily.time[i]);
          forecast.push({
            date: daily.time[i],
            dayName: dayNames[date.getDay()],
            weatherCode: daily.weather_code[i],
            tempMax: Math.round(daily.temperature_2m_max[i]),
            tempMin: Math.round(daily.temperature_2m_min[i]),
            precipitationProbability: daily.precipitation_probability_max[i] || 0,
            windSpeedMax: Math.round(daily.wind_speed_10m_max[i]),
          });
        }
      }

      return {
        current: {
          temperature: Math.round(current.temperature_2m),
          apparentTemperature: Math.round(current.apparent_temperature),
          weatherCode: current.weather_code,
          windSpeed: Math.round(current.wind_speed_10m),
          humidity: current.relative_humidity_2m,
          precipitation: current.precipitation,
          isDay: current.is_day === 1,
        },
        forecast,
      };
    },
    enabled: !!location,
    refetchInterval: 600000, // Refresh every 10 minutes
    staleTime: 300000, // Consider data stale after 5 minutes
  });
}

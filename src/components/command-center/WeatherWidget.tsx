import { useWeather, getWeatherInfo, useUserWeatherLocation, useUpdateWeatherLocation, PRESET_LOCATIONS, ForecastDay } from "@/hooks/useWeather";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wind, Droplets, MapPin, AlertTriangle, Settings2, Check, CloudRain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
export function WeatherWidget() {
  const {
    data: weatherData,
    isLoading: weatherLoading,
    error
  } = useWeather();
  const {
    data: userLocation,
    isLoading: locationLoading
  } = useUserWeatherLocation();
  const updateLocation = useUpdateWeatherLocation();
  const isLoading = weatherLoading || locationLoading;
  if (isLoading) {
    return <Card className="border border-border/50 bg-card/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2 mt-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        </CardContent>
      </Card>;
  }
  if (error || !weatherData) {
    return <Card className="border border-border/50 bg-card/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">Weather unavailable</span>
          </div>
        </CardContent>
      </Card>;
  }
  const weather = weatherData.current;
  const forecast = weatherData.forecast;
  const weatherInfo = getWeatherInfo(weather.weatherCode);

  // Determine work conditions
  const getWorkConditions = () => {
    // Bad conditions
    if (weather.precipitation > 0.1) {
      return {
        label: "Poor - Active Precipitation",
        variant: "destructive" as const
      };
    }
    if (weather.weatherCode >= 95) {
      return {
        label: "Dangerous - Storms",
        variant: "destructive" as const
      };
    }
    if (weather.temperature > 110) {
      return {
        label: "Extreme Heat Warning",
        variant: "destructive" as const
      };
    }
    if (weather.temperature < 32) {
      return {
        label: "Freezing Conditions",
        variant: "destructive" as const
      };
    }
    if (weather.windSpeed > 25) {
      return {
        label: "High Wind Warning",
        variant: "destructive" as const
      };
    }

    // Caution conditions
    if (weather.temperature > 100) {
      return {
        label: "Heat Advisory",
        variant: "secondary" as const
      };
    }
    if (weather.windSpeed > 15) {
      return {
        label: "Windy - Use Caution",
        variant: "secondary" as const
      };
    }
    if (weather.weatherCode >= 51 && weather.weatherCode <= 55) {
      return {
        label: "Light Rain Possible",
        variant: "secondary" as const
      };
    }

    // Good conditions
    return {
      label: "Good for Outdoor Work",
      variant: "outline" as const
    };
  };
  const conditions = getWorkConditions();
  return <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/40 overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Current Weather */}
        <div className="gap-4 flex-row flex items-center justify-between">
          {/* Left side - Main weather display */}
          <div className="flex items-center gap-4">
            <div className="text-4xl">{weatherInfo.icon}</div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {weather.temperature}°F
                </span>
                <span className="text-sm text-muted-foreground">
                  Feels {weather.apparentTemperature}°
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{weatherInfo.label}</p>
              
              {/* Location with dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-primary transition-colors mt-0.5 group">
                    <MapPin className="w-3 h-3" />
                    <span>{userLocation?.name || "Phoenix, AZ"}</span>
                    <Settings2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Select Location</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PRESET_LOCATIONS.map(location => <DropdownMenuItem key={location.name} onClick={() => updateLocation.mutate(location)} className={cn("cursor-pointer", userLocation?.name === location.name && "bg-primary/10")}>
                      <span className="flex-1">{location.name}</span>
                      {userLocation?.name === location.name && <Check className="w-4 h-4 text-primary" />}
                    </DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Right side - Details & conditions */}
          <div className="flex flex-col items-end gap-2">
            <Badge variant={conditions.variant} className="whitespace-nowrap">
              {conditions.label}
            </Badge>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Wind className="w-3 h-3" />
                {weather.windSpeed} mph
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                {weather.humidity}%
              </span>
            </div>
          </div>
        </div>

        {/* 5-Day Forecast */}
        {forecast && forecast.length > 0 && <div className="pt-3 border-t border-border/30">
            <p className="text-xs font-medium text-muted-foreground mb-3">5-Day Forecast</p>
            <div className="grid grid-cols-5 gap-2">
              {forecast.map(day => <ForecastDayCard key={day.date} day={day} />)}
            </div>
          </div>}
      </CardContent>
    </Card>;
}
function ForecastDayCard({
  day
}: {
  day: ForecastDay;
}) {
  const weatherInfo = getWeatherInfo(day.weatherCode);
  const hasRainRisk = day.precipitationProbability > 30;
  const hasHighWind = day.windSpeedMax > 20;

  // Determine if this is a concerning day for outdoor work
  const isConcerning = hasRainRisk || hasHighWind || day.tempMax > 105 || day.tempMin < 35;
  return <div className={cn("p-2 rounded-lg text-center transition-all px-0 pb-[4px] pt-[5px] mb-0 ml-[15px] mr-[67px] flex-row flex items-start justify-start", isConcerning ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/30 border border-transparent")}>
      <span className="text-xs font-medium text-foreground">{day.dayName}</span>
      <span className="text-xl my-1">{weatherInfo.icon}</span>
      <div className="flex items-center gap-1 text-xs">
        <span className="font-medium text-foreground">{day.tempMax}°</span>
        <span className="text-muted-foreground">{day.tempMin}°</span>
      </div>
      {hasRainRisk && <span className="flex items-center gap-0.5 text-[10px] text-blue-500 mt-1">
          <CloudRain className="w-2.5 h-2.5" />
          {day.precipitationProbability}%
        </span>}
      {hasHighWind && !hasRainRisk && <span className="flex items-center gap-0.5 text-[10px] text-amber-500 mt-1">
          <Wind className="w-2.5 h-2.5" />
          {day.windSpeedMax}
        </span>}
    </div>;
}
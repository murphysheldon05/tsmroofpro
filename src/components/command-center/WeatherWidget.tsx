import { useWeather, getWeatherInfo } from "@/hooks/useWeather";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wind, Droplets, Thermometer, CloudRain, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function WeatherWidget() {
  const { data: weather, isLoading, error } = useWeather();

  if (isLoading) {
    return (
      <Card className="border border-border/50 bg-card/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="border border-border/50 bg-card/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">Weather unavailable</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weatherInfo = getWeatherInfo(weather.weatherCode);
  
  // Determine work conditions
  const getWorkConditions = () => {
    // Bad conditions
    if (weather.precipitation > 0.1) {
      return { label: "Poor - Active Precipitation", variant: "destructive" as const };
    }
    if (weather.weatherCode >= 95) {
      return { label: "Dangerous - Storms", variant: "destructive" as const };
    }
    if (weather.temperature > 110) {
      return { label: "Extreme Heat Warning", variant: "destructive" as const };
    }
    if (weather.temperature < 32) {
      return { label: "Freezing Conditions", variant: "destructive" as const };
    }
    if (weather.windSpeed > 25) {
      return { label: "High Wind Warning", variant: "destructive" as const };
    }
    
    // Caution conditions
    if (weather.temperature > 100) {
      return { label: "Heat Advisory", variant: "secondary" as const };
    }
    if (weather.windSpeed > 15) {
      return { label: "Windy - Use Caution", variant: "secondary" as const };
    }
    if (weather.weatherCode >= 51 && weather.weatherCode <= 55) {
      return { label: "Light Rain Possible", variant: "secondary" as const };
    }
    
    // Good conditions
    return { label: "Good for Outdoor Work", variant: "outline" as const };
  };

  const conditions = getWorkConditions();

  return (
    <Card className="border border-border/50 bg-gradient-to-br from-card/80 to-card/40 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
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
              <p className="text-xs text-muted-foreground/70">Phoenix, AZ</p>
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
              {weather.precipitation > 0 && (
                <span className="flex items-center gap-1 text-blue-500">
                  <CloudRain className="w-3 h-3" />
                  {weather.precipitation}"
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

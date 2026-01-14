import { useState } from "react";
import { useWeather, getWeatherInfo, useUserWeatherLocation, useUpdateWeatherLocation, PRESET_LOCATIONS } from "@/hooks/useWeather";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wind, Droplets, MapPin, AlertTriangle, Settings2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WeatherWidget() {
  const { data: weather, isLoading: weatherLoading, error } = useWeather();
  const { data: userLocation, isLoading: locationLoading } = useUserWeatherLocation();
  const updateLocation = useUpdateWeatherLocation();

  const isLoading = weatherLoading || locationLoading;

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
                  {PRESET_LOCATIONS.map((location) => (
                    <DropdownMenuItem
                      key={location.name}
                      onClick={() => updateLocation.mutate(location)}
                      className={cn(
                        "cursor-pointer",
                        userLocation?.name === location.name && "bg-primary/10"
                      )}
                    >
                      <span className="flex-1">{location.name}</span>
                      {userLocation?.name === location.name && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
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
      </CardContent>
    </Card>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Loader2 } from "lucide-react";
import type { Location, WeatherResponse, DistanceResponse } from "@shared/schema";

interface WeatherInfoProps {
  location: Location;
  userLocation: Location;
}

const weatherIcons: Record<string, any> = {
  "01d": Sun,
  "01n": Sun,
  "02d": Cloud,
  "02n": Cloud,
  "03d": Cloud,
  "03n": Cloud,
  "04d": Cloud,
  "04n": Cloud,
  "09d": CloudRain,
  "09n": CloudRain,
  "10d": CloudRain,
  "10n": CloudRain,
};

export default function WeatherInfo({ location, userLocation }: WeatherInfoProps) {
  const weatherQuery = useQuery<WeatherResponse>({
    queryKey: ["/api/weather", location.lat, location.lng],
    queryFn: async () => {
      console.log("Fetching weather for location:", location);
      const response = await fetch(`/api/weather?lat=${location.lat}&lng=${location.lng}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch weather data");
      }
      const data = await response.json();
      console.log("Weather API response:", data);
      return data;
    },
  });

  const distanceQuery = useQuery<DistanceResponse>({
    queryKey: ["/api/distance", userLocation, location],
    queryFn: async () => {
      console.log("Fetching distance between:", { userLocation, location });
      const response = await fetch(
        `/api/distance?origin[lat]=${userLocation.lat}&origin[lng]=${userLocation.lng}&destination[lat]=${location.lat}&destination[lng]=${location.lng}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to calculate travel time");
      }
      const data = await response.json();
      console.log("Distance API response:", data);
      return data;
    },
  });

  if (weatherQuery.isLoading || distanceQuery.isLoading) {
    return (
      <Card className="absolute bottom-4 left-4 w-96">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Loading weather and travel info...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (weatherQuery.error || distanceQuery.error) {
    console.error("Query errors:", {
      weatherError: weatherQuery.error,
      distanceError: distanceQuery.error
    });
    return (
      <Card className="absolute bottom-4 left-4 w-96">
        <CardContent className="p-4">
          <p className="text-destructive">
            {(weatherQuery.error as Error)?.message || 
             (distanceQuery.error as Error)?.message || 
             "Error loading data"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!weatherQuery.data || !distanceQuery.data) {
    return null;
  }

  const weather = weatherQuery.data;
  const distance = distanceQuery.data;
  const element = distance.rows[0]?.elements[0];

  if (!element?.duration || element.status !== "OK") {
    return (
      <Card className="absolute bottom-4 left-4 w-96">
        <CardContent className="p-4">
          <p className="text-destructive">
            {element?.error_message || "Could not calculate travel time"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="absolute bottom-4 left-4 w-96 bg-white/90 backdrop-blur">
      <CardContent className="p-4">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Drive time:</p>
          <p className="text-lg font-semibold">{element.duration.text}</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { temp: weather.current.temp, weather: weather.current.weather },
            ...weather.daily.slice(0, 3)
          ].map((day, i) => {
            const WeatherIcon = weatherIcons[day.weather[0].icon] || Cloud;
            return (
              <div key={i} className="text-center">
                <p className="text-xs mb-1">{i === 0 ? "Now" : `Day ${i}`}</p>
                <WeatherIcon className="h-6 w-6 mx-auto mb-1" />
                {i === 0 ? (
                  <p className="text-sm font-medium">{Math.round(day.temp)}°C</p>
                ) : (
                  <div>
                    <p className="text-xs font-medium">
                      {Math.round(day.temp.max)}°
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(day.temp.min)}°
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
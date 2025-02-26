import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Loader2, AlertCircle, AlertTriangle } from "lucide-react";
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
  const weatherQuery = useQuery<WeatherResponse & { isMockData?: boolean }>({
    queryKey: ["/api/weather", location.lat, location.lng],
    queryFn: async () => {
      console.log("Fetching weather for location:", location);
      const response = await fetch(`/api/weather?lat=${location.lat}&lng=${location.lng}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Error ${response.status}: Failed to fetch weather data`;
        console.error("Weather API error:", errorMessage);
        throw new Error(errorMessage);
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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Error ${response.status}: Failed to calculate travel time`;
        console.error("Distance API error:", errorMessage);
        throw new Error(errorMessage);
      }
      const data = await response.json();
      console.log("Distance API response:", data);
      return data;
    },
  });

  // Add detailed logging for debugging
  console.log("Weather query state:", {
    isLoading: weatherQuery.isLoading,
    isError: weatherQuery.isError,
    data: weatherQuery.data,
    error: weatherQuery.error
  });

  console.log("Distance query state:", {
    isLoading: distanceQuery.isLoading,
    isError: distanceQuery.isError,
    data: distanceQuery.data,
    error: distanceQuery.error
  });

  if (weatherQuery.isLoading || distanceQuery.isLoading) {
    return (
      <Card className="absolute bottom-4 left-4 w-96 z-50">
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

    const errorMessage = (weatherQuery.error as Error)?.message || 
                         (distanceQuery.error as Error)?.message || 
                         "Error loading data";

    return (
      <Card className="absolute bottom-4 left-4 w-96 bg-red-50 z-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
              <button 
                onClick={() => {
                  weatherQuery.refetch();
                  distanceQuery.refetch();
                }}
                className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 py-1 px-2 rounded transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Add a more explicit check for data existence
  if (!weatherQuery.data) {
    console.warn("Weather data is missing!");
    return (
      <Card className="absolute bottom-4 left-4 w-96 z-50">
        <CardContent className="p-4">
          <p>Weather data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  if (!distanceQuery.data) {
    console.warn("Distance data is missing!");
    return (
      <Card className="absolute bottom-4 left-4 w-96 z-50">
        <CardContent className="p-4">
          <p>Travel time data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  const weather = weatherQuery.data;
  const distance = distanceQuery.data;

  // Debug the element access
  console.log("Distance data structure:", JSON.stringify(distance));

  // Check if the required elements exist
  const hasElements = distance.rows && 
                    distance.rows.length > 0 && 
                    distance.rows[0].elements && 
                    distance.rows[0].elements.length > 0;

  if (!hasElements) {
    console.warn("Missing elements in distance data");
    return (
      <Card className="absolute bottom-4 left-4 w-96 z-50">
        <CardContent className="p-4">
          <p className="text-destructive">
            Could not calculate travel time: Missing data
          </p>
        </CardContent>
      </Card>
    );
  }

  const element = distance.rows[0].elements[0];

  if (!element?.duration || element.status !== "OK") {
    return (
      <Card className="absolute bottom-4 left-4 w-96 z-50">
        <CardContent className="p-4">
          <p className="text-destructive">
            {element?.error_message || "Could not calculate travel time"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="absolute bottom-4 left-4 w-96 bg-white/90 backdrop-blur z-50">
      <CardContent className="p-4">
        {/* Show a notice when using mock data */}
        {weather.isMockData && (
          <div className="mb-3 p-2 bg-amber-50 rounded-md flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-xs text-amber-700">
              Using simulated weather data due to API connection issues
            </p>
          </div>
        )}

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
                  <p className="text-sm font-medium">{Math.round(day.temp as number)}°C</p>
                ) : (
                  <div>
                    <p className="text-xs font-medium">
                      {Math.round((day.temp as {max: number}).max)}°
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((day.temp as {min: number}).min)}°
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
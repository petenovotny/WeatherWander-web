import { useQuery } from "@tanstack/react-query";
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
      <div className="bg-white shadow-lg rounded-md p-2 z-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-xs">Loading info...</p>
        </div>
      </div>
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
      <div className="bg-white shadow-lg rounded-md p-2 z-50">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // Add a more explicit check for data existence
  if (!weatherQuery.data) {
    console.warn("Weather data is missing!");
    return (
      <div className="bg-white shadow-lg rounded-md p-2 z-50">
        <p className="text-xs">Weather data unavailable</p>
      </div>
    );
  }

  if (!distanceQuery.data) {
    console.warn("Distance data is missing!");
    return (
      <div className="bg-white shadow-lg rounded-md p-2 z-50">
        <p className="text-xs">Travel time data unavailable</p>
      </div>
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
      <div className="bg-white shadow-lg rounded-md p-2 z-50">
        <p className="text-xs text-red-600">Could not calculate travel time</p>
      </div>
    );
  }

  const element = distance.rows[0].elements[0];

  if (!element?.duration || element.status !== "OK") {
    return (
      <div className="bg-white shadow-lg rounded-md p-2 z-50">
        <p className="text-xs text-red-600">
          {element?.error_message || "Could not calculate travel time"}
        </p>
      </div>
    );
  }

  // Get the weather icon for the current weather
  const currentWeather = weather.current.weather[0];
  const WeatherIcon = weatherIcons[currentWeather.icon] || Cloud;

  return (
    <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-md p-3 z-50 min-w-[200px]">
      {weather.isMockData && (
        <div className="mb-2 px-2 py-1 bg-amber-50 rounded-sm flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          <p className="text-xs text-amber-700">Using simulated data</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <p className="text-xs text-gray-500">Current Temperature</p>
          <p className="text-lg font-semibold">{Math.round(weather.current.temp as number)}°C</p>
          <p className="text-xs text-gray-500">{currentWeather.description}</p>
        </div>
        <WeatherIcon className="h-10 w-10 text-primary" />
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500">Drive time from your location</p>
        <p className="text-lg font-semibold">{element.duration.text}</p>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-1">3-Day Forecast</p>
        <div className="grid grid-cols-3 gap-1">
          {weather.daily.slice(1, 4).map((day, i) => {
            const DayWeatherIcon = weatherIcons[day.weather[0].icon] || Cloud;
            return (
              <div key={i} className="text-center">
                <p className="text-xs">Day {i+1}</p>
                <DayWeatherIcon className="h-5 w-5 mx-auto my-1" />
                <p className="text-xs">{Math.round((day.temp as {max: number}).max)}°</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
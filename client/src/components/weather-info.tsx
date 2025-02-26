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
      <div className="bg-white/90 shadow-lg rounded-md p-2 z-50 text-center w-[180px]">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          <p className="text-xs">Loading...</p>
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
      <div className="bg-white/90 shadow-lg rounded-md p-2 z-50 w-[180px]">
        <div className="flex items-center justify-center space-x-1">
          <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // Add a more explicit check for data existence
  if (!weatherQuery.data) {
    console.warn("Weather data is missing!");
    return (
      <div className="bg-white/90 shadow-lg rounded-md p-2 z-50 w-[180px]">
        <p className="text-xs text-center">Weather data unavailable</p>
      </div>
    );
  }

  if (!distanceQuery.data) {
    console.warn("Distance data is missing!");
    return (
      <div className="bg-white/90 shadow-lg rounded-md p-2 z-50 w-[180px]">
        <p className="text-xs text-center">Travel time data unavailable</p>
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
      <div className="bg-white/90 shadow-lg rounded-md p-2 z-50 w-[180px]">
        <p className="text-xs text-center text-red-600">Could not calculate travel time</p>
      </div>
    );
  }

  const element = distance.rows[0].elements[0];

  if (!element?.duration || element.status !== "OK") {
    return (
      <div className="bg-white/90 shadow-lg rounded-md p-2 z-50 w-[180px]">
        <p className="text-xs text-center text-red-600">
          {element?.error_message || "Could not calculate travel time"}
        </p>
      </div>
    );
  }

  // Get the weather icon for the current weather
  const currentWeather = weather.current.weather[0];
  const WeatherIcon = weatherIcons[currentWeather.icon] || Cloud;

  return (
    <div className="relative">
      {/* Triangle pointer at the top */}
      <div className="absolute left-1/2 -top-2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-white/95"></div>

      {/* Main content */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-md p-2 text-center min-w-[180px] max-w-[220px]">
        {weather.isMockData && (
          <div className="mb-1 px-1 py-0.5 bg-amber-50 rounded-sm flex items-center justify-center gap-1">
            <AlertTriangle className="h-2 w-2 text-amber-500" />
            <p className="text-[10px] text-amber-700">Simulated weather data</p>
          </div>
        )}

        <div className="flex justify-between items-center px-2">
          <div className="flex flex-col items-start">
            <p className="text-xs text-gray-500">Now</p>
            <p className="text-base font-semibold">{Math.round(weather.current.temp as number)}°C</p>
            <p className="text-[10px] text-gray-500">{currentWeather.description}</p>
          </div>
          <WeatherIcon className="h-8 w-8 text-primary" />
        </div>

        <div className="mt-1 pt-1 border-t border-gray-100 px-2">
          <p className="text-xs text-gray-500">Drive time</p>
          <p className="text-sm font-medium">{element.duration.text}</p>
        </div>

        <div className="mt-1 pt-1 border-t border-gray-100">
          <div className="flex justify-between px-1">
            {weather.daily.slice(1, 4).map((day, i) => {
              const DayWeatherIcon = weatherIcons[day.weather[0].icon] || Cloud;
              return (
                <div key={i} className="text-center">
                  <p className="text-[10px] text-gray-500">Day {i+1}</p>
                  <DayWeatherIcon className="h-4 w-4 mx-auto my-0.5" />
                  <p className="text-[10px]">{Math.round((day.temp as {max: number}).max)}°</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
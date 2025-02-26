import React from 'react';
import { OverlayView } from '@react-google-maps/api';
import type { Location } from "@shared/schema";
import { Cloud, CloudRain, Sun, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { WeatherResponse, DistanceResponse } from "@shared/schema";

interface MapOverlayProps {
  location: Location;
  userLocation: Location;
}

// Simple mapping of OpenWeatherMap icons to Lucide icons
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

const MapOverlay: React.FC<MapOverlayProps> = ({ location, userLocation }) => {
  const weatherQuery = useQuery<WeatherResponse>({
    queryKey: ["/api/weather", location.lat, location.lng],
    queryFn: async () => {
      const response = await fetch(`/api/weather?lat=${location.lat}&lng=${location.lng}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to fetch weather data`);
      }
      return response.json();
    },
  });

  const distanceQuery = useQuery<DistanceResponse>({
    queryKey: ["/api/distance", userLocation, location],
    queryFn: async () => {
      const response = await fetch(
        `/api/distance?origin[lat]=${userLocation.lat}&origin[lng]=${userLocation.lng}&destination[lat]=${location.lat}&destination[lng]=${location.lng}`
      );
      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to calculate travel time`);
      }
      return response.json();
    },
  });

  if (weatherQuery.isLoading || distanceQuery.isLoading || 
      !weatherQuery.data || !distanceQuery.data) {
    return null;
  }

  const weather = weatherQuery.data;
  const distance = distanceQuery.data;
  
  // Basic validation of distance data structure
  if (!distance.rows?.[0]?.elements?.[0]?.status === "OK" || 
      !distance.rows[0].elements[0].duration) {
    return null;
  }

  const element = distance.rows[0].elements[0];
  const currentWeather = weather.current.weather[0];
  const WeatherIcon = weatherIcons[currentWeather.icon] || Cloud;

  return (
    <OverlayView
      position={location}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: 20, // Position below the marker
      })}
    >
      <div style={{ 
        whiteSpace: 'nowrap', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '4px',
        padding: '2px 6px',
        background: 'transparent'
      }}>
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          backgroundColor: 'rgba(255, 255, 255, 0.8)', 
          padding: '3px 6px', 
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          <WeatherIcon size={14} className="text-blue-500 mr-1" />
          {Math.round(weather.current.temp as number)}°C
        </span>
        
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          backgroundColor: 'rgba(255, 255, 255, 0.8)', 
          padding: '3px 6px', 
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          <Clock size={14} className="text-gray-600 mr-1" />
          {element.duration.text}
        </span>
      </div>
    </OverlayView>
  );
};

export default MapOverlay;

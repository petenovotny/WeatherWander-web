import React from 'react';
import { OverlayView } from '@react-google-maps/api';
import type { Location } from "@shared/schema";
import { Cloud, CloudRain, Sun, Clock, ThermometerSnowflake, ThermometerSun } from "lucide-react";
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
  if (distance.rows?.[0]?.elements?.[0]?.status !== "OK" || 
      !distance.rows[0].elements[0].duration) {
    return null;
  }

  const element = distance.rows[0].elements[0];
  const currentWeather = weather.current.weather[0];
  const WeatherIcon = weatherIcons[currentWeather.icon] || Cloud;

  // Create an array for all days (current + next 3)
  const daysToShow = [
    // Current day (using daily[0] for min/max)
    {
      label: 'Today',
      temp: weather.current.temp as number,
      low: (weather.daily[0].temp as {min: number}).min,
      high: (weather.daily[0].temp as {max: number}).max,
      icon: currentWeather.icon
    },
    // Next 3 days
    ...weather.daily.slice(1, 4).map((day, i) => ({
      label: `+${i+1}d`,
      low: (day.temp as {min: number}).min,
      high: (day.temp as {max: number}).max,
      icon: day.weather[0].icon
    }))
  ];

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
        flexDirection: 'column',
        alignItems: 'center', 
        gap: '4px',
        background: 'transparent'
      }}>
        {/* Top row: Current temperature and travel time */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: 'rgba(255, 255, 255, 0.85)', 
            padding: '4px 8px', 
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            <WeatherIcon size={14} className="text-blue-500 mr-1" />
            {Math.round(weather.current.temp as number)}°C
          </span>

          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: 'rgba(255, 255, 255, 0.85)', 
            padding: '4px 8px', 
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            <Clock size={14} className="text-gray-600 mr-1" />
            {element.duration.text}
          </span>
        </div>

        {/* Row 2: Temperature forecast */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          padding: '4px 8px',
          borderRadius: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
          {daysToShow.map((day, i) => {
            const DayIcon = weatherIcons[day.icon] || Cloud;
            return (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0 4px',
                borderRight: i < daysToShow.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                fontSize: '10px'
              }}>
                <span style={{ fontSize: '9px', color: '#666' }}>{day.label}</span>
                <DayIcon size={12} style={{ margin: '2px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#2563eb' }}>
                    <ThermometerSnowflake size={8} style={{ marginRight: '1px' }} />
                    {Math.round(day.low)}°
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', color: '#dc2626' }}>
                    <ThermometerSun size={8} style={{ marginRight: '1px' }} />
                    {Math.round(day.high)}°
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </OverlayView>
  );
};

export default MapOverlay;
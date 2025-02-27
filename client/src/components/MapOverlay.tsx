import React, { useEffect, useState } from 'react';
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

// Helper function to convert Celsius to Fahrenheit
const toFahrenheit = (celsius: number): number => {
  return Math.round((celsius * 9/5) + 32);
};

const MapOverlay: React.FC<MapOverlayProps> = ({ location, userLocation }) => {
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile devices on component mount
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Initial check
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

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

  // Create an array for all days (today + next 3)
  const daysToShow = [
    // Today
    {
      label: 'Today',
      low: toFahrenheit((weather.daily[0].temp as {min: number}).min),
      high: toFahrenheit((weather.daily[0].temp as {max: number}).max),
      icon: weather.daily[0].weather[0].icon
    },
    // Next 3 days
    ...weather.daily.slice(1, 4).map((day, i) => ({
      label: `+${i+1}d`,
      low: toFahrenheit((day.temp as {min: number}).min),
      high: toFahrenheit((day.temp as {max: number}).max),
      icon: day.weather[0].icon
    }))
  ];

  // Calculate scale factor for mobile (75% smaller = 0.25 of original size)
  const scaleFactor = isMobile ? 0.75 : 1;

  // Adjust sizes for mobile
  const fontSize = {
    label: isMobile ? '6px' : '8px',
    temp: isMobile ? '6px' : '9px',
    time: isMobile ? '8px' : '11px'
  };

  const iconSize = {
    weather: isMobile ? 8 : 12,
    clock: isMobile ? 7 : 10
  };

  const padding = {
    pill: isMobile ? '2px 4px' : '3px 6px',
    container: isMobile ? '2px 4px' : '3px 6px',
    item: isMobile ? '0 2px' : '0 3px'
  };

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
        gap: isMobile ? '2px' : '3px',
        background: 'transparent',
        transform: isMobile ? `scale(${scaleFactor})` : 'none',
        transformOrigin: 'center top'
      }}>
        {/* Compact travel time pill */}
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          backgroundColor: 'rgba(255, 255, 255, 0.6)', 
          padding: padding.pill, 
          borderRadius: '14px',
          fontSize: fontSize.time,
          fontWeight: '500',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
        }}>
          <Clock size={iconSize.clock} style={{ marginRight: '3px', color: '#4b5563' }} />
          {element.duration.text}
        </span>

        {/* Ultra-compact forecast */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '2px' : '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          padding: padding.container,
          borderRadius: '14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
        }}>
          {daysToShow.map((day, i) => {
            const DayIcon = weatherIcons[day.icon] || Cloud;
            return (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: padding.item,
                borderRight: i < daysToShow.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                fontSize: '10px'
              }}>
                <span style={{ fontSize: fontSize.label, color: '#4b5563', fontWeight: '500' }}>{day.label}</span>
                <DayIcon size={iconSize.weather} style={{ margin: '1px 0' }} />
                {/* Vertical temperature display with high above low */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: '#b91c1c', fontSize: fontSize.temp, fontWeight: '500' }}>{day.high}°</span>
                  <span style={{ color: '#1d4ed8', fontSize: fontSize.temp, fontWeight: '500' }}>{day.low}°</span>
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
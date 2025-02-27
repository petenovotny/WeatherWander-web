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

// Format date as short day name
const formatDayName = (dayOffset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
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
      console.log("Fetching weather for location:", location);
      const response = await fetch(`/api/weather?lat=${location.lat}&lng=${location.lng}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to fetch weather data`);
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
        const errorText = await response.text();
        console.error("Distance API error:", errorText);
        throw new Error(`Error ${response.status}: Failed to calculate travel time`);
      }
      const data = await response.json();
      console.log("Distance API response:", data);
      // Log the actual structure to help debug
      console.log("Distance data structure:", JSON.stringify(data));
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

  if (weatherQuery.isLoading || distanceQuery.isLoading || 
      !weatherQuery.data || !distanceQuery.data) {
    return null;
  }

  const weather = weatherQuery.data;
  const distance = distanceQuery.data;

  // Basic validation of distance data structure
  if (distance.rows?.[0]?.elements?.[0]?.status !== "OK" || 
      !distance.rows[0].elements[0].duration) {
    // Log the error and return a fallback UI instead of null
    console.error("Invalid distance data structure:", distance);

    // Return a simple fallback UI to at least show weather information
    return (
      <OverlayView
        position={location}
        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        getPixelPositionOffset={(width, height) => ({
          x: -(width / 2),
          y: 20, // Position below the marker
        })}
      >
        <div className={isMobile ? 'weather-overlay-mobile' : 'weather-overlay'} style={{
          whiteSpace: 'nowrap',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          pointerEvents: 'none' // Prevent interfering with map gestures
        }}>
          {/* Weather forecast only */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '2px 6px',
            borderRadius: '10px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            fontSize: isMobile ? '9px' : '10px'
          }}>
            <span style={{ fontSize: isMobile ? '8px' : '9px', color: '#4b5563', fontWeight: '500' }}>
              {Math.round(weather.current.temp as number)}°F
            </span>
          </div>
          <div style={{
            backgroundColor: 'rgba(255, 218, 218, 0.8)',
            padding: '1px 4px',
            borderRadius: '6px',
            fontSize: '9px',
            color: '#9a3412'
          }}>
            Travel time unavailable
          </div>
        </div>
      </OverlayView>
    );
  }

  const element = distance.rows[0].elements[0];

  // Create an array for all days (today + next 3)
  const daysToShow = [
    // Today
    {
      label: 'Today',
      // API now returns values in Fahrenheit directly - no conversion needed
      low: Math.round((weather.daily[0].temp as {min: number}).min),
      high: Math.round((weather.daily[0].temp as {max: number}).max),
      icon: weather.daily[0].weather[0].icon
    },
    // Next 3 days with actual day names
    ...weather.daily.slice(1, 4).map((day, i) => ({
      label: formatDayName(i+1),
      // API now returns values in Fahrenheit directly - no conversion needed
      low: Math.round((day.temp as {min: number}).min),
      high: Math.round((day.temp as {max: number}).max),
      icon: day.weather[0].icon
    }))
  ];

  // Adjusted for better mobile compatibility - using classes and relative sizing
  // instead of explicit transform scale which can interfere with pinch gestures
  const containerClass = isMobile ? 'weather-overlay-mobile' : 'weather-overlay';

  return (
    <OverlayView
      position={location}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: 20, // Position below the marker
      })}
    >
      <div className={containerClass} style={{
        whiteSpace: 'nowrap',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        pointerEvents: 'none' // Prevent interfering with map gestures
      }}>
        {/* Weather info pill with mock data warning if applicable */}
        {weather.isMockData && (
          <div style={{
            backgroundColor: 'rgba(255, 237, 213, 0.8)',
            padding: '1px 4px',
            borderRadius: '6px',
            fontSize: '9px',
            color: '#9a3412',
            marginBottom: '-2px'
          }}>
            Simulated weather data
          </div>
        )}

        {/* Travel time pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '2px 6px',
          borderRadius: '10px',
          fontSize: isMobile ? '10px' : '11px',
          fontWeight: '500',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
          <Clock size={isMobile ? 10 : 12} style={{ marginRight: '3px', color: '#4b5563' }} />
          {element.duration?.text}
          {/* If this is mock data, show a small indicator */}
          {(distance as any).isMockData && (
            <span style={{ 
              marginLeft: '3px', 
              fontSize: isMobile ? '8px' : '9px', 
              color: '#9a3412',
              fontWeight: 'normal'
            }}>
              (est.)
            </span>
          )}
        </div>

        {/* Weather forecast */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '2px 6px',
          borderRadius: '10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          fontSize: isMobile ? '9px' : '10px'
        }}>
          {daysToShow.map((day, i) => {
            const DayIcon = weatherIcons[day.icon] || Cloud;
            return (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0 4px',
                borderRight: i < daysToShow.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none'
              }}>
                <span style={{ fontSize: isMobile ? '8px' : '9px', color: '#4b5563', fontWeight: '500' }}>{day.label}</span>
                <DayIcon size={isMobile ? 10 : 14} style={{ margin: '1px 0' }} />
                {/* Vertical temperature display with high above low */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: '#b91c1c', fontSize: isMobile ? '8px' : '9px', fontWeight: '500' }}>{day.high}°</span>
                  <span style={{ color: '#1d4ed8', fontSize: isMobile ? '8px' : '9px', fontWeight: '500' }}>{day.low}°</span>
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
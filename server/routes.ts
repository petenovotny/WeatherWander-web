import type { Express } from "express";
import { createServer } from "http";
import axios from "axios";
import { locationSchema, weatherResponseSchema, distanceResponseSchema } from "@shared/schema";
import { z } from "zod";
import CryptoJS from 'crypto-js'; // Changed from import * as CryptoJS

const WEATHER_API_KEY = process.env.OPENWEATHERMAP_API_KEY || "default_key";
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "default_key";
const GOOGLE_MAPS_SIGNING_SECRET = process.env.GOOGLE_MAPS_SIGNING_SECRET || "";

/**
 * Signs a URL with the Google Maps signing secret
 * @param url The URL to sign
 * @returns The signed URL with signature parameter
 */
function signGoogleMapsUrl(url: string): string {
  if (!GOOGLE_MAPS_SIGNING_SECRET) {
    console.warn("Google Maps signing secret not configured, using unsigned URL");
    return url;
  }

  try {
    // Remove any existing signature and API key from the URL for signing
    const urlWithoutKey = url.split('&key=')[0];

    // Create the URL signing component (the path + query, without protocol and host)
    const urlToSign = new URL(urlWithoutKey);
    const pathWithQuery = urlToSign.pathname + urlToSign.search;

    // Decode the base64 signing key (the client secret)
    const key = CryptoJS.enc.Base64.parse(GOOGLE_MAPS_SIGNING_SECRET);

    // Create the signature using HMAC-SHA1
    const signature = CryptoJS.HmacSHA1(pathWithQuery, key);
    const encodedSignature = signature.toString(CryptoJS.enc.Base64);

    // Replace any characters that cannot be included in a URL
    const safeSignature = encodedSignature
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Add the signature and API key to the URL
    return `${url}&signature=${safeSignature}`;
  } catch (error) {
    console.error("Error signing Google Maps URL:", error);
    return url; // Return the original URL if signing fails
  }
}

/**
 * Generate mock weather data for development and testing
 * Used as fallback when API key is invalid or unavailable
 */
function generateMockWeatherData(lat: number, lng: number): any {
  // Generate deterministic but varying temperature based on coordinates
  const baseTemp = 20; // Base temperature in Celsius
  const tempVariation = (Math.sin(lat * lng * 0.01) * 10).toFixed(1);
  const currentTemp = parseFloat((baseTemp + parseFloat(tempVariation)).toFixed(1));

  // Generate mock weather conditions based on temperature
  let condition = "clear";
  let icon = "01d";

  if (currentTemp < 15) {
    condition = "clouds";
    icon = "03d";
  } else if (currentTemp > 25) {
    condition = "clear";
    icon = "01d";
  } else {
    condition = "few clouds";
    icon = "02d";
  }

  // Generate truly different daily forecasts with proper highs and lows
  const dailyForecasts = Array(4).fill(0).map((_, index) => {
    // Base temperature increases slightly each day (climate warming simulation)
    const dayVariation = index * 0.5;

    // Generate a range of temperatures throughout the day
    // For a proper forecast, we'd analyze hourly data for each day
    const dayHigh = currentTemp + 3 + dayVariation + (Math.random() * 2);
    const dayLow = currentTemp - 5 + dayVariation - (Math.random() * 2);

    return {
      temp: {
        min: parseFloat(dayLow.toFixed(1)),
        max: parseFloat(dayHigh.toFixed(1))
      },
      weather: [
        {
          icon: icon,
          description: condition
        }
      ]
    };
  });

  return {
    current: {
      temp: currentTemp,
      weather: [
        {
          icon: icon,
          description: condition
        }
      ]
    },
    daily: dailyForecasts,
    isMockData: true
  };
}

/**
 * Generate mock distance data based on actual coordinates
 * This creates a more realistic travel time estimate based on the distance between points
 * @param origin Starting coordinates
 * @param destination Ending coordinates 
 * @returns Mock distance response with simulated travel time
 */
function generateMockDistanceData(origin: {lat: number, lng: number}, destination: {lat: number, lng: number}): any {
  // Calculate great-circle distance between points (Haversine formula)
  const R = 6371; // Earth's radius in kilometers
  const dLat = (destination.lat - origin.lat) * (Math.PI / 180);
  const dLng = (destination.lng - origin.lng) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(origin.lat * (Math.PI / 180)) * Math.cos(destination.lat * (Math.PI / 180)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  // Apply route factor to account for non-straight roads
  const routeFactor = 1.3;
  const adjustedDistance = distance * routeFactor;

  // Calculate travel time using more realistic average speed (100 km/h or ~62 mph)
  // For short distances, we use a slower speed to account for city driving
  let averageSpeed;
  if (adjustedDistance < 5) {
    // City driving for very short distances
    averageSpeed = 30; // 30 km/h for short city trips
  } else if (adjustedDistance < 20) {
    // Mix of city and highway
    averageSpeed = 60; // 60 km/h
  } else {
    // Primarily highway driving
    averageSpeed = 100; // 100 km/h
  }

  const travelTimeMinutes = Math.round((adjustedDistance / averageSpeed) * 60);

  // Format the travel time in a human-readable format
  let travelTimeText = "";
  if (travelTimeMinutes < 60) {
    travelTimeText = `${travelTimeMinutes} mins`;
  } else {
    const hours = Math.floor(travelTimeMinutes / 60);
    const mins = travelTimeMinutes % 60;
    if (mins === 0) {
      travelTimeText = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    } else {
      travelTimeText = `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} mins`;
    }
  }

  return {
    rows: [{
      elements: [{
        status: "OK",
        duration: {
          text: travelTimeText,
          value: travelTimeMinutes * 60 // seconds
        }
      }]
    }],
    isMockData: true
  };
}

export async function registerRoutes(app: Express) {
  app.get("/api/weather", async (req, res) => {
    try {
      console.log("Weather API request params:", req.query);
      // Convert string parameters to numbers
      const { lat, lng } = locationSchema.parse({
        lat: Number(req.query.lat),
        lng: Number(req.query.lng)
      });

      if (!WEATHER_API_KEY || WEATHER_API_KEY === "default_key") {
        throw new Error("OpenWeatherMap API key is not configured");
      }

      // Log the exact API key being used (masked for security)
      const maskedKey = WEATHER_API_KEY.substring(0, 4) + "..." + WEATHER_API_KEY.substring(WEATHER_API_KEY.length - 4);
      console.log(`Using OpenWeatherMap API key: ${maskedKey} (${WEATHER_API_KEY.length} characters)`);

      // Use free 5-day forecast API with 3-hour intervals - CHANGED to imperial units
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=imperial&appid=${WEATHER_API_KEY}`;
      // Also get current weather separately - CHANGED to imperial units
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=imperial&appid=${WEATHER_API_KEY}`;

      console.log("Calling Weather API:", forecastUrl.replace(WEATHER_API_KEY, 'HIDDEN'));

      try {
        // Make requests in parallel
        const [forecastResponse, currentResponse] = await Promise.all([
          axios.get(forecastUrl),
          axios.get(currentWeatherUrl)
        ]);

        console.log('Forecast API Success - Status:', forecastResponse.status);
        console.log('Current Weather API Success - Status:', currentResponse.status);

        // Group forecast by day and find min/max for each day
        const forecastList = forecastResponse.data.list || [];
        const forecasts: Record<string, any> = {};

        // Get the location's timezone offset from the current weather data
        // OpenWeatherMap API returns timezone offset in seconds from UTC
        const timezoneOffsetSeconds = currentResponse.data.timezone || 0;
        console.log(`Location timezone offset: ${timezoneOffsetSeconds} seconds from UTC`);

        // Initialize with today's date IN THE LOCATION'S TIMEZONE
        // Create a Date object for current UTC time, then adjust for the location's timezone
        const utcNow = new Date();
        // Convert to milliseconds and adjust for the timezone offset
        const locationTime = new Date(utcNow.getTime() + (timezoneOffsetSeconds * 1000));
        // Reset to the start of the day in the location's timezone
        const today = new Date(locationTime);
        today.setHours(0, 0, 0, 0);

        console.log(`Local date used for forecast grouping: ${today.toISOString()}`);

        // Initialize days (today + 3 more days)
        for (let i = 0; i < 4; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          console.log(`Initializing forecast container for: ${dateStr}`);
          forecasts[dateStr] = {
            temp: { min: Infinity, max: -Infinity },
            weather: [],
            weatherCounts: {} // To track weather frequency for most common condition
          };
        }

        // Process each 3-hour forecast
        forecastList.forEach((item: any) => {
          // Convert Unix timestamp (UTC) to Date object, then adjust for location's timezone
          const utcDate = new Date(item.dt * 1000);
          const localDate = new Date(utcDate.getTime() + (timezoneOffsetSeconds * 1000));
          const dateStr = localDate.toISOString().split('T')[0];

          // Only process if within our 4-day window
          if (forecasts[dateStr]) {
            // Update min/max temps
            const temp = item.main.temp;
            if (temp < forecasts[dateStr].temp.min) {
              forecasts[dateStr].temp.min = temp;
            }
            if (temp > forecasts[dateStr].temp.max) {
              forecasts[dateStr].temp.max = temp;
            }

            // Track weather conditions to determine most common
            const weather = item.weather[0];
            if (!forecasts[dateStr].weatherCounts[weather.icon]) {
              forecasts[dateStr].weatherCounts[weather.icon] = 0;
            }
            forecasts[dateStr].weatherCounts[weather.icon]++;
            forecasts[dateStr].weather.push(weather);
          }
        });

        // Determine most common weather condition for each day
        Object.keys(forecasts).forEach(date => {
          const dayForecast = forecasts[date];
          let mostCommonIcon = '';
          let maxCount = 0;

          Object.keys(dayForecast.weatherCounts).forEach(icon => {
            if (dayForecast.weatherCounts[icon] > maxCount) {
              maxCount = dayForecast.weatherCounts[icon];
              mostCommonIcon = icon;
            }
          });

          // Find the weather description that matches the most common icon
          const weatherWithIcon = dayForecast.weather.find((w: any) => w.icon === mostCommonIcon) || dayForecast.weather[0];

          // Clean up the forecast data
          dayForecast.weather = [weatherWithIcon];
          delete dayForecast.weatherCounts;

          // Round temperatures
          dayForecast.temp.min = Math.round(dayForecast.temp.min * 10) / 10;
          dayForecast.temp.max = Math.round(dayForecast.temp.max * 10) / 10;

          // For any days without forecast data (can happen depending on the time of API request),
          // use reasonable defaults based on current weather
          if (dayForecast.temp.min === Infinity) {
            dayForecast.temp.min = Math.round((currentResponse.data.main.temp - 5) * 10) / 10;
            dayForecast.temp.max = Math.round((currentResponse.data.main.temp + 5) * 10) / 10;
            dayForecast.weather = currentResponse.data.weather;
          }
        });

        // Prepare the response in our schema format
        const transformedData = {
          current: {
            temp: currentResponse.data.main.temp,
            weather: currentResponse.data.weather
          },
          daily: Object.values(forecasts)
        };

        // Parse with our schema to validate
        const weather = weatherResponseSchema.parse(transformedData);
        console.log('Parsed Weather Response:', weather);

        res.json(weather);
      } catch (apiError: any) {
        // Specific handling for API errors with detailed logging
        console.error("OpenWeatherMap API Error Details:", apiError);

        if (apiError.response) {
          const status = apiError.response.status;
          console.error(`OpenWeatherMap API returned status ${status}`);
          console.error("Response headers:", apiError.response.headers);
          console.error("Response data:", apiError.response.data);

          // Log detailed error message but use mock data as fallback
          console.warn(`Weather API error (${status}). Using mock data instead.`);

          // Generate and return mock weather data
          const mockData = generateMockWeatherData(lat, lng);
          return res.json(mockData);
        } else if (apiError.request) {
          console.error("No response received from OpenWeatherMap API");

          // Network error - generate and return mock data
          console.warn("Weather API network error. Using mock data instead.");
          const mockData = generateMockWeatherData(lat, lng);
          return res.json(mockData);
        } else {
          console.error("Error setting up the request:", apiError.message);

          // Setup error - generate and return mock data
          console.warn("Weather API setup error. Using mock data instead.");
          const mockData = generateMockWeatherData(lat, lng);
          return res.json(mockData);
        }
      }
    } catch (error) {
      console.error('Weather API Error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid coordinates format" });
      } else if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid request" });
      }
    }
  });

  app.get("/api/distance", async (req, res) => {
    try {
      console.log("Distance API request params:", req.query);
      const querySchema = z.object({
        origin: z.object({
          lat: z.string().transform(val => Number(val)),
          lng: z.string().transform(val => Number(val))
        }),
        destination: z.object({
          lat: z.string().transform(val => Number(val)),
          lng: z.string().transform(val => Number(val))
        })
      });

      if (!GOOGLE_API_KEY || GOOGLE_API_KEY === "default_key") {
        throw new Error("Google Maps API key is not configured");
      }

      const { origin, destination } = querySchema.parse(req.query);

      const baseUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${GOOGLE_API_KEY}`;

      // Sign the URL if we have a signing secret
      const url = signGoogleMapsUrl(baseUrl);
      console.log("Calling Distance API:", url.replace(GOOGLE_API_KEY, 'HIDDEN'));

      try {
        const response = await axios.get(url);
        console.log('Distance API Raw Response:', response.data);

        if (response.data.status !== "OK") {
          throw new Error(`Distance Matrix API error: ${response.data.status}`);
        }

        const distance = distanceResponseSchema.parse(response.data);
        console.log('Parsed Distance Response:', distance);

        // Additional validation of the response
        const element = distance.rows[0]?.elements[0];
        if (!element || element.status !== "OK" || !element.duration) {
          throw new Error(element?.error_message || "Could not calculate travel time");
        }

        res.json(distance);
      } catch (apiError: any) {
        // Enhanced error logging
        console.error("Distance API Error Details:", apiError);

        if (apiError.response) {
          console.error("Response Status:", apiError.response.status);
          console.error("Response Data:", apiError.response.data);
          console.error("Response Headers:", apiError.response.headers);
        }

        // Use mock distance data as fallback
        if (apiError.response && apiError.response.status) {
          const status = apiError.response.status;
          if (status === 401 || status === 403) {
            // For API key issues, return mock data instead of failing
            console.log("Google Maps API key issue detected. Using mock distance data.");
            const mockDistance = generateMockDistanceData(origin, destination);
            return res.json(mockDistance);
          } else {
            throw new Error(`Google Maps API error: ${status} - ${apiError.response.data?.error_message || "Unknown error"}`);
          }
        }
        throw apiError;
      }
    } catch (error) {
      console.error('Distance API Error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: "Invalid coordinates format",
          details: error.errors.map(e => e.message)
        });
      } else if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid request" });
      }
    }
  });

  return createServer(app);
}
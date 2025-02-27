import type { Express } from "express";
import { createServer } from "http";
import axios from "axios";
import { locationSchema, weatherResponseSchema, distanceResponseSchema } from "@shared/schema";
import { z } from "zod";
import * as CryptoJS from 'crypto-js';

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

      // Use One Call API for proper hourly and daily forecasts
      const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lng}&units=metric&exclude=minutely,alerts&appid=${WEATHER_API_KEY}`;
      console.log("Calling One Call API:", oneCallUrl.replace(WEATHER_API_KEY, 'HIDDEN'));

      try {
        const response = await axios.get(oneCallUrl);
        console.log('One Call API Success - Status:', response.status);

        // For debugging only - don't log full API response in production
        if (process.env.NODE_ENV !== 'production') {
          console.log('One Call API Sample Data:', JSON.stringify({
            current: response.data.current,
            hourly_count: response.data.hourly?.length || 0,
            daily_count: response.data.daily?.length || 0
          }));
        }

        // Process the response to match our schema
        // The One Call API already gives us properly calculated daily highs and lows based on hourly data
        const transformedData = {
          current: {
            temp: response.data.current.temp,
            weather: response.data.current.weather
          },
          daily: response.data.daily.slice(0, 4).map((day: any) => ({
            temp: {
              min: day.temp.min,
              max: day.temp.max
            },
            weather: day.weather
          }))
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
        if (apiError.response && apiError.response.status) {
          const status = apiError.response.status;
          if (status === 401 || status === 403) {
            throw new Error("Invalid or restricted Google Maps API key. Please verify your API key and enabled services.");
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
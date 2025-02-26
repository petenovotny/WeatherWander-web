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

      // Using the free "Current Weather Data" API endpoint instead of OneCall API
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${WEATHER_API_KEY}`;
      console.log("Calling Current Weather API:", currentWeatherUrl.replace(WEATHER_API_KEY, 'HIDDEN'));

      // Get the 5-day forecast (also available in free tier)
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&cnt=5&appid=${WEATHER_API_KEY}`;
      console.log("Calling Forecast API:", forecastUrl.replace(WEATHER_API_KEY, 'HIDDEN'));

      try {
        // Make both API calls in parallel
        const [currentResponse, forecastResponse] = await Promise.all([
          axios.get(currentWeatherUrl),
          axios.get(forecastUrl)
        ]);

        console.log('Current Weather API Raw Response:', currentResponse.data);
        console.log('Forecast API Raw Response:', forecastResponse.data);

        // Transform the response to match our schema
        const transformedData = {
          current: {
            temp: currentResponse.data.main.temp,
            weather: currentResponse.data.weather
          },
          daily: forecastResponse.data.list.map((item: any) => ({
            temp: {
              min: item.main.temp_min,
              max: item.main.temp_max
            },
            weather: item.weather
          }))
        };

        // Parse with our schema to validate
        const weather = weatherResponseSchema.parse(transformedData);
        console.log('Parsed Weather Response:', weather);

        res.json(weather);
      } catch (apiError: any) {
        // Specific handling for API errors
        if (apiError.response) {
          const status = apiError.response.status;
          if (status === 401) {
            throw new Error("Invalid or expired OpenWeatherMap API key. Please verify your API key.");
          } else if (status === 429) {
            throw new Error("OpenWeatherMap API rate limit exceeded. Please try again later.");
          } else {
            throw new Error(`OpenWeatherMap API error: ${status} - ${apiError.response.data.message || "Unknown error"}`);
          }
        }
        throw apiError; // Re-throw if not a specific API error
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
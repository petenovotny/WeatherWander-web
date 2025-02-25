import type { Express } from "express";
import { createServer } from "http";
import axios from "axios";
import { locationSchema, weatherResponseSchema, distanceResponseSchema } from "@shared/schema";
import { z } from "zod";

const WEATHER_API_KEY = process.env.OPENWEATHERMAP_API_KEY || "default_key";
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "default_key";

export async function registerRoutes(app: Express) {
  app.get("/api/weather", async (req, res) => {
    try {
      console.log("Weather API request params:", req.query);
      // Convert string parameters to numbers
      const { lat, lng } = locationSchema.parse({
        lat: Number(req.query.lat),
        lng: Number(req.query.lng)
      });

      const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lng}&exclude=minutely,hourly,alerts&units=metric&appid=${WEATHER_API_KEY}`;
      console.log("Calling Weather API:", url.replace(WEATHER_API_KEY, 'HIDDEN'));

      const response = await axios.get(url);
      console.log('Weather API Raw Response:', response.data);

      const weather = weatherResponseSchema.parse(response.data);
      console.log('Parsed Weather Response:', weather);

      res.json(weather);
    } catch (error) {
      console.error('Weather API Error:', error);
      res.status(400).json({ error: "Invalid request" });
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

      const { origin, destination } = querySchema.parse(req.query);

      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${GOOGLE_API_KEY}`;
      console.log("Calling Distance API:", url.replace(GOOGLE_API_KEY, 'HIDDEN'));

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
    } catch (error) {
      console.error('Distance API Error:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Invalid request" 
      });
    }
  });

  return createServer(app);
}
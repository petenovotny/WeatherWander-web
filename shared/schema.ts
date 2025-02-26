import { z } from "zod";

export const locationSchema = z.object({
  lat: z.number(),
  lng: z.number()
});

// Define a schema for daily weather temperature (min/max)
const dailyTempSchema = z.object({
  min: z.number(),
  max: z.number()
});

// Define a schema for weather description
const weatherDescriptionSchema = z.object({
  icon: z.string(),
  description: z.string()
});

// Define separate schemas for current and daily weather
export const currentWeatherSchema = z.object({
  temp: z.number(),
  weather: z.array(weatherDescriptionSchema)
});

export const dailyWeatherSchema = z.object({
  temp: dailyTempSchema,
  weather: z.array(weatherDescriptionSchema)
});

export const weatherResponseSchema = z.object({
  current: currentWeatherSchema,
  daily: z.array(dailyWeatherSchema),
  isMockData: z.boolean().optional()
});

export const distanceResponseSchema = z.object({
  rows: z.array(z.object({
    elements: z.array(z.object({
      status: z.string(),
      duration: z.object({
        text: z.string(),
        value: z.number()
      }).optional(),
      error_message: z.string().optional()
    }))
  }))
});

export type Location = z.infer<typeof locationSchema>;
export type WeatherResponse = z.infer<typeof weatherResponseSchema>;
export type CurrentWeather = z.infer<typeof currentWeatherSchema>;
export type DailyWeather = z.infer<typeof dailyWeatherSchema>;
export type DistanceResponse = z.infer<typeof distanceResponseSchema>;
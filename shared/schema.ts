import { z } from "zod";

export const locationSchema = z.object({
  lat: z.number(),
  lng: z.number()
});

export const weatherResponseSchema = z.object({
  current: z.object({
    temp: z.number(),
    weather: z.array(z.object({
      icon: z.string(),
      description: z.string()
    }))
  }),
  daily: z.array(z.object({
    temp: z.object({
      min: z.number(),
      max: z.number()
    }),
    weather: z.array(z.object({
      icon: z.string(),
      description: z.string()
    }))
  }))
});

export const distanceResponseSchema = z.object({
  duration: z.object({
    text: z.string(),
    value: z.number()
  })
});

export type Location = z.infer<typeof locationSchema>;
export type WeatherResponse = z.infer<typeof weatherResponseSchema>;
export type DistanceResponse = z.infer<typeof distanceResponseSchema>;

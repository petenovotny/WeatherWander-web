import { apiRequest } from "./queryClient";
import type { Location, WeatherResponse, DistanceResponse } from "@shared/schema";

export async function getWeather(location: Location): Promise<WeatherResponse> {
  const res = await apiRequest(
    "GET",
    `/api/weather?lat=${location.lat}&lng=${location.lng}`
  );
  return res.json();
}

export async function getDistance(
  origin: Location,
  destination: Location
): Promise<DistanceResponse> {
  const res = await apiRequest(
    "GET",
    `/api/distance?origin[lat]=${origin.lat}&origin[lng]=${origin.lng}&destination[lat]=${destination.lat}&destination[lng]=${destination.lng}`
  );
  return res.json();
}

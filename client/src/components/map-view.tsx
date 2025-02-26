import { useCallback, useMemo, useState } from "react";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import WeatherInfo from "./weather-info";
import type { Location } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MapViewProps {
  userLocation: Location;
}

// Define libraries outside component to prevent unnecessary re-renders
const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

export default function MapView({ userLocation }: MapViewProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const { toast } = useToast();

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

  // Log for debugging - will be removed in production
  console.log("Using Google Maps API Key:", apiKey ? "Key is present" : "Key is missing");

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const mapCenter = useMemo(() => ({
    lat: userLocation.lat,
    lng: userLocation.lng
  }), [userLocation]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    setSelectedLocation({
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    });
  }, []);

  if (!apiKey) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Configuration Required</h2>
          <p className="text-muted-foreground">Google Maps API key is not configured</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    console.error("Google Maps load error:", loadError);
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Map Error</h2>
          <p className="text-muted-foreground">Failed to load Google Maps.</p>
          <p className="text-sm text-destructive mt-2">Error details: {loadError.message}</p>
          <p className="text-sm text-destructive mt-2">Please ensure the API key is correct and has Maps JavaScript API enabled.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading Map...</h2>
          <p className="text-muted-foreground">Please wait while we load the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <GoogleMap
        mapContainerClassName="h-full w-full"
        center={mapCenter}
        zoom={12}
        onClick={handleMapClick}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
        }}
      >
        <Marker 
          position={userLocation}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scaledSize: new google.maps.Size(40, 40)
          }}
        />
        {selectedLocation && (
          <>
            <Marker 
              position={selectedLocation}
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                scaledSize: new google.maps.Size(40, 40)
              }}
            />
            <WeatherInfo 
              location={selectedLocation}
              userLocation={userLocation}
            />
          </>
        )}
      </GoogleMap>
    </div>
  );
}
import { useCallback, useMemo, useState } from "react";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import WeatherInfo from "./weather-info";
import type { Location } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MapViewProps {
  userLocation: Location;
}

export default function MapView({ userLocation }: MapViewProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const { toast } = useToast();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
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

  if (loadError) {
    toast({
      title: "Map Error",
      description: "Failed to load Google Maps",
      variant: "destructive"
    });
    return null;
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading Map...</h2>
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
        <Marker position={userLocation} />
        {selectedLocation && (
          <>
            <Marker 
              position={selectedLocation}
              icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
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

import { useCallback, useMemo, useState } from "react";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import WeatherInfo from "./weather-info";
import type { Location } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MapViewProps {
  userLocation: Location;
}

// Define libraries outside component to prevent unnecessary re-renders
const libraries = ["places"] as const;

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

    const newLocation = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };

    console.log("Map clicked, setting location:", newLocation);
    setSelectedLocation(newLocation);
  }, []);

  if (!apiKey) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-2">Configuration Required</h2>
          <p className="text-muted-foreground mb-4">Google Maps API key is not configured</p>
          <p className="text-sm text-muted-foreground">
            Please ensure the VITE_GOOGLE_MAPS_API_KEY environment variable is set.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    console.error("Google Maps load error:", loadError);
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-2">Map Error</h2>
          <p className="text-muted-foreground mb-4">Failed to load Google Maps.</p>
          <p className="text-sm text-destructive mb-2">Error details: {loadError.message}</p>
          <div className="text-sm text-gray-700 p-3 bg-gray-100 rounded-md">
            <p className="font-medium mb-1">Troubleshooting steps:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Verify that your API key is correct</li>
              <li>Ensure Maps JavaScript API is enabled in Google Cloud Console</li>
              <li>Check that there are no domain restrictions on your API key</li>
              <li>Verify billing is properly set up for your Google Cloud account</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-2">Loading Map...</h2>
          <p className="text-muted-foreground">Please wait while we load the map</p>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  console.log("Map component rendered with userLocation:", userLocation);
  console.log("Selected location state:", selectedLocation);

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
        {/* User's current location marker */}
        <Marker 
          position={userLocation}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scaledSize: new google.maps.Size(40, 40)
          }}
        />

        {/* Selected location marker and info */}
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

      {/* Debug overlay to verify data handling */}
      {selectedLocation && (
        <div className="absolute top-4 right-4 bg-white/90 p-2 rounded shadow text-xs">
          <p>Selected: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</p>
        </div>
      )}
    </div>
  );
}
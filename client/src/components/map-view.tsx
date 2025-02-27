import { useCallback, useMemo, useState, useRef } from "react";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import MapOverlay from "./MapOverlay";
import type { Location } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Trash2, MapPin, X } from "lucide-react";

interface MapViewProps {
  userLocation: Location;
}

// Define libraries outside component to prevent unnecessary re-renders
const libraries = ["places"] as const;

export default function MapView({ userLocation }: MapViewProps) {
  // Change from single location to array of locations
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  // Removed showRemoveTooltip state since we don't want to show the tooltip anymore
  const { toast } = useToast();
  const mapRef = useRef<google.maps.Map | null>(null);

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
    // Add the new location to the array instead of replacing
    setSelectedLocations(prev => [...prev, newLocation]);

    // Removed the tooltip logic that was here previously
  }, []);

  // Handle map load event to store reference
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Function to clear all selected locations
  const clearAllLocations = useCallback(() => {
    setSelectedLocations([]);
  }, []);

  // Function to remove a specific location
  const removeLocation = useCallback((index: number) => {
    setSelectedLocations(prev => prev.filter((_, i) => i !== index));
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
  console.log("Selected locations:", selectedLocations);

  return (
    <div className="h-full w-full relative">
      {/* Control panel */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="bg-white/80 backdrop-blur-sm rounded-md p-2 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {selectedLocations.length} location{selectedLocations.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="w-full flex items-center gap-1"
            onClick={clearAllLocations}
            disabled={selectedLocations.length === 0}
          >
            <Trash2 className="h-3 w-3" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Removed the tooltip that was here */}

      <GoogleMap
        mapContainerClassName="h-full w-full"
        center={mapCenter}
        zoom={7}
        onClick={handleMapClick}
        onLoad={onMapLoad}
        options={{
          disableDefaultUI: false, // Enable default UI for better mobile controls
          zoomControl: true,
          fullscreenControl: true, // Allow fullscreen on mobile
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
          gestureHandling: "greedy", // Improves touch handling for mobile
          minZoom: 3, // Prevent extreme zoom out
          maxZoom: 18 // Limit max zoom to prevent issues
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

        {/* Multiple selected location markers with overlays */}
        {selectedLocations.map((location, index) => (
          <div key={`${location.lat}-${location.lng}-${index}`}>
            <Marker
              position={location}
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                scaledSize: new google.maps.Size(40, 40)
              }}
              options={{
                zIndex: 1000,
              }}
              onClick={() => removeLocation(index)}
            />

            <MapOverlay
              location={location}
              userLocation={userLocation}
            />
          </div>
        ))}
      </GoogleMap>
    </div>
  );
}
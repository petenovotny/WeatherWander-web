import { useEffect, useState } from "react";
import MapView from "@/components/map-view";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MapPin, AlertCircle, Info } from "lucide-react";
import type { Location } from "@shared/schema";

export default function Home() {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const { toast } = useToast();

  const requestLocation = () => {
    console.log("Attempting to request location...");
    setLocationError(null);

    if (!("geolocation" in navigator)) {
      console.error("Geolocation not supported");
      setLocationError("Geolocation is not supported by your browser");
      toast({
        title: "Browser Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    console.log("Requesting geolocation from browser...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Location received:", {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLoading(false);
        let errorMessage = "Could not get your location. ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please enable location services in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Request timed out. Please try again.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
        }
        setLocationError(errorMessage);
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // Increased timeout
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log("Home component mounted, API Key present:", !!apiKey);

    // Request location after a delay to ensure component is fully mounted
    const timeoutId = setTimeout(() => {
      requestLocation();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, []);

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    console.error("Google Maps API key not found");
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Configuration Error</h2>
          <p className="text-muted-foreground mb-4">Google Maps API key is not configured</p>
          <p className="text-sm text-muted-foreground">
            Please set the VITE_GOOGLE_MAPS_API_KEY environment variable.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-2">Loading Location...</h2>
          <p className="text-muted-foreground mb-4">Please allow location access when prompted</p>
          <div className="animate-pulse">
            <MapPin className="h-8 w-8 mx-auto text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-2">Location Access Required</h2>
          <p className="text-muted-foreground mb-4">
            We need your location to show nearby weather and calculate travel times
          </p>
          {locationError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              <p className="font-medium">Error: {locationError}</p>
              <p className="mt-1">Please try again or check your browser settings.</p>
            </div>
          )}
          <Button onClick={requestLocation} className="gap-2">
            <MapPin className="h-4 w-4" />
            Enable Location
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      <MapView userLocation={userLocation} />

      {/* Instructions tooltip - auto dismisses after 10 seconds */}
      {showInstructions && (
        <div className="absolute left-4 top-4 z-10 max-w-xs bg-white/90 backdrop-blur-sm rounded-md p-3 shadow-lg animate-fade-in">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-sm">Multi-Location Weather</h3>
              <p className="text-xs text-gray-600 mt-1">
                Click anywhere on the map to add locations and view weather data. Click on a marker to remove it.
                Weather information stays visible until you refresh the page.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full text-xs" 
                onClick={() => setShowInstructions(false)}
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
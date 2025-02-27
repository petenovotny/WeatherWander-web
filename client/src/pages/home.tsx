import { useEffect, useState } from "react";
import MapView from "@/components/map-view";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MapPin, AlertCircle, Info, Settings } from "lucide-react";
import type { Location } from "@shared/schema";

// Define the PermissionState type that wasn't recognized
type PermissionState = 'granted' | 'denied' | 'prompt';

export default function Home() {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  const { toast } = useToast();

  // Detect mobile OS on component mount
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream);
    setIsAndroid(/android/i.test(userAgent));
  }, []);

  // Function to request location permission using the newer Permissions API if available
  const checkLocationPermission = async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setPermissionState(result.state as PermissionState);

        // Add listener for permission changes
        result.addEventListener('change', () => {
          setPermissionState(result.state as PermissionState);

          // If permission changed to granted, automatically request location
          if (result.state === 'granted') {
            requestLocation();
          }
        });

        return result.state as PermissionState;
      } catch (error) {
        console.error("Error checking permission:", error);
        // Fall back to standard geolocation request
        return null;
      }
    }
    return null;
  };

  const requestLocation = async () => {
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

    // Check permission state first if Permissions API is available
    const permState = await checkLocationPermission();

    // If permission is already denied, show specific instructions
    if (permState === 'denied') {
      handlePermissionDenied();
      setIsLoading(false);
      return;
    }

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
        handleLocationError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // Increased timeout
        maximumAge: 0
      }
    );
  };

  const handlePermissionDenied = () => {
    const osSpecificInstructions = getOSSpecificInstructions();

    setLocationError(
      `Location access is denied. ${osSpecificInstructions}`
    );

    toast({
      title: "Location Access Required",
      description: `Please enable location access in your settings. ${osSpecificInstructions}`,
      variant: "destructive"
    });
  };

  const handleLocationError = (error: GeolocationPositionError) => {
    let errorMessage = "Could not get your location. ";

    switch (error.code) {
      case error.PERMISSION_DENIED:
        const osSpecificInstructions = getOSSpecificInstructions();
        errorMessage += `Please enable location services. ${osSpecificInstructions}`;
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
  };

  const getOSSpecificInstructions = () => {
    if (isIOS) {
      return "Go to Settings > Privacy > Location Services, and enable for your browser.";
    } else if (isAndroid) {
      return "Go to Settings > Apps > Your Browser > Permissions > Location, and enable.";
    } else {
      return "Please check your browser settings to enable location services.";
    }
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
    // Show a more informative screen when location access is needed
    const deviceTypeText = isIOS ? "iOS" : isAndroid ? "Android" : "device";
    const isPermanentlyDenied = permissionState === 'denied';

    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-2">Location Access Required</h2>
          <p className="text-muted-foreground mb-4">
            We need your location to show nearby weather and calculate travel times
          </p>

          {locationError && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md text-sm">
              {isPermanentlyDenied && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-200">
                  <Settings className="h-5 w-5 text-red-600" />
                  <p className="font-medium">Location permission denied</p>
                </div>
              )}

              <p className="mb-2">{locationError}</p>

              {isPermanentlyDenied && (
                <div className="mt-3 p-2 bg-white/70 rounded border border-red-200">
                  <p className="font-medium text-xs mb-1">Instructions for {deviceTypeText}:</p>
                  {isIOS && (
                    <ol className="text-xs text-left list-decimal pl-4 space-y-1">
                      <li>Open your device Settings</li>
                      <li>Scroll down and find Safari (or your browser)</li>
                      <li>Tap on Location</li>
                      <li>Select "Allow While Using the App"</li>
                      <li>Return to this page and refresh</li>
                    </ol>
                  )}
                  {isAndroid && (
                    <ol className="text-xs text-left list-decimal pl-4 space-y-1">
                      <li>Open your device Settings</li>
                      <li>Go to Apps or Application Manager</li>
                      <li>Find your browser (Chrome, etc.)</li>
                      <li>Tap on Permissions, then Location</li>
                      <li>Select "Allow"</li>
                      <li>Return to this page and refresh</li>
                    </ol>
                  )}
                  {!isIOS && !isAndroid && (
                    <ol className="text-xs text-left list-decimal pl-4 space-y-1">
                      <li>Click the lock or site settings icon in your browser address bar</li>
                      <li>Find Location permissions</li>
                      <li>Change to "Allow"</li>
                      <li>Refresh this page</li>
                    </ol>
                  )}
                </div>
              )}
            </div>
          )}

          <Button onClick={requestLocation} className="gap-2">
            <MapPin className="h-4 w-4" />
            {isPermanentlyDenied ? "Try Again After Enabling Location" : "Enable Location"}
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
              <h3 className="font-medium text-sm">Weather & Travel Time</h3>
              <p className="text-xs text-gray-600 mt-1">
                Tap anywhere on the map to add locations and view real-time weather forecasts and travel times.
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
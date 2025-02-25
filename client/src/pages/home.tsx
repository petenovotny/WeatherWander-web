import { useEffect, useState } from "react";
import MapView from "@/components/map-view";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import type { Location } from "@shared/schema";

export default function Home() {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const requestLocation = () => {
    setIsLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLoading(false);
        },
        (error) => {
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
          toast({
            title: "Location Error",
            description: errorMessage,
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setIsLoading(false);
      toast({
        title: "Browser Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
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
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Location Access Required</h2>
          <p className="text-muted-foreground mb-4">We need your location to show nearby weather and calculate travel times</p>
          <Button onClick={requestLocation} className="gap-2">
            <MapPin className="h-4 w-4" />
            Enable Location
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <MapView userLocation={userLocation} />
    </div>
  );
}
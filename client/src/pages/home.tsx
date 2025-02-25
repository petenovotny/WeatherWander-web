import { useEffect, useState } from "react";
import MapView from "@/components/map-view";
import { useToast } from "@/hooks/use-toast";
import type { Location } from "@shared/schema";

export default function Home() {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          toast({
            title: "Location Error",
            description: "Could not get your location. Please enable location services.",
            variant: "destructive"
          });
        }
      );
    } else {
      toast({
        title: "Browser Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
    }
  }, []);

  if (!userLocation) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading Location...</h2>
          <p className="text-muted-foreground">Please allow location access when prompted</p>
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

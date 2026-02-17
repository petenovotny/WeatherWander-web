import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle, MapPin, Cloud, Clock, Thermometer } from "lucide-react";

export default function Support() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 py-8">
      <Card className="w-full max-w-2xl mx-4">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="h-8 w-8 text-amber-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              WeatherRoam Support
            </h1>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            WeatherRoam lets you drop pins on a map to see weather forecasts and
            driving times for any destination. Here's everything you need to get
            started.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">
              How to Use WeatherRoam
            </h2>

            <div className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Drop Pins
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Tap anywhere on the map to place a pin. A weather card will
                    appear showing the forecast for that location. You can place
                    up to 20 pins at once to compare destinations.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Cloud className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    4-Day Forecast
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Each weather card displays today's weather plus a 3-day
                    forecast with daily high and low temperatures and weather
                    condition icons.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Clock className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Travel Time
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Each card also shows the driving time and distance from your
                    current location. Travel times are available for any
                    road-accessible destination. Locations separated by ocean or
                    without road access will show the forecast without a travel
                    time.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Thermometer className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Temperature Units
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Use the °F / °C toggle in the top-right control panel to
                    switch between Fahrenheit and Celsius. The app defaults to
                    the standard unit for your region.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Removing Pins
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Tap any weather card to remove that pin from the map. To remove
              all pins at once, tap the "Clear All" button in the top-right
              control panel.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Location Access
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              WeatherRoam needs access to your location to center the map and
              calculate driving times. Your location is used in real-time only
              and is never stored or shared. If you denied location access, you
              can enable it in your device's Settings under WeatherRoam.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Why isn't travel time showing for some locations?
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Travel times require a drivable route between your location
                  and the pin. Destinations across oceans or in areas without
                  road access won't display a travel time.
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">
                  Why does the weather card show a loading spinner?
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Weather data is fetched in real-time when you place a pin. A
                  brief loading spinner is normal, especially on slower
                  connections.
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">
                  Is WeatherRoam free?
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Yes. WeatherRoam is completely free with no ads, no in-app
                  purchases, and no account required.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">Contact Us</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Have a question, found a bug, or want to suggest a feature? We'd
              love to hear from you. Reach us at{" "}
              <a
                href="mailto:support@weatherroam.com"
                className="text-amber-600 hover:text-amber-700 underline"
              >
                support@weatherroam.com
              </a>
              .
            </p>
          </section>

          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              <a href="/privacy" className="hover:text-gray-500 underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

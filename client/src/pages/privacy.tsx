import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 py-8">
      <Card className="w-full max-w-2xl mx-4">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-amber-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              Privacy Policy
            </h1>
          </div>

          <p className="text-sm text-gray-500">
            Last updated: February 12, 2026
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">Overview</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              WeatherRoam is a weather and travel time app that lets you tap
              locations on a map to see weather forecasts and driving times. We
              are committed to protecting your privacy and being transparent
              about what data we use.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Location Data
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              WeatherRoam uses your device's location to center the map on your
              current position and to calculate driving times from your location
              to places you select on the map. Your location data is:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 pl-2">
              <li>
                Used only in real-time to provide weather and travel time
                information
              </li>
              <li>Never stored on our servers</li>
              <li>Never shared with third parties</li>
              <li>Never used for tracking or advertising</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Third-Party Services
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              WeatherRoam uses the following third-party services to provide its
              functionality:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 pl-2">
              <li>
                <strong>OpenWeatherMap</strong> — to retrieve weather forecast
                data for map locations you select
              </li>
              <li>
                <strong>Google Maps</strong> — to display the interactive map
                and calculate driving distances and travel times
              </li>
              <li>
                <strong>Apple Maps</strong> — to display the interactive map on
                iOS devices
              </li>
            </ul>
            <p className="text-sm text-gray-600 leading-relaxed">
              API requests to these services are made through our server. Only
              the geographic coordinates (latitude and longitude) of map
              locations are sent — no personal information is included in these
              requests.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Data Collection
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              WeatherRoam does not:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 pl-2">
              <li>Require account creation or login</li>
              <li>Collect personal information (name, email, etc.)</li>
              <li>Use analytics or tracking tools</li>
              <li>Use cookies for tracking purposes</li>
              <li>Store any user data on our servers</li>
              <li>Display advertisements</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Children's Privacy
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              WeatherRoam does not knowingly collect any personal information
              from children. The app does not require any personal data to
              function.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Changes to This Policy
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We may update this privacy policy from time to time. Any changes
              will be posted on this page with an updated revision date.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">Contact</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              If you have questions about this privacy policy, please contact us
              at{" "}
              <a
                href="mailto:support@weatherroam.com"
                className="text-amber-600 hover:text-amber-700 underline"
              >
                support@weatherroam.com
              </a>
              .
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

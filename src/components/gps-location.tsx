"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Target } from "lucide-react";
import type { GPSCoordinates } from "@/lib/types";

interface GPSLocationProps {
  onLocationUpdate?: (location: GPSCoordinates) => void;
}

export function GPSLocation({ onLocationUpdate }: GPSLocationProps) {
  // Static dummy GPS location data
  const gpsData: GPSCoordinates = {
    latitude: 40.708154,
    longitude: -74.010420,
    accuracy: 8.5,
    timestamp: new Date().toISOString()
  };

  const address = "Liberty Island, New York, NY 10004, USA";

  // Call onLocationUpdate with static data if provided
  if (onLocationUpdate) {
    onLocationUpdate(gpsData);
  }

  const getAccuracyColor = (accuracy?: number) => {
    if (!accuracy) return 'gray';
    if (accuracy < 5) return 'green';
    if (accuracy < 10) return 'yellow';
    return 'orange';
  };

  const getAccuracyText = (accuracy?: number) => {
    if (!accuracy) return 'Unknown';
    if (accuracy < 5) return 'Excellent';
    if (accuracy < 10) return 'Good';
    if (accuracy < 20) return 'Fair';
    return 'Poor';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-green-500" />
          Current Location & Map View
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location Info Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Address */}
          <div className="lg:col-span-2">
            <p className="text-sm font-medium mb-1">Address</p>
            <p className="text-sm text-muted-foreground">{address}</p>
          </div>

          {/* Coordinates */}
          <div>
            <p className="text-sm font-medium mb-1">Coordinates</p>
            <div className="space-y-1">
              <p className="font-mono text-xs">Lat: {gpsData.latitude.toFixed(6)}°</p>
              <p className="font-mono text-xs">Lng: {gpsData.longitude.toFixed(6)}°</p>
            </div>
          </div>

          {/* Status & Accuracy */}
          <div>
            <p className="text-sm font-medium mb-1">Status</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-muted-foreground">Fixed Location</span>
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs w-fit ${
                  getAccuracyColor(gpsData.accuracy) === 'green' ? 'border-green-500 text-green-700' :
                  getAccuracyColor(gpsData.accuracy) === 'yellow' ? 'border-yellow-500 text-yellow-700' :
                  getAccuracyColor(gpsData.accuracy) === 'orange' ? 'border-orange-500 text-orange-700' :
                  'border-gray-500 text-gray-700'
                }`}
              >
                ±{gpsData.accuracy?.toFixed(1)}m {getAccuracyText(gpsData.accuracy)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Large Map Visualization Area */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Interactive Map View</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>Liberty Island, New York</span>
            </div>
          </div>
          
          {/* Large Map Container */}
          <div className="w-full h-64 md:h-80 lg:h-96 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center relative overflow-hidden">
            
            {/* Map Placeholder with Grid Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="grid grid-cols-8 grid-rows-6 h-full w-full">
                {Array.from({length: 48}).map((_, i) => (
                  <div key={i} className="border border-muted-foreground/20"></div>
                ))}
              </div>
            </div>
            
            {/* Center Location Marker */}
            <div className="relative z-10 text-center">
              <div className="relative">
                {/* Pulsing Location Marker */}
                <div className="absolute inset-0 w-12 h-12 mx-auto">
                  <div className="w-12 h-12 bg-red-500 rounded-full animate-pulse opacity-30"></div>
                </div>
                <div className="relative z-10 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
              </div>
              
              {/* Location Details */}
              <div className="mt-4 space-y-2">
                <p className="text-lg font-semibold text-foreground">Liberty Island</p>
                <p className="text-sm text-muted-foreground">New York Harbor</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/80 dark:bg-black/80 rounded-full text-xs">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span>Live Location</span>
                </div>
              </div>
            </div>
            
            {/* Map Controls Overlay */}
            <div className="absolute top-3 right-3 flex flex-col gap-1">
              <button className="w-8 h-8 bg-white/80 dark:bg-black/80 rounded border flex items-center justify-center text-xs hover:bg-white dark:hover:bg-black transition-colors">
                +
              </button>
              <button className="w-8 h-8 bg-white/80 dark:bg-black/80 rounded border flex items-center justify-center text-xs hover:bg-white dark:hover:bg-black transition-colors">
                −
              </button>
            </div>
            
            {/* Coordinates Overlay */}
            <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-black/90 px-2 py-1 rounded text-xs font-mono">
              {gpsData.latitude.toFixed(6)}, {gpsData.longitude.toFixed(6)}
            </div>
            
            {/* Integration Notice */}
            <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-black/90 px-2 py-1 rounded text-xs text-muted-foreground">
              Google Maps integration coming soon
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

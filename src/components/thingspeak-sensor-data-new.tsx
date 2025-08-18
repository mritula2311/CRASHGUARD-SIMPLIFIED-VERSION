"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  Wifi, 
  Gauge, 
  RefreshCw, 
  AlertTriangle,
  TrendingUp,
  Radio,
  Zap,
  RotateCcw,
  Vibrate
} from "lucide-react";

interface AccelerationData {
  x: number;
  y: number;
  z: number;
  magnitude: number;
  timestamp: string;
}

interface GyroscopeData {
  x: number;
  y: number;
  z: number;
  magnitude: number;
  timestamp: string;
}

interface VibrationData {
  front_left: number;
  front_right: number;
  mid_left: number;
  mid_right: number;
  rear_left: number;
  rear_right: number;
  total_active: number;
  timestamp: string;
}

interface LiveSensorData {
  timestamp: string;
  data_source: string;
  acceleration: AccelerationData;
  gyroscope: GyroscopeData;
  vibration: VibrationData;
  risk_assessment?: {
    overall_risk: string;
    acceleration_level: string;
    gyroscope_level: string;
    vibration_level: string;
  };
  model_prediction?: {
    risk_level: string;
    confidence: number;
    recommended_action: string;
    crash_probability: number;
  };
}

export function ThingSpeakSensorData() {
  const [sensorData, setSensorData] = useState<LiveSensorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchSensorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/live-sensor-data");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: LiveSensorData = await response.json();
      
      setSensorData(data);
      setConnectionStatus(data.data_source === "thingspeak_live" ? "connected" : "disconnected");
      setLastUpdated(new Date().toLocaleTimeString());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setConnectionStatus("error");
      console.error("Error fetching sensor data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSensorData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return <Badge className="bg-green-500 text-white"><Wifi className="w-3 h-3 mr-1" />Live Data</Badge>;
      case "disconnected":
        return <Badge variant="secondary"><Radio className="w-3 h-3 mr-1" />Demo Mode</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case "critical":
        return <Badge className="bg-red-600 text-white pulse">CRITICAL</Badge>;
      case "high":
        return <Badge className="bg-orange-500 text-white">HIGH</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 text-black">MEDIUM</Badge>;
      case "normal":
        return <Badge className="bg-green-500 text-white">NORMAL</Badge>;
      default:
        return <Badge variant="outline">{riskLevel?.toUpperCase() || "UNKNOWN"}</Badge>;
    }
  };

  if (loading && !sensorData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Loading Sensor Data...
            <RefreshCw className="h-4 w-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Connecting to ThingSpeak channels...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Multi-Channel Sensor Data
              {getConnectionBadge()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchSensorData}
                variant="outline"
                size="sm"
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
              >
                Auto-refresh {autoRefresh ? "ON" : "OFF"}
              </Button>
            </div>
          </div>
          {lastUpdated && (
            <div className="text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </div>
          )}
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error fetching sensor data: {error}
          </AlertDescription>
        </Alert>
      )}

      {sensorData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Acceleration Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Zap className="h-5 w-5" />
                Acceleration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {sensorData.acceleration.magnitude.toFixed(2)} m/s²
                  </div>
                  <div className="text-sm text-muted-foreground">Magnitude</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{sensorData.acceleration.x.toFixed(2)}</div>
                    <div className="text-muted-foreground">X-axis</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{sensorData.acceleration.y.toFixed(2)}</div>
                    <div className="text-muted-foreground">Y-axis</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{sensorData.acceleration.z.toFixed(2)}</div>
                    <div className="text-muted-foreground">Z-axis</div>
                  </div>
                </div>
                {sensorData.risk_assessment && (
                  <div className="flex justify-center">
                    {getRiskBadge(sensorData.risk_assessment.acceleration_level)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gyroscope Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <RotateCcw className="h-5 w-5" />
                Gyroscope
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {sensorData.gyroscope.magnitude.toFixed(2)} °/s
                  </div>
                  <div className="text-sm text-muted-foreground">Magnitude</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{sensorData.gyroscope.x.toFixed(2)}</div>
                    <div className="text-muted-foreground">X-axis</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{sensorData.gyroscope.y.toFixed(2)}</div>
                    <div className="text-muted-foreground">Y-axis</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{sensorData.gyroscope.z.toFixed(2)}</div>
                    <div className="text-muted-foreground">Z-axis</div>
                  </div>
                </div>
                {sensorData.risk_assessment && (
                  <div className="flex justify-center">
                    {getRiskBadge(sensorData.risk_assessment.gyroscope_level)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vibration Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Vibrate className="h-5 w-5" />
                Vibration Sensors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {sensorData.vibration.total_active}/6
                  </div>
                  <div className="text-sm text-muted-foreground">Active Sensors</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Front L:</span>
                    <span className={sensorData.vibration.front_left ? "text-red-500 font-bold" : "text-gray-400"}>
                      {sensorData.vibration.front_left ? "●" : "○"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Front R:</span>
                    <span className={sensorData.vibration.front_right ? "text-red-500 font-bold" : "text-gray-400"}>
                      {sensorData.vibration.front_right ? "●" : "○"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mid L:</span>
                    <span className={sensorData.vibration.mid_left ? "text-red-500 font-bold" : "text-gray-400"}>
                      {sensorData.vibration.mid_left ? "●" : "○"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mid R:</span>
                    <span className={sensorData.vibration.mid_right ? "text-red-500 font-bold" : "text-gray-400"}>
                      {sensorData.vibration.mid_right ? "●" : "○"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rear L:</span>
                    <span className={sensorData.vibration.rear_left ? "text-red-500 font-bold" : "text-gray-400"}>
                      {sensorData.vibration.rear_left ? "●" : "○"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rear R:</span>
                    <span className={sensorData.vibration.rear_right ? "text-red-500 font-bold" : "text-gray-400"}>
                      {sensorData.vibration.rear_right ? "●" : "○"}
                    </span>
                  </div>
                </div>
                {sensorData.risk_assessment && (
                  <div className="flex justify-center">
                    {getRiskBadge(sensorData.risk_assessment.vibration_level)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Assessment and AI Prediction */}
      {sensorData?.risk_assessment && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Overall Risk:</span>
                  {getRiskBadge(sensorData.risk_assessment.overall_risk)}
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Acceleration:</span>
                    <span className="capitalize">{sensorData.risk_assessment.acceleration_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gyroscope:</span>
                    <span className="capitalize">{sensorData.risk_assessment.gyroscope_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vibration:</span>
                    <span className="capitalize">{sensorData.risk_assessment.vibration_level}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {sensorData.model_prediction && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  AI Prediction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Risk Level:</span>
                    {getRiskBadge(sensorData.model_prediction.risk_level)}
                  </div>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <span className="font-medium">{(sensorData.model_prediction.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Crash Probability:</span>
                      <span className="font-medium">{(sensorData.model_prediction.crash_probability * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span>Action: </span>
                      <span className="font-medium capitalize">
                        {sensorData.model_prediction.recommended_action.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Data Source Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Data Source: <span className="font-medium">{sensorData?.data_source || "Unknown"}</span>
              {sensorData?.timestamp && (
                <span> | Last Update: {new Date(sensorData.timestamp).toLocaleString()}</span>
              )}
            </p>
            <p className="mt-1">
              {connectionStatus === "connected" 
                ? "🟢 Live data from ThingSpeak multi-channel feed" 
                : "🟡 Demo mode - Configure ThingSpeak channels for live data"
              }
            </p>
          </div>
        </CardContent>
      </Card>

      <style jsx>{`
        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

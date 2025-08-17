"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Activity, AlertTriangle, Zap, TrendingUp, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { getReinforcementModelData, type ReinforcementModelData } from "@/services/reinforcement-model";
import { Skeleton } from "./ui/skeleton";

export function ReinforcementModelPanel() {
  const [modelData, setModelData] = useState<ReinforcementModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModelData() {
      try {
        setLoading(true);
        const data = await getReinforcementModelData();
        setModelData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load model data');
      } finally {
        setLoading(false);
      }
    }

    fetchModelData();
    // Load model data once on component mount
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Model Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!modelData) return null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HIGH': return 'bg-orange-500';
      case 'CRITICAL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'default';
      case 'MEDIUM': return 'secondary';
      case 'HIGH': return 'destructive';
      case 'CRITICAL': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Model Prediction Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            DRQN Model Prediction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getRiskColor(modelData.riskLevel)} text-white mb-3`}>
                <Zap className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold mb-1">{modelData.prediction.action.replace(/_/g, ' ')}</h3>
              <Badge variant={getRiskBadgeVariant(modelData.riskLevel)} className="text-sm">
                {modelData.riskLevel} RISK
              </Badge>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Model Confidence</span>
                <span className="text-sm font-bold">{Math.round(modelData.prediction.confidence * 100)}%</span>
              </div>
              <Progress value={modelData.prediction.confidence * 100} className="h-3" />
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-semibold">{modelData.prediction.severity}</div>
                <div className="text-muted-foreground">Severity State</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-semibold">{modelData.vibrationStatus.totalActive}/6</div>
                <div className="text-muted-foreground">Active Sensors</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Reading at: {modelData.prediction.timestamp}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Sensor Data Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Live Sensor Readings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Vibration Grid */}
            <div>
              <p className="text-sm font-medium mb-3">Vibration Sensor Grid</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(modelData.latestSensorReading.data.vibration_sensors).map(([position, active]) => {
                  const isLeft = position.includes('left');
                  const isRight = position.includes('right');
                  const isFront = position.includes('front');
                  const isMid = position.includes('mid');
                  const isRear = position.includes('rear');
                  
                  return (
                    <div 
                      key={position} 
                      className={`p-3 rounded border-2 transition-all ${
                        active 
                          ? 'bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700' 
                          : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium capitalize">
                          {position.replace('_', ' ')}
                        </span>
                        <div className={`w-4 h-4 rounded-full ${
                          active ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {modelData.vibrationStatus.activePositions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Active Positions:</p>
                  <div className="flex flex-wrap gap-1">
                    {modelData.vibrationStatus.activePositions.map((position) => (
                      <Badge key={position} variant="destructive" className="text-xs">
                        {position}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Acceleration & Tilt */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Acceleration</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>X:</span>
                    <span className="font-mono">{modelData.latestSensorReading.data.accel_x.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Y:</span>
                    <span className="font-mono">{modelData.latestSensorReading.data.accel_y.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Z:</span>
                    <span className="font-mono">{modelData.latestSensorReading.data.accel_z.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Mag:</span>
                    <span className="font-mono">{modelData.accelerationMagnitude.toFixed(2)} m/s²</span>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Vehicle Tilt</p>
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1">
                    {Math.abs(modelData.latestSensorReading.data.tilt_degrees).toFixed(1)}°
                  </div>
                  <Progress 
                    value={Math.min(Math.abs(modelData.latestSensorReading.data.tilt_degrees), 90)} 
                    className="h-2 mb-1" 
                  />
                  <div className="text-xs text-muted-foreground">
                    {modelData.latestSensorReading.data.tilt_degrees > 0 ? 'Right' : 'Left'} tilt
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-muted rounded">
              <div className="font-medium mb-1">Risk Factors:</div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• {modelData.vibrationStatus.totalActive} of 6 vibration sensors active</li>
                <li>• Acceleration magnitude: {modelData.accelerationMagnitude.toFixed(2)} m/s² (normal ~9.8)</li>
                <li>• Vehicle tilt: {Math.abs(modelData.latestSensorReading.data.tilt_degrees).toFixed(1)}° from vertical</li>
                <li>• Model confidence: {Math.round(modelData.prediction.confidence * 100)}%</li>
              </ul>
            </div>
            
            <div className="text-center">
              <div className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium ${getRiskColor(modelData.riskLevel)}`}>
                {modelData.riskLevel} RISK LEVEL
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

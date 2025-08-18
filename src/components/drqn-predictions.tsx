"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Activity, AlertTriangle, Shield, Zap } from "lucide-react";

interface DRQNPrediction {
  timestamp: string;
  sensor_data: {
    accel_x: number;
    accel_y: number;
    accel_z: number;
    gyro_x: number;
    gyro_y: number;
    gyro_z: number;
    vibration: number;
  };
  vibration_sensors: {
    front_left: number;
    front_right: number;
    mid_left: number;
    mid_right: number;
    rear_left: number;
    rear_right: number;
  };
  severity: number;
  severity_name: string;
  predicted_action: number;
  action_name: string;
  confidence: number;
  q_values: number[];
  action_probabilities: number[];
  active_sensors: number;
  roll_sum_3: number;
  model_version: string;
  crash_risk_level: string;
}

interface ModelInfo {
  name: string;
  version: string;
  training_data: string;
  epochs: number;
  input_features: number;
  actions: number;
}

export function DrqnPredictions() {
  const [prediction, setPrediction] = useState<DRQNPrediction | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>('');
  const [isLiveData, setIsLiveData] = useState(false);

  const fetchPredictions = async () => {
    try {
      const response = await fetch('/api/drqn-predictions');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      if (data.success) {
        setPrediction(data.data);
        setModelInfo(data.model_info);
        setDataSource(data.source);
        setIsLiveData(data.source === 'drqn_model_live');
      }
    } catch (err) {
      console.error("Error fetching predictions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500'; 
      case 'MODERATE': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'EMERGENCY_DISPATCH': return 'destructive';
      case 'ALERT_NEARBY': return 'secondary';
      case 'LOG_MINOR': return 'outline';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'S3_SEVERE': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'S2_MODERATE': return <Activity className="h-5 w-5 text-orange-500" />;
      case 'S1_MINOR': return <Zap className="h-5 w-5 text-yellow-500" />;
      default: return <Shield className="h-5 w-5 text-green-500" />;
    }
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!prediction) {
    return null; // Don't show anything on error or no data
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            DRQN AI Crash Detection Model
            <div className="flex items-center gap-1 ml-2">
              <div className={`w-2 h-2 rounded-full ${isLiveData ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-xs text-muted-foreground">
                {isLiveData ? 'Live ThingSpeak Data' : 'Connection Error'}
              </span>
            </div>
          </div>
          {modelInfo && (
            <Badge variant="outline" className="text-xs">
              {modelInfo.version}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Primary Prediction Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Risk Level */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              {getSeverityIcon(prediction.severity_name || '')}
              <span className="ml-2 font-semibold">{prediction.severity_name || 'UNKNOWN'}</span>
            </div>
            <Badge className={`${getRiskColor(prediction.crash_risk_level || '')} text-white px-3 py-1`}>
              {(prediction.crash_risk_level || 'UNKNOWN')} RISK
            </Badge>
          </div>

          {/* Predicted Action */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">AI Recommendation</p>
            <Badge variant={getActionColor(prediction.action_name || '')} className="px-3 py-1">
              {(prediction.action_name || 'UNKNOWN').replace(/_/g, ' ')}
            </Badge>
          </div>

          {/* Confidence */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Model Confidence</p>
            <div className="space-y-1">
              <Progress value={(prediction.confidence || 0) * 100} className="h-2" />
              <p className="text-sm font-medium">{((prediction.confidence || 0) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Vibration Sensor Matrix */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Vibration Sensor Activity
          </h4>
          <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
            
            {/* Front sensors */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Front</p>
              <div className="flex gap-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  prediction.vibration_sensors?.front_left ? 'bg-red-500 border-red-600' : 'bg-gray-200 border-gray-300'
                }`} title="Front Left" />
                <div className={`w-4 h-4 rounded-full border-2 ${
                  prediction.vibration_sensors?.front_right ? 'bg-red-500 border-red-600' : 'bg-gray-200 border-gray-300'
                }`} title="Front Right" />
              </div>
            </div>

            {/* Mid sensors */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Mid</p>
              <div className="flex gap-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  prediction.vibration_sensors?.mid_left ? 'bg-red-500 border-red-600' : 'bg-gray-200 border-gray-300'
                }`} title="Mid Left" />
                <div className={`w-4 h-4 rounded-full border-2 ${
                  prediction.vibration_sensors?.mid_right ? 'bg-red-500 border-red-600' : 'bg-gray-200 border-gray-300'
                }`} title="Mid Right" />
              </div>
            </div>

            {/* Rear sensors */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Rear</p>
              <div className="flex gap-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  prediction.vibration_sensors?.rear_left ? 'bg-red-500 border-red-600' : 'bg-gray-200 border-gray-300'
                }`} title="Rear Left" />
                <div className={`w-4 h-4 rounded-full border-2 ${
                  prediction.vibration_sensors?.rear_right ? 'bg-red-500 border-red-600' : 'bg-gray-200 border-gray-300'
                }`} title="Rear Right" />
              </div>
            </div>

            {/* Summary */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Active</p>
              <div className="text-sm font-semibold">
                {prediction.active_sensors || 0}/6
              </div>
            </div>
          </div>
        </div>

        {/* Q-Values Distribution */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Action Probabilities (Q-Values)</h4>
          <div className="space-y-2">
            {['WAIT', 'LOG_MINOR', 'ALERT_NEARBY', 'EMERGENCY_DISPATCH'].map((action, index) => (
              <div key={action} className="flex items-center gap-3">
                <span className="text-xs w-20 text-muted-foreground">
                  {action.replace(/_/g, ' ')}
                </span>
                <Progress 
                  value={(prediction.action_probabilities?.[index] || 0) * 100} 
                  className="flex-1 h-2" 
                />
                <span className="text-xs w-12 text-right">
                  {((prediction.action_probabilities?.[index] || 0) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Details */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center bg-muted/20 p-4 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Roll Sum (3)</p>
            <p className="text-sm font-semibold">{prediction.roll_sum_3 || 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vibration</p>
            <p className="text-sm font-semibold">{typeof prediction.sensor_data?.vibration === 'number' ? prediction.sensor_data.vibration.toFixed(1) : (Number(prediction.sensor_data?.vibration) || 0).toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Accel Mag</p>
            <p className="text-sm font-semibold">
              {Math.sqrt(
                (Number(prediction.sensor_data?.accel_x) || 0)**2 + 
                (Number(prediction.sensor_data?.accel_y) || 0)**2 + 
                (Number(prediction.sensor_data?.accel_z) || 0)**2
              ).toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gyro Mag</p>
            <p className="text-sm font-semibold">
              {Math.sqrt(
                (Number(prediction.sensor_data?.gyro_x) || 0)**2 + 
                (Number(prediction.sensor_data?.gyro_y) || 0)**2 + 
                (Number(prediction.sensor_data?.gyro_z) || 0)**2
              ).toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Data Source</p>
            <p className="text-xs font-semibold">
              {isLiveData ? 'ThingSpeak Live' : 'Error'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Timestamp</p>
            <p className="text-xs">
              {prediction.timestamp ? new Date(prediction.timestamp).toLocaleTimeString() : 'N/A'}
            </p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

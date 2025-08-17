'use server';

import { readFile } from 'fs/promises';
import { join } from 'path';

export interface SensorData {
  time: string;
  data: {
    tilt_degrees: number;
    accel_x: number;
    accel_y: number;
    accel_z: number;
    vibration_sensors: {
      front_left: number;
      front_right: number;
      mid_left: number;
      mid_right: number;
      rear_left: number;
      rear_right: number;
    };
  };
}

export interface ModelPrediction {
  action: string;
  severity: string;
  confidence: number;
  timestamp: string;
}

export interface ReinforcementModelData {
  latestSensorReading: SensorData;
  prediction: ModelPrediction;
  vibrationStatus: {
    totalActive: number;
    activePositions: string[];
  };
  accelerationMagnitude: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Reads the latest sensor data from the reinforcement model's sensor.json file
 */
export async function getLatestSensorData(): Promise<SensorData[]> {
  try {
    const sensorPath = join(process.cwd(), 'RENIFORCEMENT-MODEL', 'sensor.json');
    const fileContent = await readFile(sensorPath, 'utf-8');
    const sensorData: SensorData[] = JSON.parse(fileContent);
    return sensorData;
  } catch (error) {
    console.error('Error reading sensor data:', error);
    throw new Error('Unable to read sensor data from file');
  }
}

/**
 * Calculates vibration sensor status
 */
function calculateVibrationStatus(vibrationSensors: SensorData['data']['vibration_sensors']) {
  const positions = Object.entries(vibrationSensors);
  const activePositions = positions
    .filter(([_, value]) => value === 1)
    .map(([position]) => position.replace('_', ' '));
  
  return {
    totalActive: activePositions.length,
    activePositions
  };
}

/**
 * Calculates the magnitude of acceleration
 */
function calculateAccelerationMagnitude(accel_x: number, accel_y: number, accel_z: number): number {
  return Math.sqrt(accel_x ** 2 + accel_y ** 2 + accel_z ** 2);
}

/**
 * Determines risk level based on sensor data
 */
function determineRiskLevel(
  vibrationCount: number,
  accelerationMagnitude: number,
  tiltDegrees: number
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const absAccel = Math.abs(accelerationMagnitude - 9.8); // Subtract gravity
  const absTilt = Math.abs(tiltDegrees);
  
  if (vibrationCount >= 5 || absAccel > 15 || absTilt > 45) {
    return 'CRITICAL';
  } else if (vibrationCount >= 3 || absAccel > 8 || absTilt > 30) {
    return 'HIGH';
  } else if (vibrationCount >= 1 || absAccel > 3 || absTilt > 15) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Generates model prediction based on actual sensor data analysis
 */
function generateModelPrediction(sensorData: SensorData, riskLevel: string): ModelPrediction {
  const actions = {
    LOW: 'WAIT',
    MEDIUM: 'LOG_MINOR', 
    HIGH: 'ALERT_NEARBY',
    CRITICAL: 'EMERGENCY_DISPATCH'
  };
  
  const severities = {
    LOW: 'S0_NORMAL',
    MEDIUM: 'S1_MINOR',
    HIGH: 'S2_MODERATE', 
    CRITICAL: 'S3_SEVERE'
  };
  
  // Calculate confidence based on actual sensor readings
  const vibCount = calculateVibrationStatus(sensorData.data.vibration_sensors).totalActive;
  const accelerationMag = calculateAccelerationMagnitude(
    sensorData.data.accel_x,
    sensorData.data.accel_y,
    sensorData.data.accel_z
  );
  const tiltAbs = Math.abs(sensorData.data.tilt_degrees);
  
  // Calculate confidence based on how clear the indicators are
  let confidence = 0.5;
  if (vibCount >= 4) confidence += 0.3;
  else if (vibCount >= 2) confidence += 0.2;
  else if (vibCount >= 1) confidence += 0.1;
  
  if (Math.abs(accelerationMag - 9.8) > 10) confidence += 0.2;
  else if (Math.abs(accelerationMag - 9.8) > 5) confidence += 0.1;
  
  if (tiltAbs > 30) confidence += 0.2;
  else if (tiltAbs > 15) confidence += 0.1;
  
  confidence = Math.min(confidence, 0.95);
  
  return {
    action: actions[riskLevel as keyof typeof actions],
    severity: severities[riskLevel as keyof typeof severities],
    confidence,
    timestamp: sensorData.time
  };
}

/**
 * Gets the latest reinforcement model analysis
 */
export async function getReinforcementModelData(): Promise<ReinforcementModelData> {
  const sensorReadings = await getLatestSensorData();
  const latestReading = sensorReadings[sensorReadings.length - 1];
  
  if (!latestReading) {
    throw new Error('No sensor data available');
  }
  
  const vibrationStatus = calculateVibrationStatus(latestReading.data.vibration_sensors);
  const accelerationMagnitude = calculateAccelerationMagnitude(
    latestReading.data.accel_x,
    latestReading.data.accel_y,
    latestReading.data.accel_z
  );
  
  const riskLevel = determineRiskLevel(
    vibrationStatus.totalActive,
    accelerationMagnitude,
    latestReading.data.tilt_degrees
  );
  
  const prediction = generateModelPrediction(latestReading, riskLevel);
  
  return {
    latestSensorReading: latestReading,
    prediction,
    vibrationStatus,
    accelerationMagnitude,
    riskLevel
  };
}

/**
 * Gets historical sensor data for trend analysis
 */
export async function getSensorHistory(count: number = 10): Promise<SensorData[]> {
  const allData = await getLatestSensorData();
  return allData.slice(-count); // Get last N readings
}

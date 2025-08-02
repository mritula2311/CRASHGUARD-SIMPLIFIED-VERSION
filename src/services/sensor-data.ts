/**
 * @file This file contains sample sensor data that simulates what might be
 * received from a LoRaWAN-enabled crash detection device.
 *
 * In a real-world scenario, this data would be transmitted as a compact
 * binary payload over the LoRa network.
 */

interface RawSensorData {
  deviceId: string;
  timestamp: number;
  lat: number;
  lng: number;
  gforce: number; // Peak G-force detected
  speed_mph: number; // Speed at time of impact
}

export const SENSOR_DATA_SAMPLES: RawSensorData[] = [
  {
    deviceId: 'CG-001A',
    timestamp: 1678886400,
    lat: 34.0522,
    lng: -118.2437,
    gforce: 12.5,
    speed_mph: 75,
  },
  {
    deviceId: 'CG-002B',
    timestamp: 1678887000,
    lat: 40.7128,
    lng: -74.0060,
    gforce: 5.1,
    speed_mph: 45,
  },
  {
    deviceId: 'CG-003C',
    timestamp: 1678887600,
    lat: 41.8781,
    lng: -87.6298,
    gforce: 2.3,
    speed_mph: 25,
  },
  {
    deviceId: 'CG-004D',
    timestamp: 1678888200,
    lat: 29.7604,
    lng: -95.3698,
    gforce: 9.8,
    speed_mph: 85,
  },
    {
    deviceId: 'CG-005E',
    timestamp: 1678888800,
    lat: 47.6062,
    lng: -122.3321,
    gforce: 15.2,
    speed_mph: 90,
  },
];

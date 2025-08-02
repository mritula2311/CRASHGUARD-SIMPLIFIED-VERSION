/**
 * @file This file simulates a LoRaWAN receiver service.
 * In a real-world application, this service would listen for incoming LoRa packets,
 * decode them, and provide the sensor data to the application.
 */
'use server';

import type { CrashData } from '@/lib/types';
import { SENSOR_DATA_SAMPLES } from './sensor-data';

/**
 * Simulates fetching the latest sensor data from a LoRaWAN network.
 * In a real implementation, this would involve connecting to a LoRaWAN network server
 * (e.g., via MQTT or a WebSocket) and decoding a payload.
 *
 * For this simulation, it randomly selects a data sample from the predefined list.
 *
 * @returns {Promise<CrashData>} A promise that resolves to the latest crash data.
 */
export async function getSensorData(): Promise<CrashData> {
  console.log('Simulating fetch from LoRaWAN network...');

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Randomly pick one of the sample sensor data packets
  const randomIndex = Math.floor(Math.random() * SENSOR_DATA_SAMPLES.length);
  const rawData = SENSOR_DATA_SAMPLES[randomIndex];

  console.log(`Received raw packet: ${JSON.stringify(rawData)}`);

  // Simulate decoding the LoRa packet payload.
  // Real payloads are binary; here we just transform the data.
  const decodedData: CrashData = {
    location: `${rawData.lat}, ${rawData.lng}`,
    severity: rawData.gforce > 8 ? 'High' : rawData.gforce > 4 ? 'Medium' : 'Low',
    speed: Math.round(rawData.speed_mph * 1.60934), // convert to km/h
  };

  console.log(`Decoded data: ${JSON.stringify(decodedData)}`);

  return decodedData;
}

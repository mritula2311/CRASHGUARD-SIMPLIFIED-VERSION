/**
 * @file This file previously contained dummy sensor data samples.
 * 
 * REMOVED: All dummy data generators have been removed.
 * The system now exclusively uses live ThingSpeak data from ESP32 sensors.
 * 
 * Live data sources:
 * - ThingSpeak Channel 3038363: Acceleration data
 * - ThingSpeak Channel 3038370: Gyroscope data  
 * - ThingSpeak Channel 3038377: Vibration data
 *
 * Data is processed by: thingspeak_live_processor.py
 * DRQN AI predictions: drqn_model.py / simple_drqn.py
 */

// This file has been cleaned - no dummy data generators remain
export const LIVE_DATA_SOURCES = {
  THINGSPEAK_ACCELERATION: '3038363',
  THINGSPEAK_GYROSCOPE: '3038370', 
  THINGSPEAK_VIBRATION: '3038377',
  UPDATE_INTERVAL: 5000, // milliseconds
  DATA_SOURCE: 'thingspeak_live'
} as const;

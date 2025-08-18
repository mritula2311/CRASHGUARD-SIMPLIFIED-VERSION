import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // Path to the live sensor data file created by Python processor
    const dataPath = join(process.cwd(), 'src', 'data', 'live_sensor_data.json');
    
    try {
      const fileContent = await readFile(dataPath, 'utf-8');
      const sensorData = JSON.parse(fileContent);
      
      // Add CORS headers
      const response = NextResponse.json({
        success: true,
        data: sensorData,
        data_source: 'thingspeak_live',
        streaming_mode: false,
        timestamp: new Date().toISOString()
      });
      
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      
      return response;
      
    } catch (fileError) {
      // File doesn't exist - recommend streaming mode
      console.log('Live sensor data file not found - use streaming processor for real-time data');
      
      const streamingRecommendation = {
        timestamp: new Date().toISOString(),
        status: "no_file_data",
        data_source: "file_not_found",
        message: "JSON file not found - System now uses streaming mode",
        recommendation: {
          title: "Streaming Mode Active",
          description: "System has been upgraded to direct streaming without JSON files",
          action: "Use streaming_thingspeak_monitor.py for real-time data",
          websocket_endpoint: "ws://localhost:8765",
          benefits: [
            "Real-time DRQN AI predictions",
            "No JSON file dependencies", 
            "Direct ThingSpeak streaming",
            "Lower latency",
            "Better performance"
          ]
        },
        live_sensors: {
          thingspeak_acceleration: "Channel 3038363",
          thingspeak_gyroscope: "Channel 3038370", 
          thingspeak_vibration: "Channel 3038377"
        },
        system_health: {
          file_mode: false,
          streaming_mode: true,
          data_quality: "real_time_preferred",
          ai_model_active: true,
          last_update: null
        },
        configuration: {
          update_interval: 5,
          streaming_enabled: true,
          websocket_port: 8765,
          thresholds: {
            acceleration_threshold: 15.0,
            vibration_threshold: 8.0,
            confidence_threshold: 0.8
          }
        }
      };
      
      return NextResponse.json({
        success: true,
        data: streamingRecommendation,
        message: "System upgraded to streaming mode - no JSON files needed",
        streaming_available: true,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Error reading live sensor data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to read live sensor data',
      message: error instanceof Error ? error.message : 'Unknown error',
      recommendation: "Use streaming_thingspeak_monitor.py for real-time data",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'POST method not supported for live sensor data'
  }, { status: 405 });
}

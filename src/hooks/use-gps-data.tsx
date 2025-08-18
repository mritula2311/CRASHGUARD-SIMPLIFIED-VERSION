"use client";

import { useState, useEffect, useCallback } from 'react';

interface GPSData {
  latitude: number;
  longitude: number;
  gps_speed: number;
  altitude: number;
  satellites?: number;
  hdop?: number;
  timestamp: string;
  success: boolean;
  data_source?: 'thingspeak' | 'fallback';
}

interface UseGPSDataReturn {
  gpsData: GPSData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGPSData(refreshInterval = 30000): UseGPSDataReturn {
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGPSData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/gps-data', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });

      if (!response.ok) {
        throw new Error(`GPS API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle the response structure from our Python service
      if (data.success === false && data.data) {
        // Python service returned fallback data
        setGpsData({
          latitude: data.data.latitude || 13.042901,
          longitude: data.data.longitude || 80.142150,
          gps_speed: data.data.gps_speed || 0,
          altitude: data.data.altitude || 50,
          timestamp: data.data.timestamp || new Date().toISOString(),
          success: false,
          data_source: 'fallback'
        });
        setError('Using default coordinates');
      } else if (data.latitude && data.longitude) {
        // Direct GPS data response
        setGpsData({
          latitude: data.latitude,
          longitude: data.longitude,
          gps_speed: data.gps_speed || 0,
          altitude: data.altitude || 50,
          satellites: data.satellites,
          hdop: data.hdop,
          timestamp: data.timestamp || new Date().toISOString(),
          success: data.success !== false,
          data_source: data.data_source || 'thingspeak'
        });
        setError(null);
      } else {
        // Fallback to default coordinates
        setGpsData({
          latitude: 13.042901,
          longitude: 80.142150,
          gps_speed: 0,
          altitude: 50,
          satellites: 7,
          hdop: 1.29,
          timestamp: new Date().toISOString(),
          success: false,
          data_source: 'fallback'
        });
        setError('Invalid GPS data received');
      }
    } catch (err) {
      console.error('Error fetching GPS data:', err);
      
      // Set fallback GPS data on error
      setGpsData({
        latitude: 13.042901,
        longitude: 80.142150,
        gps_speed: 0,
        altitude: 50,
        satellites: 7,
        hdop: 1.29,
        timestamp: new Date().toISOString(),
        success: false,
        data_source: 'fallback'
      });
      setError(`GPS service error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchGPSData();
  }, [fetchGPSData]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchGPSData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchGPSData, refreshInterval]);

  return {
    gpsData,
    loading,
    error,
    refetch: fetchGPSData
  };
}

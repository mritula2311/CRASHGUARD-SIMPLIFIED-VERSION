import { useState, useEffect } from 'react';

interface GPSData {
  latitude: number;
  longitude: number;
  altitude: number;
  gps_speed: number;
  timestamp_gps: string;
  timestamp: string;
  success: boolean;
  data_source?: string;
}

export function useGPSData(refreshInterval = 10000) { // Refresh every 10 seconds
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGPSData = async () => {
    try {
      const response = await fetch('/api/gps-data');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success !== false) {
        setGpsData(data);
        setError(null);
      } else {
        // If success is false, use fallback data but set error
        setGpsData({
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 0,
          gps_speed: 0,
          timestamp_gps: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          success: false,
          data_source: 'fallback'
        });
        setError(data.error || 'GPS data unavailable');
      }
    } catch (err) {
      console.error('Failed to fetch GPS data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch GPS data');
      
      // Set fallback GPS data
      setGpsData({
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: 0,
        gps_speed: 0,
        timestamp_gps: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        success: false,
        data_source: 'fallback'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchGPSData();

    // Set up interval for periodic updates
    const interval = setInterval(fetchGPSData, refreshInterval);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return {
    gpsData,
    loading,
    error,
    refetch: fetchGPSData
  };
}

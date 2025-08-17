import type { GPSCoordinates } from '@/lib/types';

/**
 * Mock GPS coordinates - in a real app, this would come from GPS hardware
 */
const MOCK_GPS_LOCATIONS: GPSCoordinates[] = [
  {
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 5.2,
    timestamp: new Date().toISOString()
  },
  {
    latitude: 40.7589,
    longitude: -73.9851,
    accuracy: 3.8,
    timestamp: new Date(Date.now() - 60000).toISOString()
  },
  {
    latitude: 40.7505,
    longitude: -73.9934,
    accuracy: 4.1,
    timestamp: new Date(Date.now() - 120000).toISOString()
  }
];

/**
 * Get current GPS coordinates
 */
export async function getCurrentGPSLocation(): Promise<GPSCoordinates> {
  // Simulate GPS reading delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // In a real app, this would interface with GPS hardware
  return {
    latitude: 40.7128 + (Math.random() - 0.5) * 0.01, // Add small random variation
    longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
    accuracy: Math.random() * 10 + 2, // 2-12 meter accuracy
    timestamp: new Date().toISOString()
  };
}

/**
 * Get GPS location history
 */
export async function getGPSHistory(count: number = 10): Promise<GPSCoordinates[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate recent GPS history
  const history: GPSCoordinates[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (i * 60000)); // Every minute
    history.push({
      latitude: 40.7128 + (Math.random() - 0.5) * 0.02,
      longitude: -74.0060 + (Math.random() - 0.5) * 0.02,
      accuracy: Math.random() * 8 + 3,
      timestamp: timestamp.toISOString()
    });
  }
  
  return history.reverse(); // Return in chronological order
}

/**
 * Format GPS coordinates for display
 */
export function formatGPSCoordinates(gps: GPSCoordinates): string {
  return `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`;
}

/**
 * Get address from GPS coordinates (mock geocoding)
 */
export async function getAddressFromGPS(gps: GPSCoordinates): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Mock address lookup - in real app, use Google Maps API or similar
  const addresses = [
    "123 Emergency Lane, New York, NY 10001",
    "456 Crash Detection St, Manhattan, NY 10002", 
    "789 Safety Boulevard, NYC, NY 10003",
    "321 Alert Avenue, New York, NY 10004"
  ];
  
  return addresses[Math.floor(Math.random() * addresses.length)];
}

/**
 * Generate placeholder for future Google Maps integration
 */
export function getMapsPlaceholder(gps: GPSCoordinates): string {
  return `Maps view for: ${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`;
}

/**
 * Calculate distance between two GPS points (in meters)
 */
export function calculateDistance(gps1: GPSCoordinates, gps2: GPSCoordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (gps1.latitude * Math.PI) / 180;
  const φ2 = (gps2.latitude * Math.PI) / 180;
  const Δφ = ((gps2.latitude - gps1.latitude) * Math.PI) / 180;
  const Δλ = ((gps2.longitude - gps1.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
           Math.cos(φ1) * Math.cos(φ2) *
           Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

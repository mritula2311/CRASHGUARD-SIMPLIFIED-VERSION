"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { generateAlert, sendEmail } from '@/app/actions';
import type { CrashData, GPSCoordinates, EmergencyContact, EmailNotification } from '@/lib/types';
import { getReinforcementModelData, type ReinforcementModelData } from '@/services/reinforcement-model';
import { getEmergencyContacts } from '@/services/emergency-contacts';
import { sendEmergencyAlert } from '@/services/notification-service';

export interface CrashContextType {
  modelData: ReinforcementModelData | null;
  setModelData: React.Dispatch<React.SetStateAction<ReinforcementModelData | null>>;
  gpsLocation: GPSCoordinates | null;
  setGpsLocation: React.Dispatch<React.SetStateAction<GPSCoordinates | null>>;
  emergencyContacts: EmergencyContact[];
  setEmergencyContacts: React.Dispatch<React.SetStateAction<EmergencyContact[]>>;
  emailNotifications: EmailNotification[];
  setEmailNotifications: React.Dispatch<React.SetStateAction<EmailNotification[]>>;
  refreshModelData: () => Promise<void>;
  refreshGPSLocation: () => Promise<void>;
  lastAlertStatus: string | null;
  isEmergencyMode: boolean;
}

const CrashContext = createContext<CrashContextType | undefined>(undefined);

export function CrashProvider({ children }: { children: ReactNode }) {
  const [modelData, setModelData] = useState<ReinforcementModelData | null>(null);
  const [gpsLocation, setGpsLocation] = useState<GPSCoordinates | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [emailNotifications, setEmailNotifications] = useState<EmailNotification[]>([]);
  const [lastAlertStatus, setLastAlertStatus] = useState<string | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  useEffect(() => {
    // Load initial data with static GPS location
    const staticGPSLocation = {
      latitude: 40.708154,
      longitude: -74.010420,
      accuracy: 8.5,
      timestamp: new Date().toISOString()
    };

    Promise.all([
      getReinforcementModelData().catch(console.error),
      getEmergencyContacts().catch(console.error)
    ]).then(([modelResult, contactsResult]) => {
      if (modelResult) setModelData(modelResult);
      if (contactsResult) setEmergencyContacts(contactsResult);
      // Set static GPS location
      setGpsLocation(staticGPSLocation);
    });
  }, []);

  useEffect(() => {
    // Monitor for emergency conditions and send alerts
    const handleEmergencyAlert = async () => {
      if (!modelData || !gpsLocation) return;
      
      // Check if model predicts emergency dispatch
      const isEmergency = modelData.prediction.action === 'EMERGENCY_DISPATCH' || 
                         modelData.riskLevel === 'CRITICAL';
      
      if (!isEmergency) {
        if (isEmergencyMode) {
          setIsEmergencyMode(false);
          setLastAlertStatus('Emergency condition resolved');
        }
        return;
      }

      // Only send alert if not already in emergency mode (prevent spam)
      if (isEmergencyMode) return;
      
      setIsEmergencyMode(true);
      
      try {
        const message = `CRITICAL VEHICLE EMERGENCY DETECTED

The AI monitoring system has detected critical conditions requiring immediate attention:

Risk Level: ${modelData.riskLevel}
AI Prediction: ${modelData.prediction.action.replace(/_/g, ' ')}
Confidence Level: ${Math.round(modelData.prediction.confidence * 100)}%

Vehicle Status:
- Active Vibration Sensors: ${modelData.vibrationStatus.totalActive} out of 6
- Acceleration Magnitude: ${modelData.accelerationMagnitude.toFixed(2)} m/s²
- Vehicle Tilt Angle: ${Math.abs(modelData.latestSensorReading.data.tilt_degrees).toFixed(1)}°

Active Sensor Positions: ${modelData.vibrationStatus.activePositions.join(', ') || 'None'}

EMERGENCY RESPONSE MAY BE REQUIRED
Please verify the safety of the vehicle and occupants immediately.

If this is a real emergency, contact emergency services (911) immediately.`;

        const notifications = await sendEmergencyAlert(message, gpsLocation, modelData);
        setEmailNotifications(prev => [...notifications, ...prev]);
        
        const sentCount = notifications.filter(n => n.status === 'sent').length;
        const failedCount = notifications.filter(n => n.status === 'failed').length;
        
        if (sentCount > 0) {
          setLastAlertStatus(`Emergency alerts sent to ${sentCount} contact${sentCount > 1 ? 's' : ''} at ${new Date().toLocaleTimeString()}`);
        } else if (failedCount > 0) {
          setLastAlertStatus(`Failed to send emergency alerts to ${failedCount} contact${failedCount > 1 ? 's' : ''}`);
        }
      } catch (error) {
        console.error('Error sending emergency alert:', error);
        setLastAlertStatus('Error sending emergency alerts');
      }
    };

    handleEmergencyAlert();
  }, [modelData, gpsLocation, isEmergencyMode]);

  const refreshModelData = async () => {
    try {
      const newModelData = await getReinforcementModelData();
      setModelData(newModelData);
    } catch (error) {
      console.error('Error fetching model data:', error);
    }
  };

  const refreshGPSLocation = async () => {
    try {
      // Return static GPS location instead of fetching
      const staticLocation = {
        latitude: 40.708154,
        longitude: -74.010420,
        accuracy: 8.5,
        timestamp: new Date().toISOString()
      };
      setGpsLocation(staticLocation);
    } catch (error) {
      console.error('Error setting GPS location:', error);
    }
  };

  return (
    <CrashContext.Provider value={{ 
      modelData, 
      setModelData, 
      gpsLocation,
      setGpsLocation,
      emergencyContacts,
      setEmergencyContacts,
      emailNotifications,
      setEmailNotifications,
      refreshModelData, 
      refreshGPSLocation,
      lastAlertStatus,
      isEmergencyMode
    }}>
      {children}
    </CrashContext.Provider>
  );
}

export function useCrash() {
  const context = useContext(CrashContext);
  if (context === undefined) {
    throw new Error('useCrash must be used within a CrashProvider');
  }
  return context;
}

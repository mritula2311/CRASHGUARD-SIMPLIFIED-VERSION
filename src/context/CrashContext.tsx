"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { generateAlert, sendEmail } from '@/app/actions';
import type { CrashData, EmergencyContact, EmailNotification } from '@/lib/types';
import { getReinforcementModelData, type ReinforcementModelData } from '@/services/reinforcement-model';
import { getEmergencyContacts } from '@/services/emergency-contacts';
import { sendEmergencyAlert } from '@/services/notification-service';

export interface CrashContextType {
  modelData: ReinforcementModelData | null;
  setModelData: React.Dispatch<React.SetStateAction<ReinforcementModelData | null>>;
  emergencyContacts: EmergencyContact[];
  setEmergencyContacts: React.Dispatch<React.SetStateAction<EmergencyContact[]>>;
  emailNotifications: EmailNotification[];
  setEmailNotifications: React.Dispatch<React.SetStateAction<EmailNotification[]>>;
  refreshModelData: () => Promise<void>;
  lastAlertStatus: string | null;
  isEmergencyMode: boolean;
}

const CrashContext = createContext<CrashContextType | undefined>(undefined);

export function CrashProvider({ children }: { children: ReactNode }) {
  const [modelData, setModelData] = useState<ReinforcementModelData | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [emailNotifications, setEmailNotifications] = useState<EmailNotification[]>([]);
  const [lastAlertStatus, setLastAlertStatus] = useState<string | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  useEffect(() => {
    // Load initial data
    Promise.all([
      getReinforcementModelData().catch(console.error),
      getEmergencyContacts().catch(console.error)
    ]).then(([modelResult, contactsResult]) => {
      if (modelResult) setModelData(modelResult);
      if (contactsResult) setEmergencyContacts(contactsResult);
    });
  }, []);

  useEffect(() => {
    // Monitor for emergency conditions and send alerts
    const handleEmergencyAlert = async () => {
      if (!modelData) return;
      
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

Sensor Data:
- Acceleration X: ${modelData.latestSensorReading?.data?.accel_x || 'N/A'}
- Acceleration Y: ${modelData.latestSensorReading?.data?.accel_y || 'N/A'} 
- Acceleration Z: ${modelData.latestSensorReading?.data?.accel_z || 'N/A'}
- Tilt: ${modelData.latestSensorReading?.data?.tilt_degrees || 'N/A'}°

This is an automated alert. Please check on the vehicle and contact emergency services if necessary.

Emergency Support: crashguard1234@gmail.com`;

        console.log('📧 Sending emergency alert automatically...');
        const notifications = await sendEmergencyAlert(message, modelData);
        
        setEmailNotifications(prev => [...prev, ...notifications]);
        setLastAlertStatus(`Emergency alert sent to ${notifications.length} contact(s)`);
        console.log('✅ Emergency alert sent successfully');
        
      } catch (error) {
        console.error('❌ Failed to send emergency alert:', error);
        setLastAlertStatus(`Failed to send emergency alert: ${error}`);
      }
    };

    // Add debounce to prevent rapid firing
    const timeout = setTimeout(handleEmergencyAlert, 2000);
    return () => clearTimeout(timeout);
  }, [modelData, isEmergencyMode]);

  const refreshModelData = async () => {
    try {
      const data = await getReinforcementModelData();
      setModelData(data);
    } catch (error) {
      console.error('Failed to refresh model data:', error);
    }
  };

  return (
    <CrashContext.Provider
      value={{
        modelData,
        setModelData,
        emergencyContacts,
        setEmergencyContacts,
        emailNotifications,
        setEmailNotifications,
        refreshModelData,
        lastAlertStatus,
        isEmergencyMode
      }}
    >
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

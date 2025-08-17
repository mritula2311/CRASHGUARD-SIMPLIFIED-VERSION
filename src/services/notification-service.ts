'use server';

import type { EmailNotification, EmergencyContact, GPSCoordinates } from '@/lib/types';
import { getEmergencyContacts, getHighPriorityContacts } from './emergency-contacts';
import { formatGPSCoordinates } from './gps-service';
import { sendCrashAlertViaPython } from './python-email-service';

// Store notifications in memory (in real app, use database)
let emailNotifications: EmailNotification[] = [];

/**
 * Send crash alert using Python email system to your personal email
 */
export async function sendEmergencyAlert(
  message: string,
  gpsLocation?: GPSCoordinates,
  sensorData?: any
): Promise<EmailNotification[]> {
  const notifications: EmailNotification[] = [];
  
  const notification: EmailNotification = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    recipient: 'mritulashankar@gmail.com',
    subject: `🚨 CRASH ALERT: Vehicle Incident Detected`,
    status: 'pending',
    type: 'emergency'
  };

  try {
    console.log('Sending crash alert via Python email system...');
    
    // Use Python email system to send crash alert
    const result = await sendCrashAlertViaPython(message, gpsLocation, sensorData);
    
    if (result.success) {
      notification.status = 'sent';
      console.log('Crash alert sent successfully:', result.message);
      console.log('Reference code:', result.reference_code);
    } else {
      notification.status = 'failed';
      console.error('Failed to send crash alert:', result.error);
    }
    
  } catch (error) {
    console.error('Error sending crash alert:', error);
    notification.status = 'failed';
  }
  
  notifications.push(notification);
  emailNotifications.push(notification);
  
  return notifications;
}

/**
 * Send alert to specific contacts (simplified to use Python email system)
 */
export async function sendAlertToContacts(
  contactIds: string[],
  subject: string,
  message: string,
  type: EmailNotification['type'] = 'alert'
): Promise<EmailNotification[]> {
  const notifications: EmailNotification[] = [];
  
  const notification: EmailNotification = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    recipient: 'mritulashankar@gmail.com',
    subject,
    status: 'pending',
    type
  };
  
  try {
    // Use Python email system for all alerts
    const result = await sendCrashAlertViaPython(message);
    notification.status = result.success ? 'sent' : 'failed';
  } catch (error) {
    console.error('Error sending alert email:', error);
    notification.status = 'failed';
  }
  
  notifications.push(notification);
  emailNotifications.push(notification);
  
  return notifications;
}

/**
 * Get all email notifications
 */
export async function getEmailNotifications(): Promise<EmailNotification[]> {
  return [...emailNotifications].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get recent email notifications
 */
export async function getRecentEmailNotifications(count: number = 10): Promise<EmailNotification[]> {
  const notifications = await getEmailNotifications();
  return notifications.slice(0, count);
}

/**
 * Clear all notifications
 */
export async function clearEmailNotifications(): Promise<void> {
  emailNotifications = [];
}

/**
 * Get notification stats
 */
export async function getNotificationStats(): Promise<{
  total: number;
  sent: number;
  failed: number;
  pending: number;
}> {
  const notifications = await getEmailNotifications();
  
  return {
    total: notifications.length,
    sent: notifications.filter(n => n.status === 'sent').length,
    failed: notifications.filter(n => n.status === 'failed').length,
    pending: notifications.filter(n => n.status === 'pending').length
  };
}

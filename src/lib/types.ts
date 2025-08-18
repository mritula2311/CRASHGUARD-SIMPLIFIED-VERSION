export interface Contact {
  name: string;
  phone?: string;
  email?: string;
  relation: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relation: 'Family' | 'Friend' | 'Emergency' | 'Medical' | 'Other';
  priority: 1 | 2 | 3; // 1 = highest priority
}

export interface CrashData {
  location: string;
  severity: 'Low' | 'Medium' | 'High';
  speed: number;
}

export interface EmailNotification {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  type: 'emergency' | 'alert' | 'notification';
}

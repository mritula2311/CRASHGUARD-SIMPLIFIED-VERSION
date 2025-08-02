export interface Contact {
  name: string;
  phone?: string;
  email?: string;
  relation: string;
}

export interface CrashData {
  location: string;
  severity: 'Low' | 'Medium' | 'High';
  speed: number;
}

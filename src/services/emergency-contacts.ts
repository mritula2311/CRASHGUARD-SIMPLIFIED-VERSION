'use server';

import type { EmergencyContact } from '@/lib/types';

// Your personal contact for crash notifications
const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: '1',
    name: 'Mritula Shankar',
    phone: '+1-555-0123',
    email: 'mritulashankar@gmail.com',
    relation: 'Emergency',
    priority: 1
  },
  {
    id: '2',
    name: 'Varsha Venkatesan',
    phone: '+1-555-0124',
    email: 'varshavenkatesan26@gmail.com',
    relation: 'Family',
    priority: 1
  }
];

/**
 * Get all emergency contacts sorted by priority
 */
export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return EMERGENCY_CONTACTS.sort((a, b) => a.priority - b.priority);
}

/**
 * Get high priority emergency contacts (priority 1)
 */
export async function getHighPriorityContacts(): Promise<EmergencyContact[]> {
  const contacts = await getEmergencyContacts();
  return contacts.filter(contact => contact.priority === 1);
}

/**
 * Get contacts by relation type
 */
export async function getContactsByRelation(relation: EmergencyContact['relation']): Promise<EmergencyContact[]> {
  const contacts = await getEmergencyContacts();
  return contacts.filter(contact => contact.relation === relation);
}

/**
 * Add a new emergency contact
 */
export async function addEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact> {
  const newContact: EmergencyContact = {
    ...contact,
    id: Date.now().toString()
  };
  
  EMERGENCY_CONTACTS.push(newContact);
  return newContact;
}

/**
 * Update an emergency contact
 */
export async function updateEmergencyContact(id: string, updates: Partial<EmergencyContact>): Promise<EmergencyContact | null> {
  const index = EMERGENCY_CONTACTS.findIndex(contact => contact.id === id);
  if (index === -1) return null;
  
  EMERGENCY_CONTACTS[index] = { ...EMERGENCY_CONTACTS[index], ...updates };
  return EMERGENCY_CONTACTS[index];
}

/**
 * Remove an emergency contact
 */
export async function removeEmergencyContact(id: string): Promise<boolean> {
  const index = EMERGENCY_CONTACTS.findIndex(contact => contact.id === id);
  if (index === -1) return false;
  
  EMERGENCY_CONTACTS.splice(index, 1);
  return true;
}

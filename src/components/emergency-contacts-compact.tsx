"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Phone, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { getEmergencyContacts } from "@/services/emergency-contacts";
import type { EmergencyContact } from "@/lib/types";

export function EmergencyContactSmall() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const contactList = await getEmergencyContacts();
        // Get all priority 1 contacts
        setContacts(contactList.filter(c => c.priority === 1));
      } catch (err) {
        console.error('Failed to load contacts:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchContacts();
  }, []);

  if (loading) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-blue-500" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="animate-pulse">
            <div className="w-20 h-3 bg-muted rounded mb-1"></div>
            <div className="w-24 h-2 bg-muted rounded mb-1"></div>
            <div className="w-28 h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-blue-500" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-xs text-muted-foreground">No contacts configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-blue-500" />
          Emergency Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="text-center p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 mx-auto mb-1">
                <Users className="h-3 w-3 text-white" />
              </div>
              <p className="text-sm font-semibold text-red-900 dark:text-red-100">{contact.name}</p>
              <p className="text-xs text-red-700 dark:text-red-300 mb-1">{contact.relation} Contact</p>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1 p-1 bg-white dark:bg-red-900 rounded text-xs">
                  <Phone className="h-3 w-3 text-red-600" />
                  <span className="font-mono text-red-800 dark:text-red-200">{contact.phone}</span>
                </div>
                
                {contact.email && (
                  <div className="flex items-center justify-center gap-1 p-1 bg-white dark:bg-red-900 rounded text-xs">
                    <Mail className="h-3 w-3 text-red-600" />
                    <span className="text-red-800 dark:text-red-200 truncate">{contact.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

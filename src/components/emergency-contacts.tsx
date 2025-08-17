"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Phone, Mail, Shield, Plus, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { getEmergencyContacts } from "@/services/emergency-contacts";
import type { EmergencyContact } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";

interface EmergencyContactsProps {
  onContactsLoaded?: (contacts: EmergencyContact[]) => void;
}

export function EmergencyContacts({ onContactsLoaded }: EmergencyContactsProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContacts() {
      try {
        setLoading(true);
        const contactList = await getEmergencyContacts();
        setContacts(contactList);
        onContactsLoaded?.(contactList);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contacts');
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, []);

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'destructive';
      case 2: return 'default';
      case 3: return 'secondary';
      default: return 'outline';
    }
  };

  const getRelationIcon = (relation: string) => {
    switch (relation) {
      case 'Emergency': return <AlertTriangle className="h-3 w-3" />;
      case 'Medical': return <Shield className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Users className="h-5 w-5" />
            Contacts Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const highPriorityContacts = contacts.filter(c => c.priority === 1);
  const otherContacts = contacts.filter(c => c.priority > 1);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Emergency Contacts
          <Badge variant="outline" className="ml-auto">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* High Priority Contacts */}
        {highPriorityContacts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">High Priority</span>
            </div>
            <div className="space-y-2">
              {highPriorityContacts.map((contact) => (
                <div key={contact.id} className="p-3 border-2 border-red-200 rounded-lg bg-red-50 dark:border-red-800 dark:bg-red-950/50">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex-shrink-0">
                      {getRelationIcon(contact.relation)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-100">{contact.name}</p>
                        <Badge variant="destructive" className="text-xs">
                          {contact.relation}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                          <span className="font-mono text-xs text-red-700 dark:text-red-300">{contact.phone}</span>
                        </div>
                        
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <span className="text-xs text-red-700 dark:text-red-300 truncate">{contact.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Contacts */}
        {otherContacts.length > 0 && (
          <div className="space-y-3">
            {highPriorityContacts.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Other Contacts</span>
              </div>
            )}
            <div className="space-y-2">
              {otherContacts.map((contact) => (
                <div key={contact.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted flex-shrink-0">
                      {getRelationIcon(contact.relation)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{contact.name}</p>
                        <Badge variant="outline" className="text-xs">
                          P{contact.priority}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="font-mono text-xs text-muted-foreground">{contact.phone}</span>
                        </div>
                        
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{contact.email}</span>
                          </div>
                        )}
                      </div>
                      
                      <Badge variant={getPriorityColor(contact.priority)} className="text-xs">
                        {contact.relation}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Contacts Message */}
        {contacts.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No emergency contacts configured</p>
          </div>
        )}

        {/* Add Contact Button */}
        <div className="pt-2 border-t">
          <Button variant="outline" className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Emergency Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

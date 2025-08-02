"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Phone, Loader2, Send, Bot } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { GenerateEmergencyAlertMessageOutput } from '@/ai/flows/generate-emergency-alert';
import { generateAlert } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from './ui/toaster';

const initialContacts = [
    { name: 'Jane Doe', phone: '555-0101', relation: 'Spouse' },
    { name: 'John Smith', phone: '555-0102', relation: 'Father' },
    { name: 'Emergency Services', phone: '911', relation: 'Official' },
];

const MOCK_CRASH_DATA = {
  location: "123 Collision Course, Metro City, 12345",
  severity: "High",
  speed: 120,
};

export function ActionsPanel() {
    const [contacts] = useState(initialContacts);
    const [alertResult, setAlertResult] = useState<GenerateEmergencyAlertMessageOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGenerateAlert = async () => {
        setIsLoading(true);
        setAlertResult(null);
        try {
            const result = await generateAlert({
                ...MOCK_CRASH_DATA,
                contacts: contacts.map(c => c.name),
            });
            setAlertResult(result);
            toast({
                title: "Alert Generated",
                description: "AI has created an emergency message and suggested recipients.",
            });
        } catch (error) {
            console.error("Failed to generate alert:", error);
            toast({
                variant: 'destructive',
                title: "Generation Failed",
                description: "Could not generate the AI alert. Please try again.",
            });
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-8">
            <Toaster />
            <Card className="shadow-lg transition-shadow hover:shadow-xl">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-3">
                        <Bot className="w-6 h-6 text-primary" />
                        Smart Alert
                    </CardTitle>
                    <CardDescription>
                        Generate an AI-powered emergency alert based on the crash data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Button onClick={handleGenerateAlert} disabled={isLoading} className="w-full h-12 text-md font-semibold">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-5 w-5" />
                                    Generate Emergency Alert
                                </>
                            )}
                        </Button>
                        {alertResult && (
                            <div className="border-t pt-4 mt-6 space-y-4 animate-in fade-in duration-500">
                                <h4 className="font-semibold font-headline">Generated Message:</h4>
                                <blockquote className="text-sm bg-secondary p-4 rounded-lg border-l-4 border-accent">
                                    {alertResult.message}
                                </blockquote>
                                
                                <h4 className="font-semibold font-headline">Suggested Recipients:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {alertResult.recipients.map((recipient, index) => (
                                        <Badge key={index} variant="default" className="bg-primary/80">
                                            {recipient}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg transition-shadow hover:shadow-xl">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-3">
                        <Users className="w-6 h-6 text-primary" />
                        Emergency Contacts
                    </CardTitle>
                    <CardDescription>
                        These contacts will be considered for alerts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {contacts.map((contact, index) => (
                            <li key={index} className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage data-ai-hint="person" src={`https://placehold.co/40x40.png`} />
                                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold">{contact.name}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Phone className="w-3 h-3" />
                                        {contact.phone}
                                    </p>
                                </div>
                                <Badge variant="outline">{contact.relation}</Badge>
                            </li>
                        ))}
                    </ul>
                    <Separator className="my-6" />
                    <Button variant="outline" className="w-full">Add New Contact</Button>
                </CardContent>
            </Card>
        </div>
    );
}

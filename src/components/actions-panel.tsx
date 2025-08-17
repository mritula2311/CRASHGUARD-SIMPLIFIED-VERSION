"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Mail, Loader2, Send, Bot, RefreshCw } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import type { GenerateEmergencyAlertMessageOutput } from '@/ai/flows/generate-emergency-alert';
import { generateAlert, sendEmail } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from './ui/toaster';
import { useCrash } from '@/context/CrashContext';
import type { Contact } from '@/lib/types';


const initialContacts: Contact[] = [
    { name: 'Mritula Shankar', email: 'mritulashankar@gmail.com', relation: 'Owner' },
]; // Only user's email remains

export function ActionsPanel() {
    const { crashData, simulateNewCrash } = useCrash();
    const contacts = initialContacts;
    const [alertResult, setAlertResult] = useState<GenerateEmergencyAlertMessageOutput | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const { toast } = useToast();

    const handleGenerateAlert = async () => {
        if (!crashData) return;
        setIsGenerating(true);
        setAlertResult(null);
        try {
            // Create a professional alert message without emoticons
            const alertMessage = `CRITICAL VEHICLE CRASH DETECTED

Emergency crash detected by CrashGuard monitoring system.

Crash Details:
- Location: ${crashData.location}
- Severity: ${crashData.severity}
- Speed: ${crashData.speed} km/h
- Time: ${new Date().toLocaleString()}

EMERGENCY RESPONSE REQUIRED

Please verify the safety of the vehicle and occupants immediately.
Contact emergency services if medical assistance is needed.

This is an automated alert from your crash detection system.`;

            // Set the alert result for display
            setAlertResult({ message: alertMessage, recipients: contacts.map(c => c.email || '').filter(Boolean) });
            
            toast({
                title: "Alert Generated",
                description: "Emergency alert created successfully.",
            });

            const body = `CRITICAL VEHICLE CRASH DETECTED

Severity: ${crashData.severity}
Speed at Impact: ${crashData.speed} km/h
Impact Force: High
Vehicle Location: ${crashData.location}

EMERGENCY RESPONSE REQUIRED

Immediate attention and emergency services dispatch may be required.`;

            const subject = `URGENT: ${crashData.severity} Crash Detected - ${crashData.location}`;

            for (const contact of contacts) {
                if (!contact.email) continue; // Skip contacts without email
                try {
                    await sendEmail({
                        to: contact.email,
                        subject,
                        body,
                    }, crashData); // Pass crash data context
                    toast({
                        title: "Email Sent",
                        description: `Emergency alert sent to ${contact.email}.`,
                    });
                } catch (emailError) {
                    console.error(`Failed to send email to ${contact.email}:`, emailError);
                    toast({
                        variant: 'destructive',
                        title: "Email Sending Failed",
                        description: `Could not send alert to ${contact.email}.`,
                    });
                }
            }
        } catch (error) {
            console.error("Failed to generate alert:", error);
            toast({
                variant: 'destructive',
                title: "Generation Failed",
                description: "Could not generate the alert. Please try again.",
            });
        }
        setIsGenerating(false);
    };
    
    const handleSimulateNewCrash = async () => {
        setIsSimulating(true);
        setAlertResult(null);
        await simulateNewCrash();
        toast({
            title: "New Crash Simulated",
            description: "The crash data has been updated.",
        });
        setIsSimulating(false);
    };

    const isButtonDisabled = isGenerating || isSimulating || !crashData;

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
                        Generate an AI-powered emergency alert or simulate a new crash event.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button onClick={handleGenerateAlert} disabled={isButtonDisabled} className="h-12 text-md font-semibold">
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-5 w-5" />
                                        Generate Alert
                                    </>
                                )}
                            </Button>
                            <Button onClick={handleSimulateNewCrash} disabled={isButtonDisabled} variant="outline" className="h-12 text-md font-semibold">
                                {isSimulating ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Simulating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-5 w-5" />
                                        New Crash
                                    </>
                                )}
                            </Button>
                        </div>
                        {alertResult && (
                            <div className="border-t pt-4 mt-6 space-y-4 animate-in fade-in duration-500">
                                <h4 className="font-semibold font-headline">Generated Message:</h4>
                                <blockquote className="text-sm bg-secondary p-4 rounded-lg border-l-4 border-accent">
                                    {alertResult.message}
                                </blockquote>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg transition-shadow hover:shadow-xl">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-3">
                        <Users className="w-6 h-6 text-primary" />
                        Emergency Contact
                    </CardTitle>
                    <CardDescription>
                        Only your email will receive crash alerts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {contacts.map((contact) => (
                            <div key={contact.email} className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage alt={contact.name} src="https://placehold.co/40x40.png" />
                                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold">{contact.name}</p>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <span className="flex items-center gap-1.5">
                                            <Mail className="w-3 h-3" />
                                            {contact.email}
                                        </span>
                                    </div>
                                </div>
                                <Badge variant="secondary">{contact.relation}</Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

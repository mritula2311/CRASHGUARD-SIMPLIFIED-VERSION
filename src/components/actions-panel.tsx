"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Phone, Mail, Loader2, Send, Bot, RefreshCw } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { GenerateEmergencyAlertMessageOutput } from '@/ai/flows/generate-emergency-alert';
import { generateAlert, sendEmail } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from './ui/toaster';
import { useCrash } from '@/context/CrashContext';
import type { Contact } from '@/lib/types';


const initialContacts: Contact[] = [
    { name: 'Jane Doe', phone: '555-0101', email: 'jane.doe@email.com', relation: 'Spouse' },
    { name: 'John Smith', phone: '555-0102', email: 'john.smith@email.com', relation: 'Father' },
    { name: 'Emergency Services', phone: '911', relation: 'Official' },
    { name: 'Crash Guard IEEE', email: 'crashguardieee@gmail.com', relation: 'Test Contact' },
];

export function ActionsPanel() {
    const { crashData, simulateNewCrash } = useCrash();
    const [contacts] = useState<Contact[]>(initialContacts);
    const [alertResult, setAlertResult] = useState<GenerateEmergencyAlertMessageOutput | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const { toast } = useToast();

    const handleGenerateAlert = async () => {
        if (!crashData) return;
        setIsGenerating(true);
        setAlertResult(null);
        try {
            const result = await generateAlert({
                ...crashData,
                contacts: contacts,
            });
            setAlertResult(result);
            toast({
                title: "Alert Generated",
                description: "AI has created an emergency message and suggested recipients.",
            });

            // Send email after generating alert
            // Always send email report to mritulashankar@gmail.com
            try {
                await sendEmail({
                    to: 'mritulashankar@gmail.com',
                    subject: `Emergency Alert: ${crashData.severity} Severity Crash Detected`,
                    body: result.message,
                });
                toast({
                    title: "Email Sent",
                    description: "Emergency alert sent to mritulashankar@gmail.com.",
                });
            } catch (emailError) {
                console.error("Failed to send email:", emailError);
                toast({
                    variant: 'destructive',
                    title: "Email Failed",
                    description: "Could not send email alert, but message was generated.",
                });
            }

            // Also send to existing test contact if included in recipients
            if (result.recipients.includes('Crash Guard IEEE')) {
                try {
                    await sendEmail({
                        to: 'crashguardieee@gmail.com',
                        subject: `Emergency Alert: ${crashData.severity} Severity Crash Detected`,
                        body: result.message,
                    });
                } catch (emailError) {
                    console.error("Failed to send email to test contact:", emailError);
                }
            }

        } catch (error) {
            console.error("Failed to generate alert:", error);
            toast({
                variant: 'destructive',
                title: "Generation Failed",
                description: "Could not generate the AI alert. Please try again.",
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
                                    <div className="text-sm text-muted-foreground space-y-1">
                                      {contact.phone && (
                                        <p className="flex items-center gap-1.5">
                                          <Phone className="w-3 h-3" />
                                          {contact.phone}
                                        </p>
                                      )}
                                      {contact.email && (
                                         <p className="flex items-center gap-1.5">
                                           <Mail className="w-3 h-3" />
                                           {contact.email}
                                         </p>
                                      )}
                                    </div>
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

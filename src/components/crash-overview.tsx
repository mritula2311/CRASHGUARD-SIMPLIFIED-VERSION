import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, AlertTriangle, Gauge } from "lucide-react";
import Image from 'next/image';

export function CrashOverview() {
    return (
        <div className="space-y-8">
            <Card className="overflow-hidden shadow-lg transition-shadow hover:shadow-xl">
                <CardHeader className="flex flex-row items-start gap-4 p-6">
                    <MapPin className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <CardTitle className="font-headline text-2xl">Location</CardTitle>
                        <CardDescription>Last known coordinates of the incident.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <p className="font-semibold text-lg mb-4">123 Collision Course, Metro City, 12345</p>
                    <div className="rounded-lg overflow-hidden border">
                        <Image
                            src="https://placehold.co/800x400.png"
                            alt="Map of crash location"
                            width={800}
                            height={400}
                            className="w-full h-auto"
                            data-ai-hint="map road"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="shadow-lg transition-shadow hover:shadow-xl">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-destructive" />
                            Severity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center pt-4 pb-8">
                        <div className="relative">
                            <AlertTriangle className="w-24 h-24 text-accent animate-pulse-accent" />
                        </div>
                        <p className="text-5xl font-bold font-headline text-accent mt-4">HIGH</p>
                        <p className="text-muted-foreground mt-2">Based on vibration sensor data.</p>
                    </CardContent>
                </Card>
                <Card className="shadow-lg transition-shadow hover:shadow-xl">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl flex items-center gap-3">
                            <Gauge className="w-6 h-6 text-primary" />
                            Impact Speed
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center text-center pt-4 pb-8">
                        <div className="relative flex items-end">
                            <p className="text-7xl font-bold font-headline text-primary">120</p>
                            <p className="text-2xl font-semibold text-muted-foreground mb-2 ml-1">km/h</p>
                        </div>
                         <p className="text-muted-foreground mt-2">Based on accelerometer data.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

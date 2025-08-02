"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, AlertTriangle, Gauge, Loader2 } from "lucide-react";
import Image from 'next/image';
import { useCrash } from '@/context/CrashContext';
import { Skeleton } from "./ui/skeleton";

export function CrashOverview() {
    const { crashData } = useCrash();

    if (!crashData) {
        return (
            <div className="space-y-8">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">
                            <Skeleton className="h-8 w-1/2" />
                        </CardTitle>
                        <CardDescription>
                            <Skeleton className="h-4 w-3/4" />
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-10 w-full mb-4" />
                        <Skeleton className="w-full h-[400px] rounded-lg" />
                    </CardContent>
                </Card>
                <div className="grid md:grid-cols-2 gap-8">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl flex items-center gap-3">
                                 <Skeleton className="h-8 w-1/2" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center text-center pt-4 pb-8">
                            <Skeleton className="w-24 h-24 rounded-full" />
                            <Skeleton className="h-12 w-3/4 mt-4" />
                            <Skeleton className="h-4 w-1/2 mt-2" />
                        </CardContent>
                    </Card>
                    <Card className="shadow-lg">
                        <CardHeader>
                             <CardTitle className="font-headline text-2xl flex items-center gap-3">
                                 <Skeleton className="h-8 w-1/2" />
                            </CardTitle>
                        </CardHeader>
                         <CardContent className="flex flex-col items-center justify-center text-center pt-4 pb-8">
                            <Skeleton className="h-20 w-3/4" />
                            <Skeleton className="h-4 w-1/2 mt-2" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

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
                    <p className="font-semibold text-lg mb-4">{crashData.location}</p>
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
                        <p className="text-5xl font-bold font-headline text-accent mt-4">{crashData.severity.toUpperCase()}</p>
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
                            <p className="text-7xl font-bold font-headline text-primary">{crashData.speed}</p>
                            <p className="text-2xl font-semibold text-muted-foreground mb-2 ml-1">km/h</p>
                        </div>
                         <p className="text-muted-foreground mt-2">Based on accelerometer data.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

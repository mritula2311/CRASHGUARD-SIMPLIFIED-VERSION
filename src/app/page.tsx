import { ReinforcementModelPanel } from '@/components/reinforcement-model-panel';
import { EmergencyContactSmall } from '@/components/emergency-contacts-compact';
import { EmailNotifications } from '@/components/email-notifications';
import { ThingSpeakSensorData } from '@/components/thingspeak-sensor-data';
import { Shield, Brain, Activity, Users, Mail, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { testPythonEmail } from './actions';

async function handleTestCrashAlert(formData: FormData) {
  'use server';
  
  console.log('Testing crash alert system...');
  
  try {
    const result = await testPythonEmail();
    
    if (result.success) {
      console.log('✅ Test crash alert sent successfully!');
      console.log('📧 Check your email: mritulashankar@gmail.com');
    } else {
      console.log('❌ Test failed:', result.error);
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold font-headline text-primary">
              CRASH GUARD
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Activity className="h-4 w-4 text-green-500 animate-pulse" />
              Live Monitoring Active
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 sm:p-6 max-w-7xl">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold font-headline flex items-center justify-center gap-3">
              <Brain className="h-8 w-8 text-primary" />
              AI-Powered Vehicle Safety Dashboard
            </h2>
            <p className="text-muted-foreground">
              Real-time crash detection with intelligent emergency response system
            </p>
          </div>

          {/* Emergency Alert Banner */}
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>Crash Detection Ready:</strong> System is monitoring vehicle sensors and will automatically send crash alerts to your email if critical conditions are detected.
            </AlertDescription>
          </Alert>

          {/* Top Priority Row: AI Model and Emergency Contacts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Model Panel */}
            <div className="lg:col-span-1">
              <ReinforcementModelPanel />
            </div>

            {/* Emergency Contact and System Status */}
            <div className="lg:col-span-1 space-y-4">
              <EmergencyContactSmall />
              <Card className="h-fit">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-green-500" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded dark:bg-green-950">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-medium">AI Model</span>
                      </div>
                      <span className="text-xs text-green-700 dark:text-green-300 font-medium">ACTIVE</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded dark:bg-green-950">
                      <div className="flex items-center gap-1">
                        <Brain className="h-3 w-3 text-green-500" />
                        <span className="text-xs font-medium">Sensors</span>
                      </div>
                      <span className="text-xs text-green-700 dark:text-green-300 font-medium">ACTIVE</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded dark:bg-green-950">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-green-500" />
                        <span className="text-xs font-medium">Email</span>
                      </div>
                      <span className="text-xs text-green-700 dark:text-green-300 font-medium">READY</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded dark:bg-green-950">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-green-500" />
                        <span className="text-xs font-medium">Contact</span>
                      </div>
                      <span className="text-xs text-green-700 dark:text-green-300 font-medium">READY</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Live Sensor Data from ThingSpeak */}
          <ThingSpeakSensorData />
        </div>
      </main>

      <footer className="py-6 md:px-8 md:py-0 bg-background/95 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row max-w-7xl mx-auto">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built with intelligence. Ride with confidence. Emergency response ready 24/7.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            System Online
          </div>
        </div>
      </footer>
    </div>
  );
}

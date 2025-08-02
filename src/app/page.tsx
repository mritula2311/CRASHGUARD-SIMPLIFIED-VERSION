import { ActionsPanel } from '@/components/actions-panel';
import { CrashOverview } from '@/components/crash-overview';
import { Shield } from 'lucide-react';
import { CrashProvider } from '@/context/CrashContext';

export default function Home() {
  return (
    <CrashProvider>
      <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
        <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center px-4 sm:px-8">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold font-headline text-primary">
                CRASH GUARD
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto p-4 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">
              <CrashOverview />
            </div>
            <div className="mt-8 lg:mt-0">
              <ActionsPanel />
            </div>
          </div>
        </main>

        <footer className="py-6 md:px-8 md:py-0 bg-background/95">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
            <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
              Built with intelligence. Ride with confidence.
            </p>
          </div>
        </footer>
      </div>
    </CrashProvider>
  );
}

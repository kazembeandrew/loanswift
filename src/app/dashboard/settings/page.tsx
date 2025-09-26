import { Header } from '@/components/header';

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Settings" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h1 className="font-headline text-lg font-semibold md:text-2xl">
            Application Settings
          </h1>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="font-headline text-2xl font-bold tracking-tight">
              Settings will be available here
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage your preferences and application settings.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

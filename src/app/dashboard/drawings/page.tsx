'use client';

import { Header } from '@/components/header';

export default function DrawingsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Drawings" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="font-headline text-2xl font-bold tracking-tight">
              Manage Owner Drawings
            </h3>
            <p className="text-sm text-muted-foreground">
              This section is under construction. Soon you'll be able to record owner withdrawals from the business.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

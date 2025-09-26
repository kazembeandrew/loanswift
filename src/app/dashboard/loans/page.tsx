import { Header } from '@/components/header';

export default function LoansPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Loans" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h1 className="font-headline text-lg font-semibold md:text-2xl">
            Loan Management
          </h1>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="font-headline text-2xl font-bold tracking-tight">
              Loan data will be displayed here
            </h3>
            <p className="text-sm text-muted-foreground">
              You can manage all loans from this page.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

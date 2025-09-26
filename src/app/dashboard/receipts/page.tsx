import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const ExportButton = () => {
  const { toast } = useToast();
  return (
      <Button onClick={() => toast({ title: 'Coming Soon!', description: 'Excel export will be available soon.'})}>
      <Download className="mr-2 h-4 w-4" />
      Export to Excel
    </Button>
  )
}

export default function ReceiptsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Receipts" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h1 className="font-headline text-lg font-semibold md:text-2xl">
            Receipts Register
          </h1>
          <div className="ml-auto">
            <ExportButton />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="font-headline text-2xl font-bold tracking-tight">
              A register of all receipts will be shown here
            </h3>
            <p className="text-sm text-muted-foreground">
              You can view and export all payment receipts.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

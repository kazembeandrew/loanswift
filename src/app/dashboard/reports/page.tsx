'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleSummarizeArrears } from '@/app/actions/summarize';
import IncomeStatement from './components/income-statement';
import BalanceSheet from './components/balance-sheet';
import { useAuth } from '@/context/auth-context';

export default function ReportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const showFinancialReports = userProfile?.role === 'admin' || userProfile?.role === 'ceo' || userProfile?.role === 'cfo';


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select an Excel file to generate a summary.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUri = e.target?.result as string;
        if (dataUri) {
          const result = await handleSummarizeArrears(dataUri);
          setSummary(result.summary);
          toast({
            title: 'Summary Generated',
            description: 'The arrears summary has been successfully generated.',
          });
        }
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error Generating Summary',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Reports" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <div className="grid gap-6 lg:grid-cols-2">
            {showFinancialReports && (
              <>
                <IncomeStatement />
                <BalanceSheet />
              </>
            )}

            <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Arrears Summarization</CardTitle>
                <CardDescription>
                Upload your loan portfolio report (Excel file) to automatically generate an arrears and portfolio summary.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-4">
                    <Input id="excel-file" type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
                    <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <UploadCloud className="mr-2 h-4 w-4" />
                    )}
                    Generate Summary
                    </Button>
                </div>
                </form>

                {isLoading && (
                <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed p-10">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Analyzing data and generating summary...</p>
                </div>
                )}

                {summary && (
                <Card className="mt-6">
                    <CardHeader>
                    <CardTitle>Generated Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <pre className="whitespace-pre-wrap font-body text-sm">{summary}</pre>
                    </CardContent>
                </Card>
                )}
            </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center">
         <CardHeader>
            <div className="flex justify-center">
                <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="mt-4">Something went wrong!</CardTitle>
            <CardDescription>
                An unexpected error has occurred. You can try to reload the page or go back.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4">
            <pre className="mt-2 w-full whitespace-pre-wrap rounded-md bg-muted p-4 text-left text-sm font-mono text-muted-foreground">
                {error.message || 'No error message available.'}
            </pre>
          <Button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

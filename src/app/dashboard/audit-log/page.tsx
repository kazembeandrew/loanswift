'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { getAuditLogs } from '@/services/audit-log-service';
import type { AuditLog } from '@/types';
import { Loader2, ShieldAlert, History } from 'lucide-react';
import { format } from 'date-fns';
import { useDB } from '@/lib/firebase-provider';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { userProfile } = useAuth();
  const db = useDB();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const logsData = await getAuditLogs(db);
        setLogs(logsData);
    } catch(error) {
        console.error("Failed to fetch audit logs:", error);
    } finally {
        setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchData();
    } else {
        setIsLoading(false);
    }
  }, [fetchData, userProfile]);

  if (isLoading) {
    return (
      <>
        <Header title="Audit Log" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
      </>
    );
  }

  if (userProfile?.role !== 'admin') {
    return (
        <>
            <Header title="Audit Log" />
            <main className="flex flex-1 items-center justify-center p-4 md:p-8">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                       <div className="flex justify-center">
                         <ShieldAlert className="h-12 w-12 text-destructive" />
                       </div>
                        <CardTitle className="mt-4">Access Denied</CardTitle>
                        <CardDescription>
                            You do not have permission to view this page. This feature is for administrators only.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </main>
        </>
    );
  }

  return (
    <>
      <Header title="Audit Log" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>System Audit Trail</CardTitle>
            <CardDescription>
              A record of all critical actions performed within the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {logs.length > 0 ? (
                <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.timestamp), 'PPpp')}</TableCell>
                        <TableCell>{log.userEmail}</TableCell>
                        <TableCell><Badge variant="secondary">{log.action}</Badge></TableCell>
                        <TableCell><pre className="text-xs font-mono bg-muted p-2 rounded-md">{JSON.stringify(log.details, null, 2)}</pre></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
            ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-10">
                    <div className="flex flex-col items-center gap-1 text-center">
                        <History className="h-12 w-12 text-muted-foreground" />
                        <h3 className="font-headline text-2xl font-bold tracking-tight mt-4">No Audit Logs Found</h3>
                        <p className="text-sm text-muted-foreground">System actions will be recorded here as they happen.</p>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}


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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getAllUsers } from '@/services/user-service';
import type { UserProfile } from '@/types';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getBorrowerAvatar } from '@/lib/placeholder-images';

export default function StaffPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error fetching users',
        description: 'Could not load the list of users.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const getRoleVariant = (role: 'admin' | 'staff') => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'staff':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  if (!userProfile || userProfile.role !== 'admin') {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <Header title="Staff Management" />
            <main className="flex flex-1 items-center justify-center p-4 md:p-8">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                       <div className="flex justify-center">
                         <ShieldAlert className="h-12 w-12 text-destructive" />
                       </div>
                        <CardTitle className="mt-4">Access Denied</CardTitle>
                        <CardDescription>
                            You do not have permission to view this page. Please contact an administrator.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </main>
        </div>
    );
  }


  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Staff Management" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>User Accounts</CardTitle>
            <CardDescription>
              A list of all users with access to the system. Roles can be managed in the Firebase Console.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.uid}>
                        <TableCell>
                           <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={getBorrowerAvatar(user.uid)} alt="Avatar" data-ai-hint="user avatar" />
                                    <AvatarFallback>{user.email.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.email.split('@')[0]}</span>
                            </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleVariant(user.role)} className="capitalize">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{user.uid}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

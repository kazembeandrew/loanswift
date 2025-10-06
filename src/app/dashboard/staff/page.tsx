'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Header } from '@/components/header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getAllUsers } from '@/services/user-service';
import { handleCreateUser, handleUpdateUserRole } from '@/app/actions/user';
import { promoteUserToAdmin } from '@/app/actions/promote';
import type { UserProfile } from '@/types';
import { Loader2, ShieldAlert, PlusCircle, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getBorrowerAvatar } from '@/lib/placeholder-images';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDB } from '@/lib/firebase-provider';


export default function StaffPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, startUpdatingTransition] = useTransition();
  const [isCreating, startCreatingTransition] = useTransition();
  const [isPromoting, startPromotingTransition] = useTransition();
  const [isAddUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'loan_officer' as UserProfile['role'] });
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const db = useDB();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllUsers(db);
      setUsers(data);
    } catch (error) {
      toast({
        title: 'Error fetching users',
        description: 'Could not load the list of users.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, db]);

  useEffect(() => {
    if (userProfile?.role === 'admin' || userProfile?.role === 'hr') {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [fetchData, userProfile]);
  
  const onRoleChange = (uid: string, newRole: UserProfile['role']) => {
    startUpdatingTransition(async () => {
      try {
        await handleUpdateUserRole(uid, newRole);
        toast({
          title: 'Role Updated',
          description: `The user's role has been successfully changed to ${newRole}.`,
        });
        await fetchData();
      } catch (error) {
        toast({
          title: 'Error updating role',
          description: 'Could not update the user role. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) {
        toast({ title: "Missing fields", description: "Please enter email and password.", variant: "destructive"});
        return;
    }
    startCreatingTransition(async () => {
        const result = await handleCreateUser(newUser.email, newUser.password, newUser.role);
        if (result.success) {
            toast({ title: "User Created", description: "The new user has been successfully created."});
            setAddUserOpen(false);
            setNewUser({email: '', password: '', role: 'loan_officer'});
            await fetchData();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive"});
        }
    });
  };

  const handlePromoteUser = (email: string) => {
    startPromotingTransition(async () => {
        const result = await promoteUserToAdmin(email);
        if (result.status === 'success') {
            toast({ title: 'Promotion Successful', description: result.message });
            await fetchData();
        } else {
            toast({ title: 'Promotion Failed', description: result.message, variant: 'destructive' });
        }
    });
  };


  if (isLoading) {
    return (
        <>
            <Header title="User Management" />
            <main className="flex flex-1 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </main>
        </>
    );
  }

  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'hr')) {
    return (
        <>
            <Header title="User Management" />
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
        </>
    );
  }


  return (
    <>
      <Header title="User Management" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
                <CardTitle>User Accounts</CardTitle>
                <CardDescription>
                Manage user roles and add new staff members.
                </CardDescription>
            </div>
             <Dialog open={isAddUserOpen} onOpenChange={setAddUserOpen}>
                <DialogTrigger asChild>
                     <Button className="ml-auto gap-1">
                        <PlusCircle className="h-4 w-4" />
                        Add User
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                            Create a new user account and assign them a role.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUserSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input id="email" type="email" className="col-span-3" value={newUser.email} onChange={(e) => setNewUser(u => ({ ...u, email: e.target.value }))} disabled={isCreating} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="password" className="text-right">Password</Label>
                                <Input id="password" type="password" className="col-span-3" value={newUser.password} onChange={(e) => setNewUser(u => ({ ...u, password: e.target.value }))} disabled={isCreating} />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">Role</Label>
                                <Select value={newUser.role} onValueChange={(value: UserProfile['role']) => setNewUser(u => ({ ...u, role: value}))} disabled={isCreating}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="loan_officer">Loan Officer</SelectItem>
                                        <SelectItem value="hr">HR</SelectItem>
                                        <SelectItem value="cfo">CFO</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="ceo">CEO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create User
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.uid}>
                        <TableCell>
                           <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={getBorrowerAvatar(user.uid)} alt="User Avatar" />
                                    <AvatarFallback>{user.email.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.email.split('@')[0]}</span>
                            </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(newRole: UserProfile['role']) => onRoleChange(user.uid, newRole)}
                            disabled={isUpdating || user.uid === userProfile?.uid || userProfile?.role !== 'admin'}
                          >
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="loan_officer">Loan Officer</SelectItem>
                                <SelectItem value="hr">HR</SelectItem>
                                <SelectItem value="cfo">CFO</SelectItem>
                                {userProfile?.role === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                                <SelectItem value="ceo">CEO</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          {user.role !== 'admin' && userProfile?.role === 'admin' && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={isPromoting}>
                                      {isPromoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                        Promote to Admin
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will grant full administrative privileges to {user.email}. This action is reversible but should be done with caution.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handlePromoteUser(user.email)}>
                                            Yes, Promote
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

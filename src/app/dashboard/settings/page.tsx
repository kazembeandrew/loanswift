
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Header } from '@/components/header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getSettings, updateSettings } from '@/services/settings-service';
import type { BusinessSettings } from '@/types';
import { Loader2, Trash2, ShieldAlert } from 'lucide-react';
import { useDB } from '@/lib/firebase-provider';


export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSavingTransition] = useTransition();
  const [isDeleting, startDeletingTransition] = useTransition();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const db = useDB();

  const canAccessSettings = userProfile?.role === 'admin' || userProfile?.role === 'ceo' || userProfile?.role === 'cfo';

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      const settingsData = await getSettings(db);
      setSettings(settingsData);
      setIsLoading(false);
    }
    if (canAccessSettings) {
      fetchSettings();
    } else {
        setIsLoading(false);
    }
  }, [canAccessSettings, db]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (settings) {
      setSettings({
        ...settings,
        [id]: id === 'reserveAmount' ? parseFloat(value) || 0 : value,
      });
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    startSavingTransition(async () => {
      try {
        await updateSettings(db, settings);
        toast({
          title: 'Settings Saved',
          description: 'Your business information has been updated.',
        });
      } catch (error) {
        toast({
          title: 'Error Saving Settings',
          description: 'Could not save your settings. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  const confirmDeleteAllData = () => {
    if (!user) {
        toast({ title: "Not Authenticated", description: "You must be logged in to perform this action.", variant: 'destructive'});
        return;
    }
    startDeletingTransition(async () => {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/admin/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
        });
        
        const result = await response.json();

        if (response.ok) {
          toast({
            title: 'Data Deletion Successful',
            description: result.message || 'All application data has been permanently deleted. Please refresh the page.',
          });
        } else {
          throw new Error(result.message || 'An unknown error occurred during reset.');
        }
      } catch (error) {
        toast({
          title: 'Error Deleting Data',
          description: error instanceof Error ? error.message : 'Could not delete all data. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };


  if (isLoading) {
    return (
      <>
        <Header title="Settings" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
      </>
    );
  }

  if (!canAccessSettings) {
    return (
        <>
            <Header title="Settings" />
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
      <Header title="Settings" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <form onSubmit={handleSaveChanges} className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Manage your company details that appear on receipts and other documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={settings?.businessName || ''}
                  onChange={handleInputChange}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAddress">Address</Label>
                <Input
                  id="businessAddress"
                  value={settings?.businessAddress || ''}
                  onChange={handleInputChange}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessPhone">Phone Number</Label>
                <Input
                  id="businessPhone"
                  value={settings?.businessPhone || ''}
                  onChange={handleInputChange}
                  disabled={isSaving}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Financial Settings</CardTitle>
                <CardDescription>
                    Manage financial configurations for your business.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="reserveAmount">Reserve Amount (MWK)</Label>
                    <Input
                        id="reserveAmount"
                        type="number"
                        value={settings?.reserveAmount || 0}
                        onChange={handleInputChange}
                        disabled={isSaving}
                    />
                    <p className="text-xs text-muted-foreground">
                        This amount will be excluded from "Available for Lending" as a safety buffer.
                    </p>
                </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>

        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Delete All Application Data</h3>
                    <p className="text-sm text-muted-foreground">Permanently delete all borrowers, loans, payments, and other data.</p>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete All Data
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete all data from your application, including all borrowers, loans, payments, financial records, and messages.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDeleteAllData} className="bg-destructive hover:bg-destructive/90">
                                Confirm Deletion
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
      </main>
    </>
  );
}

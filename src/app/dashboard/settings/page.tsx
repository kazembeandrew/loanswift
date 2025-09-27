'use client';

import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { getSettings, updateSettings } from '@/services/settings-service';
import type { BusinessSettings } from '@/types';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      const settingsData = await getSettings();
      setSettings(settingsData);
      setIsLoading(false);
    }
    fetchSettings();
  }, []);

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

    try {
      await updateSettings(settings);
      toast({
        title: 'Settings Saved',
        description: 'Your business information has been updated.',
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: 'Error Saving Settings',
        description: 'Could not save your settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header title="Settings" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAddress">Address</Label>
                <Input
                  id="businessAddress"
                  value={settings?.businessAddress || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessPhone">Phone Number</Label>
                <Input
                  id="businessPhone"
                  value={settings?.businessPhone || ''}
                  onChange={handleInputChange}
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
                    />
                    <p className="text-xs text-muted-foreground">
                        This amount will be excluded from "Available for Lending" as a safety buffer.
                    </p>
                </div>
            </CardContent>
          </Card>

          <Button type="submit">Save Changes</Button>
        </form>
      </main>
    </div>
  );
}

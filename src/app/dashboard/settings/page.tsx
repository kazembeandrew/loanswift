'use client';

import { useState } from 'react';
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

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState('Janalo Enterprises');
  const [businessAddress, setBusinessAddress] = useState('Private Bag 292, Lilongwe');
  const [businessPhone, setBusinessPhone] = useState('+265 996 566 091 / +265 880 663 248');
  const { toast } = useToast();

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you would save these settings to a database.
    // For this demo, we'll just show a success message.
    toast({
      title: 'Settings Saved',
      description: 'Your business information has been updated.',
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Settings" />
      <main className="flex-1 space-y-4 p-4 md:p-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Manage your company details that appear on receipts and other documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveChanges} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-address">Address</Label>
                  <Input
                    id="business-address"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-phone">Phone Number</Label>
                  <Input
                    id="business-phone"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                  />
                </div>
                <Button type="submit">Save Changes</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
               <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-10">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <h3 className="font-headline text-xl font-bold tracking-tight">
                      Theme Customization Coming Soon
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      You'll be able to switch between light and dark mode and change colors.
                    </p>
                  </div>
                </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

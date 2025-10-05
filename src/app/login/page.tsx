'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getSettings } from '@/services/settings-service';
import type { BusinessSettings } from '@/types';
import { getPlaceholderImage } from '@/lib/placeholder-images';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const { signIn } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
        console.error(error);
        toast({
            title: 'Login Failed',
            description: 'Please check your email and password.',
            variant: 'destructive',
        });
    } finally {
      setIsLoading(false);
    }
  };

  const businessLogo = getPlaceholderImage('business-logo-small');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-dark">
      <Card className="w-full max-w-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-4 mb-4">
                 {businessLogo && (
                    <img src={businessLogo.imageUrl} alt="Business Logo" className="h-12 w-12" data-ai-hint={businessLogo.imageHint} />
                 )}
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
                  {settings?.businessName || 'Welcome'}
                </h1>
            </div>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-100 dark:bg-slate-900/50"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-100 dark:bg-slate-900/50"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

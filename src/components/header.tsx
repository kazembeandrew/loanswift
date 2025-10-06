'use client';

import { Bell, Search, PlusCircle, LogOut, Settings as SettingsIcon, Landmark } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from './ui/sidebar';
import { GlobalSearch } from './global-search';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { usePathname } from 'next/navigation';


type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const { userProfile, signOut } = useAuth();
  const userDisplayName = userProfile?.email || 'Staff Admin';
  const userFallback = userDisplayName.substring(0, 2).toUpperCase();
  const isAdmin = userProfile?.role === 'admin';
  const pathname = usePathname();

  return (
    <>
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6">
      <div className="flex items-center gap-3">
        <div className="md:hidden">
            <SidebarTrigger />
        </div>
        <div className="text-primary h-8 w-8 md:hidden">
            <Landmark className="h-8 w-8" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>
        {pathname === '/dashboard' && userProfile?.role !== 'hr' && (
             <Button size="sm" asChild>
                <Link href="/dashboard/borrowers">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Borrower
                </Link>
            </Button>
        )}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                 <AvatarImage src={`https://picsum.photos/seed/${userProfile?.uid}/40/40`} />
                <AvatarFallback>{userFallback}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userDisplayName} ({userProfile?.role})</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isAdmin && (
                <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        Settings
                    </Link>
                </DropdownMenuItem>
            )}
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    <GlobalSearch isOpen={isSearchOpen} setIsOpen={setSearchOpen} />
    </>
  );
}

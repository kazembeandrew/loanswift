'use client';

import { Bell, Search, PlusCircle, LogOut, Settings as SettingsIcon } from 'lucide-react';
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

type HeaderProps = {
  title: string;
  showAddBorrowerButton?: boolean;
  onAddBorrowerClick?: () => void;
};

export function Header({ title, showAddBorrowerButton = false, onAddBorrowerClick }: HeaderProps) {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const { userProfile, signOut } = useAuth();
  const userDisplayName = userProfile?.email || 'Staff Admin';
  const userFallback = userDisplayName.substring(0, 2).toUpperCase();
  const isAdmin = userProfile?.role === 'admin';

  return (
    <>
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6">
      <div className="flex items-center gap-3">
        <div className="md:hidden">
            <SidebarTrigger />
        </div>
        <div className="text-primary h-8 w-8 md:hidden">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
            </svg>
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>
        {showAddBorrowerButton && onAddBorrowerClick && (
            <Button size="sm" onClick={onAddBorrowerClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Borrower
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
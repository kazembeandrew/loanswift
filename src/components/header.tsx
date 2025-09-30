
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
import { getPlaceholderImage } from '@/lib/placeholder-images';
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
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4 md:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <h1 className="font-headline text-xl font-semibold md:text-2xl">
        {title}
      </h1>
      <div className="ml-auto flex items-center gap-4">
        {showAddBorrowerButton && (
          <Button onClick={onAddBorrowerClick} className="hidden sm:flex">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Borrower
          </Button>
        )}
        <Button variant="outline" className="hidden md:flex gap-2 items-center text-muted-foreground pr-8" onClick={() => setSearchOpen(true)}>
            <Search className="h-4 w-4" />
            <span>Search...</span>
             <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full md:hidden" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
        </Button>

        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
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

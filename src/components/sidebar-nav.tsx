'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Landmark,
  Settings,
  Receipt,
  ArrowLeftRight,
  Banknote,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/loans', label: 'Loans', icon: ArrowLeftRight },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/payments', label: 'Payments', icon: Landmark },
  { href: '/dashboard/receipts', label: 'Receipts', icon: Receipt },
  { href: '/dashboard/financials', label: 'Financials', icon: Banknote },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r" variant="sidebar">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Landmark className="size-8 text-primary" />
          <h1 className="font-headline text-2xl font-semibold text-primary">
            Janalo Enterprises
          </h1>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-4 pt-0">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === item.href : true) }
                tooltip={item.label}
                className="justify-start"
              >
                <Link href={item.href}>
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/dashboard/settings'}
              tooltip="Settings"
              className="justify-start"
            >
              <Link href="/dashboard/settings">
                <Settings className="size-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

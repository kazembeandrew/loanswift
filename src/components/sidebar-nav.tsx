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
  TrendingUp,
  TrendingDown,
  Briefcase,
  PiggyBank,
  ChevronDown
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const portfolioItems = [
  { href: '/dashboard/loans', label: 'Loans', icon: ArrowLeftRight },
  { href: '/dashboard/borrowers', label: 'Borrowers', icon: Users },
  { href: '/dashboard/payments', label: 'Payments', icon: Landmark },
  { href: '/dashboard/receipts', label: 'Receipts', icon: Receipt },
];

const financialItems = [
    { href: '/dashboard/financials', label: 'Financials', icon: Banknote },
    { href: '/dashboard/capital', label: 'Capital', icon: Briefcase },
    { href: '/dashboard/income', label: 'Income', icon: TrendingUp },
    { href: '/dashboard/expenses', label: 'Expenses', icon: TrendingDown },
    { href: '/dashboard/drawings', label: 'Drawings', icon: PiggyBank },
]

const utilityItems = [
    { href: '/dashboard/reports', label: 'Reports', icon: FileText },
]

export function SidebarNav() {
  const pathname = usePathname();

  const isPortfolioActive = portfolioItems.some(item => pathname.startsWith(item.href));
  const isFinancialsActive = financialItems.some(item => pathname.startsWith(item.href));
  const isUtilitiesActive = utilityItems.some(item => pathname.startsWith(item.href));

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
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname === '/dashboard'}
                    tooltip="Dashboard"
                    className="justify-start"
                >
                    <Link href="/dashboard">
                    <LayoutDashboard className="size-4" />
                    <span>Dashboard</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>

        <Collapsible defaultOpen={isPortfolioActive}>
          <CollapsibleTrigger className="w-full">
            <div className="group flex w-full items-center justify-between rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted">
              <span>Portfolio</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenu className="mt-2">
              {portfolioItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label} className="justify-start">
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>
        
        <Collapsible defaultOpen={isFinancialsActive} className="mt-2">
          <CollapsibleTrigger className="w-full">
            <div className="group flex w-full items-center justify-between rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted">
              <span>Financials</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenu className="mt-2">
              {financialItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label} className="justify-start">
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>
        
         <Collapsible defaultOpen={isUtilitiesActive} className="mt-2">
          <CollapsibleTrigger className="w-full">
            <div className="group flex w-full items-center justify-between rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted">
              <span>Utilities</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenu className="mt-2">
              {utilityItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label} className="justify-start">
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>

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

    
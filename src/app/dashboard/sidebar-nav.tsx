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
  PiggyBank,
  ChevronDown,
  LogOut,
  MessageCircle,
  Shield,
  BookUser,
  BookCopy,
  Calculator,
  History,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

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
  { href: '/dashboard/payments', label: 'Payments', icon: Banknote },
  { href: '/dashboard/receipts', label: 'Receipts', icon: Receipt },
];

const financialItems = [
    { href: '/dashboard/banking', label: 'Banking', icon: Landmark },
    { href: '/dashboard/accounts', label: 'Chart of Accounts', icon: BookUser },
    { href: '/dashboard/journal', label: 'Journal', icon: BookCopy },
    { href: '/dashboard/accounting', label: 'Accounting', icon: Calculator },
]

const utilityItems = [
    { href: '/dashboard/reports', label: 'Financial Reports', icon: FileText },
    { href: '/dashboard/situation-reports', label: 'Situation Reports', icon: ClipboardList },
]

const adminItems = [
    { href: '/dashboard/staff', label: 'Staff', icon: Shield },
    { href: '/dashboard/audit-log', label: 'Audit Log', icon: History },
];


export function SidebarNav() {
  const pathname = usePathname();
  const { userProfile, signOut } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const isCeo = userProfile?.role === 'ceo';
  const isCfo = userProfile?.role === 'cfo';
  const isHr = userProfile?.role === 'hr';

  const showFinancials = isAdmin || isCeo || isCfo;
  const showPortfolio = !isHr; // Everyone except HR sees this

  const isPortfolioActive = portfolioItems.some(item => pathname.startsWith(item.href));
  const isFinancialsActive = financialItems.some(item => pathname.startsWith(item.href));
  const isUtilitiesActive = utilityItems.some(item => pathname.startsWith(item.href));
  const isAdminActive = adminItems.some(item => pathname.startsWith(item.href));

  return (
    <Sidebar className="border-r" variant="sidebar">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
           <div className="text-primary h-8 w-8">
            <Landmark className="h-8 w-8" />
            </div>
          <h1 className="font-headline text-2xl font-semibold text-primary">
            LoanSwift
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
             <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/dashboard/chat')}
                    tooltip="Chat"
                    className="justify-start"
                >
                    <Link href="/dashboard/chat">
                    <MessageCircle className="size-4" />
                    <span>Chat</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>

        {showPortfolio && (
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
        )}
        
        {showFinancials && (
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
        )}
        
         <Collapsible defaultOpen={isUtilitiesActive} className="mt-2">
          <CollapsibleTrigger className="w-full">
            <div className="group flex w-full items-center justify-between rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted">
              <span>Reports</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenu className="mt-2">
              {utilityItems.map((item) => {
                if (item.href === '/dashboard/reports' && !showFinancials) return null;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label} className="justify-start">
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>

        {(isAdmin || isHr) && (
          <Collapsible defaultOpen={isAdminActive || isHr} className="mt-2">
            <CollapsibleTrigger className="w-full">
              <div className="group flex w-full items-center justify-between rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted">
                <span>Admin</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu className="mt-2">
                {adminItems.map((item) => {
                  if (item.label === 'Audit Log' && !isAdmin) return null;
                  return (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label} className="justify-start">
                        <Link href={item.href}>
                            <item.icon className="size-4" />
                            <span>{item.label}</span>
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        )}


      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
         {isAdmin && (
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
          )}
           <SidebarMenuItem>
              <SidebarMenuButton
                onClick={signOut}
                tooltip="Logout"
                className="justify-start"
              >
                <LogOut className="size-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

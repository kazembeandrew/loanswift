
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { customers, loans } from '@/lib/data';
import type { Customer, Loan } from '@/types';
import { FileText, User, Search } from 'lucide-react';

type SearchResult = {
  type: 'customer' | 'loan';
  title: string;
  description: string;
  href: string;
};

type GlobalSearchProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

export function GlobalSearch({ isOpen, setIsOpen }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (query.length > 1) {
      const lowerCaseQuery = query.toLowerCase();

      const customerResults: SearchResult[] = customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(lowerCaseQuery) ||
            c.email.toLowerCase().includes(lowerCaseQuery) ||
            c.id.toLowerCase().includes(lowerCaseQuery)
        )
        .map((c) => ({
          type: 'customer',
          title: c.name,
          description: `Customer | ${c.email}`,
          href: `/dashboard/customers/${c.id}`,
        }));

      const loanResults: SearchResult[] = loans
        .filter((l) => l.id.toLowerCase().includes(lowerCaseQuery))
        .map((l) => {
            const customer = customers.find(c => c.id === l.customerId);
            return {
                type: 'loan',
                title: l.id,
                description: `Loan | ${customer?.name || 'Unknown Customer'}`,
                href: `/dashboard/loans`, // No specific loan page, so link to loans list
            };
        });

      setResults([...customerResults, ...loanResults]);
    } else {
      setResults([]);
    }
  }, [query]);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  const handleSelect = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 gap-0 top-1/4">
        <DialogHeader className="sr-only">
          <DialogTitle>Global Search</DialogTitle>
          <DialogDescription>Search for customers or loans by name, email, or ID.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for customers or loans..."
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="py-2">
            {results.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto">
                    {results.map((result, index) => (
                        <div 
                            key={index}
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent mx-2"
                            onClick={() => handleSelect(result.href)}
                        >
                             {result.type === 'customer' ? <User className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
                            <div>
                                <p className="font-medium">{result.title}</p>
                                <p className="text-xs text-muted-foreground">{result.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                query.length > 1 && (
                    <div className="py-6 text-center text-sm">
                        No results found.
                    </div>
                )
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

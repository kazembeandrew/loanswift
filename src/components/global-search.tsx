'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Borrower, Loan } from '@/types';
import { FileText, User, Search } from 'lucide-react';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';

type SearchResult = {
  type: 'borrower' | 'loan';
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
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const [borrowersData, loansData] = await Promise.all([
      getBorrowers(),
      getLoans(),
    ]);
    setBorrowers(borrowersData);
    setLoans(loansData);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (query.length > 1) {
      const lowerCaseQuery = query.toLowerCase();

      const borrowerResults: SearchResult[] = borrowers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(lowerCaseQuery) ||
            c.idNumber.toLowerCase().includes(lowerCaseQuery) ||
            c.id.toLowerCase().includes(lowerCaseQuery)
        )
        .map((c) => ({
          type: 'borrower',
          title: c.name,
          description: `Borrower | ${c.idNumber}`,
          href: `/dashboard/borrowers/${c.id}`,
        }));

      const loanResults: SearchResult[] = loans
        .filter((l) => l.id.toLowerCase().includes(lowerCaseQuery))
        .map((l) => {
            const borrower = borrowers.find(c => c.id === l.borrowerId);
            return {
                type: 'loan',
                title: l.id,
                description: `Loan | ${borrower?.name || 'Unknown Borrower'}`,
                href: `/dashboard/loans`,
            };
        });

      setResults([...borrowerResults, ...loanResults]);
    } else {
      setResults([]);
    }
  }, [query, borrowers, loans]);
  
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
          <DialogDescription>Search for borrowers or loans by name, ID number, or ID.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for borrowers or loans..."
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
                             {result.type === 'borrower' ? <User className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Borrower, Loan } from '@/types';
import { FileText, User, Search } from 'lucide-react';
import { getBorrowers } from '@/services/borrower-service';
import { getLoans } from '@/services/loan-service';
import { useDB } from '@/lib/firebase-provider';

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
  const db = useDB();

  const fetchData = useCallback(async () => {
    const [borrowersData, loansData] = await Promise.all([
      getBorrowers(db),
      getLoans(db),
    ]);
    setBorrowers(borrowersData);
    setLoans(loansData);
  }, [db]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  useEffect(() => {
    if (query.length > 1) {
      const lowerCaseQuery = query.toLowerCase();

      const borrowerResults: SearchResult[] = borrowers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(lowerCaseQuery) ||
            c.idNumber.toLowerCase().includes(lowerCaseQuery)
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
                title: `Loan ${l.id}`,
                description: `For ${borrower?.name || 'Unknown Borrower'}`,
                href: `/dashboard/borrowers/${l.borrowerId}`,
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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        setQuery('');
        setResults([]);
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 gap-0 top-[20%]">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search borrowers by name/ID, or loans by ID..."
            className="flex h-12 w-full rounded-md bg-transparent text-base outline-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="py-2">
            {results.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto">
                    {results.map((result, index) => (
                        <div 
                            key={index}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent mx-2"
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

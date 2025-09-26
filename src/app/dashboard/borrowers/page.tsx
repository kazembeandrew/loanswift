import { Header } from '@/components/header';
import BorrowerList from './components/borrower-list';

export default function BorrowersPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Borrowers" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <BorrowerList />
      </main>
    </div>
  );
}

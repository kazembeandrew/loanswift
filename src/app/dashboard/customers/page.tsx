import { Header } from '@/components/header';
import CustomerList from './components/customer-list';

export default function CustomersPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Customers" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <CustomerList />
      </main>
    </div>
  );
}

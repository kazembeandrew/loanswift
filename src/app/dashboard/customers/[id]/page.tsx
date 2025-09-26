import { Header } from '@/components/header';
import { customers, loans } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Paperclip } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = customers.find((c) => c.id === params.id);
  const customerLoans = loans.filter((l) => l.customerId === params.id);

  if (!customer) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header title="Customer Not Found" />
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <p>The requested customer could not be found.</p>
          <Link href="/dashboard/customers">
            <Button>Back to Customers</Button>
          </Link>
        </main>
      </div>
    );
  }
  
  const getLoanStatusVariant = (
    status: 'Active' | 'Overdue' | 'Paid' | 'Pending'
  ) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Overdue':
        return 'destructive';
      case 'Paid':
        return 'secondary';
      case 'Pending':
        return 'outline';
    }
  };

  const avatarFallback = customer.name.split(' ').map(n => n[0]).join('');

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Customer Dashboard" />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={`https://picsum.photos/seed/${customer.id}/100/100`} alt="Avatar" data-ai-hint="user avatar" />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-headline text-3xl font-semibold">{customer.name}</h1>
            <p className="text-muted-foreground">{customer.email}</p>
          </div>
        </div>

        <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Phone:</strong> {customer.phone}</p>
              <p><strong>Address:</strong> {customer.address}</p>
              <p><strong>Joined:</strong> {new Date(customer.joinDate).toLocaleDateString()}</p>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Loan History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customerLoans.length > 0 ? (
                customerLoans.map(loan => (
                  <div key={loan.id} className="flex items-center justify-between p-2 rounded-md bg-muted">
                    <div>
                      <p className="font-semibold">{loan.id}</p>
                      <p className="text-sm">Principal: MWK {loan.principal.toLocaleString()}</p>
                    </div>
                    <Badge variant={getLoanStatusVariant(loan.status)}>{loan.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No loans found for this customer.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mt-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
               <Paperclip className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="font-headline">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                    <p className="text-muted-foreground">Attachments will be shown here.</p>
                    <Button variant="outline" className="mt-4">Upload File</Button>
                </div>
            </CardContent>
          </Card>
          <Card>
             <CardHeader className="flex flex-row items-center gap-2">
               <MapPin className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="font-headline">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-64 w-full rounded-lg overflow-hidden border">
                 <Image 
                    src="https://picsum.photos/seed/map/800/400" 
                    alt="Map placeholder" 
                    fill
                    style={{ objectFit: 'cover' }}
                    data-ai-hint="map location"
                  />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

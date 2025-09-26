
'use client';

import { Header } from '@/components/header';
import { customers, loans } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Paperclip, Upload } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = customers.find((c) => c.id === params.id);
  const customerLoans = loans.filter((l) => l.customerId === params.id);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
    }
  };

  const handleUploadClick = () => {
    fileInput?.click();
  };


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
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="font-headline">Attachments</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleUploadClick}>
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
              <Input 
                type="file" 
                className="hidden" 
                ref={setFileInput} 
                onChange={handleFileChange}
                multiple
              />
            </CardHeader>
            <CardContent>
              {attachments.length > 0 ? (
                <ul className="space-y-2">
                  {attachments.map((file, index) => (
                    <li key={index} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                      <span>{file.name}</span>
                      <span className="text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</span>
                    </li>
                  ))}
                </ul>
              ) : (
                 <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                      <p className="text-muted-foreground">No attachments yet. Upload documents like ID scans or application forms.</p>
                  </div>
              )}
            </CardContent>
          </Card>
          <Card>
             <CardHeader className="flex flex-row items-center gap-2">
               <MapPin className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="font-headline">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-64 w-full rounded-lg overflow-hidden border">
                 <iframe 
                    src="https://www.openstreetmap.org/export/embed.html?bbox=33.7823%2C-13.9626%2C33.7923%2C-13.9526&layer=mapnik&marker=-13.9576,33.7873" 
                    style={{border: 0, width: '100%', height: '100%'}}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Header } from '@/components/header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getMessages, addMessage } from '@/services/message-service';
import type { Message } from '@/types';
import { useAuth } from '@/context/auth-context';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getBorrowerAvatar } from '@/lib/placeholder-images';


export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [isPosting, startPosting] = useTransition();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    setIsFetching(true);
    try {
      const messagesData = await getMessages();
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast({
        title: 'Error',
        description: 'Could not fetch messages.',
        variant: 'destructive'
      });
    } finally {
        setIsFetching(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !userProfile) {
      return;
    }

    startPosting(async () => {
      try {
        await addMessage({
          content: newMessage,
          authorEmail: userProfile.email,
          createdAt: new Date().toISOString(),
        });
        setNewMessage('');
        toast({
          title: 'Message Posted',
          description: 'Your message has been added to the board.',
        });
        await fetchMessages(); // Refresh messages
      } catch (error) {
        console.error('Failed to post message:', error);
        toast({
          title: 'Error',
          description: 'Could not post your message. Please try again.',
          variant: 'destructive'
        });
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Message Board" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Post a New Message</CardTitle>
            <CardDescription>
              Share updates, reminders, or notes with the team.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePostMessage}>
            <CardContent>
              <Textarea
                placeholder="Type your message here..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isPosting}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPosting || !newMessage.trim()}>
                {isPosting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Post Message
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {isFetching ? (
                    <div className="flex items-center justify-center p-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : messages.length > 0 ? (
                    messages.map(message => (
                        <div key={message.id} className="flex items-start gap-4">
                           <Avatar>
                                <AvatarImage src={getBorrowerAvatar(message.authorEmail)} data-ai-hint="user avatar" />
                                <AvatarFallback>{message.authorEmail.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold">{message.authorEmail}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{message.content}</p>
                            </div>
                        </div>
                    ))
                ) : (
                     <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-10">
                        <div className="flex flex-col items-center gap-1 text-center">
                            <h3 className="font-headline text-2xl font-bold tracking-tight">No messages yet</h3>
                            <p className="text-sm text-muted-foreground">Be the first to post a message.</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

      </main>
    </div>
  );
}

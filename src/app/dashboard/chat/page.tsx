'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  getConversationsForUser,
  getMessagesForConversation,
  sendMessage,
  findOrCreateConversation,
} from '@/services/chat-service';
import { getAllUsers } from '@/services/user-service';
import type { Conversation, ChatMessage, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getBorrowerAvatar } from '@/lib/placeholder-images';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/header';

export default function ChatPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isSending, startSending] = useTransition();

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const convos = await getConversationsForUser(user.uid);
      setConversations(convos);
      if (!activeConversation && convos.length > 0) {
        setActiveConversation(convos[0]);
      }
    } catch(error) {
        // Errors are now handled globally, but we can still toast a generic message.
        console.error("Error fetching conversations:", error);
        toast({ title: 'Error', description: 'Could not load conversations.', variant: 'destructive' });
    }
  }, [user, activeConversation, toast]);

  const fetchMessages = useCallback(async () => {
    if (!activeConversation) return;
    try {
        const msgs = await getMessagesForConversation(activeConversation.id);
        setMessages(msgs);
    } catch(error) {
        console.error("Error fetching messages:", error);
        toast({ title: 'Error', description: 'Could not load messages for this conversation.', variant: 'destructive' });
    }
  }, [activeConversation, toast]);

  useEffect(() => {
    if(userProfile) {
        fetchConversations();
        getAllUsers().then(setAllUsers);
    }
  }, [fetchConversations, userProfile]);

  useEffect(() => {
    if (activeConversation) {
      const interval = setInterval(fetchMessages, 2000); // Poll for new messages
      return () => clearInterval(interval);
    }
  }, [activeConversation, fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || !user || !userProfile) return;

    startSending(async () => {
      try {
        await sendMessage(activeConversation.id, user.uid, userProfile.email, newMessage);
        setNewMessage('');
        await fetchMessages(); // Immediately fetch after sending
        await fetchConversations(); // Refresh conversation list to show latest message
      } catch (error) {
        // The service now throws a specific error, which is caught by the listener.
        // We don't need to toast here as the listener will show the dev overlay.
        console.error("Failed to send message:", error);
      }
    });
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation);
    // When a conversation is selected, immediately fetch its messages.
    if (conversation) {
        try {
            const msgs = await getMessagesForConversation(conversation.id);
            setMessages(msgs);
        } catch (error) {
            console.error("Error fetching messages:", error);
            toast({ title: 'Error', description: 'Could not load messages.', variant: 'destructive' });
        }
    }
  };


  const startNewConversation = async (otherUser: UserProfile) => {
    if (!userProfile) return;
    try {
        const conversationId = await findOrCreateConversation(userProfile, otherUser);
        const convos = await getConversationsForUser(userProfile.uid);
        setConversations(convos);
        const newActiveConvo = convos.find(c => c.id === conversationId);
        if (newActiveConvo) {
            handleSelectConversation(newActiveConvo);
        }
    } catch (error) {
        console.error("Error starting conversation:", error);
        toast({ title: 'Error', description: 'Could not start a new conversation.', variant: 'destructive' });
    }
  };

  const getOtherParticipant = (convo: Conversation) => {
    return convo.participantEmails.find(email => email !== userProfile?.email) || 'Unknown User';
  };

  return (
    <div className="flex h-full flex-col">
        <Header title="Internal Chat" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-[calc(100vh-4rem)]">
        <aside className="border-r flex flex-col">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold">Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                 {conversations.map(convo => (
                    <div key={convo.id} onClick={() => handleSelectConversation(convo)} className={`p-4 cursor-pointer hover:bg-muted ${activeConversation?.id === convo.id ? 'bg-muted' : ''}`}>
                        <p className="font-semibold">{getOtherParticipant(convo)}</p>
                        <p className="text-sm text-muted-foreground truncate">{convo.lastMessage?.text}</p>
                    </div>
                 ))}
            </div>
            <div className="p-4 border-t">
                <h3 className="font-semibold mb-2">New Chat</h3>
                <div className="max-h-48 overflow-y-auto">
                    {allUsers.filter(u => u.uid !== user?.uid).map(u => (
                        <div key={u.uid} onClick={() => startNewConversation(u)} className="p-2 cursor-pointer hover:bg-muted rounded-md">
                            <p>{u.email}</p>
                        </div>
                    ))}
                </div>
            </div>
        </aside>

        <main className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col h-full">
            {activeConversation ? (
                <>
                <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold">{getOtherParticipant(activeConversation)}</h2>
                </div>
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user?.uid ? 'justify-end' : ''}`}>
                             {msg.senderId !== user?.uid && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={getBorrowerAvatar(msg.senderId)} />
                                    <AvatarFallback>{msg.senderEmail.substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={`rounded-lg px-4 py-2 max-w-lg ${msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm">{msg.text}</p>
                            </div>
                             {msg.senderId === user?.uid && (
                                <Avatar className="h-8 w-8">
                                     <AvatarImage src={getBorrowerAvatar(msg.senderId)} />
                                    <AvatarFallback>{msg.senderEmail.substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <Input 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            disabled={isSending}
                        />
                        <Button type="submit" disabled={isSending || !newMessage.trim()}>
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <Card className="p-10 text-center">
                        <h2 className="text-xl font-semibold">Select a conversation</h2>
                        <p>Or start a new chat with someone from the list.</p>
                    </Card>
                </div>
            )}
        </main>
        </div>
    </div>
  );
}

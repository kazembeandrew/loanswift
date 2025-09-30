
'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useAuth } from '@/context/auth-context';
import { Header } from '@/components/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, MessageCircle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getConversationsForUser,
  getMessagesForConversation,
  sendMessage,
  findOrCreateConversation,
} from '@/services/chat-service';
import { getAllUsers } from '@/services/user-service';
import type { Conversation, ChatMessage, UserProfile } from '@/types';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { getBorrowerAvatar } from '@/lib/placeholder-images';

function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  currentUserEmail,
}: {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  currentUserEmail: string;
}) {
  const getOtherParticipant = (convo: Conversation) => {
    return convo.participantEmails.find(email => email !== currentUserEmail) || 'Chat';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, 'p');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'P');
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-4 pt-0">
        {conversations.map(convo => (
          <button
            key={convo.id}
            onClick={() => onSelectConversation(convo.id)}
            className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent ${
              selectedConversationId === convo.id && 'bg-accent'
            }`}
          >
            <div className="flex w-full items-center">
              <div className="font-semibold">{getOtherParticipant(convo)}</div>
              {convo.lastMessage && (
                <div className="ml-auto text-xs text-muted-foreground">
                  {formatTimestamp(convo.lastMessage.timestamp)}
                </div>
              )}
            </div>
            <div className="line-clamp-2 text-xs text-muted-foreground">
              {convo.lastMessage?.text.substring(0, 300) || "No messages yet."}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

export default function ChatPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isNewConvoOpen, setIsNewConvoOpen] = useState(false);

  const [isLoadingConvos, startConvosLoading] = useTransition();
  const [isLoadingMessages, startMessagesLoading] = useTransition();
  const [isSending, startSending] = useTransition();

  const fetchConversations = useCallback(() => {
    if (!user) return;
    startConvosLoading(async () => {
      try {
        const convos = await getConversationsForUser(user.uid);
        setConversations(convos);
      } catch (error) {
        toast({ title: 'Error', description: 'Could not fetch conversations.', variant: 'destructive' });
      }
    });
  }, [user, toast]);
  
  const fetchAllUsers = useCallback(async () => {
      if (!user) return;
      try {
        const users = await getAllUsers();
        setAllUsers(users.filter(u => u.uid !== user.uid));
      } catch (error) {
        toast({ title: 'Error', description: 'Could not fetch users.', variant: 'destructive' });
      }
  }, [user, toast]);

  useEffect(() => {
    fetchConversations();
    fetchAllUsers();
  }, [fetchConversations, fetchAllUsers]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    };

    startMessagesLoading(async () => {
      try {
        const msgs = await getMessagesForConversation(selectedConversationId);
        setMessages(msgs);
      } catch (error) {
        toast({ title: 'Error', description: 'Could not fetch messages.', variant: 'destructive' });
      }
    });
  }, [selectedConversationId, toast]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversationId || !user || !userProfile) return;

    startSending(async () => {
      try {
        await sendMessage(selectedConversationId, user.uid, userProfile.email, newMessage);
        setNewMessage('');
        // Refresh messages for the current conversation
        const msgs = await getMessagesForConversation(selectedConversationId);
        setMessages(msgs);
        // Refresh conversation list to show the latest message on top
        fetchConversations();
      } catch (error) {
        toast({ title: 'Error', description: 'Could not send message.', variant: 'destructive' });
      }
    });
  };
  
  const handleStartNewConversation = async (otherUser: UserProfile) => {
    if (!userProfile) return;
    try {
        const convoId = await findOrCreateConversation(userProfile, otherUser);
        setSelectedConversationId(convoId);
        fetchConversations(); // Refresh the list
        setIsNewConvoOpen(false);
    } catch (error) {
        toast({ title: 'Error', description: 'Could not start new conversation.', variant: 'destructive'});
    }
  }

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const otherParticipantEmail = selectedConversation?.participantEmails.find(e => e !== userProfile?.email);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title="Chat" />
      <main className="flex flex-1">
        <div className="w-1/3 border-r flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
                 <h2 className="text-xl font-bold">Conversations</h2>
                 <Dialog open={isNewConvoOpen} onOpenChange={setIsNewConvoOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Plus /></Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Conversation</DialogTitle>
                            <DialogDescription>Select a user to start a chat with.</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-80">
                            <div className="space-y-2">
                                {allUsers.map(u => (
                                    <div key={u.uid} onClick={() => handleStartNewConversation(u)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer">
                                        <Avatar>
                                            <AvatarFallback>{u.email.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <p>{u.email}</p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                 </Dialog>
            </div>
          {isLoadingConvos ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              currentUserEmail={userProfile?.email || ''}
            />
          )}
        </div>
        <div className="flex w-2/3 flex-col">
          {selectedConversationId ? (
            <>
                <CardHeader className="flex flex-row items-center border-b">
                    <div className="flex items-center gap-2">
                        <Avatar>
                            <AvatarFallback>{otherParticipantEmail?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                        </Avatar>
                        <div>
                             <CardTitle>{otherParticipantEmail}</CardTitle>
                        </div>
                    </div>
                </CardHeader>
              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                      >
                         {msg.senderId !== user?.uid && (
                             <Avatar className="h-8 w-8">
                                <AvatarFallback>{msg.senderEmail.substring(0, 2).toUpperCase()}</AvatarFallback>
                             </Avatar>
                         )}
                        <div
                          className={`max-w-xs rounded-lg p-3 ${
                            msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{msg.text}</p>
                           <p className={`text-xs mt-1 ${msg.senderId === user?.uid ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                            </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={isSending}
                  />
                  <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center bg-muted/50">
                <MessageCircle className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-2xl font-bold tracking-tight">No Conversation Selected</h3>
              <p className="text-sm text-muted-foreground">
                Select a conversation from the list or start a new one.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

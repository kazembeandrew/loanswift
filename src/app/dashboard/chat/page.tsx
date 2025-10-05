
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
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function ChatBubble({ message, isSender }: { message: ChatMessage; isSender: boolean }) {
  const user = isSender ? 'You' : message.senderEmail.split('@')[0];
  const bubbleClasses = isSender
    ? 'bg-primary text-white rounded-lg'
    : 'bg-slate-100 dark:bg-slate-800 rounded-lg';
  const layoutClasses = isSender ? 'flex-row-reverse' : '';

  const avatarUrl = `https://picsum.photos/seed/${message.senderId}/40/40`;

  return (
    <div className={`flex items-start gap-4 ${layoutClasses}`}>
      <div
        className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center"
        style={{ backgroundImage: `url(${avatarUrl})` }}
      ></div>
      <div className={`flex flex-col gap-1.5 ${isSender ? 'items-end' : ''}`}>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{user}</p>
        <div className={`max-w-md p-3 text-sm ${bubbleClasses}`}>
          <p>{message.text}</p>
        </div>
      </div>
    </div>
  );
}

function GroupMember({ user }: { user: UserProfile }) {
    const avatarUrl = `https://picsum.photos/seed/${user.uid}/48/48`;
    return (
        <div className="flex items-center gap-4 p-4 hover:bg-slate-100 dark:hover:bg-slate-800/50">
            <div className="h-12 w-12 shrink-0 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${avatarUrl})` }}></div>
            <div>
                <p className="font-semibold text-slate-900 dark:text-white">{user.email.split('@')[0]}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user.role}</p>
            </div>
        </div>
    );
}

export default function ChatPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isSending, startSending] = useTransition();

  // For now, we will have a single, hardcoded conversation for "Project Alpha Team"
  // In a future step, we can re-introduce conversation selection.
  const conversationId = 'project_alpha_team';

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    const msgs = await getMessagesForConversation(conversationId);
    setMessages(msgs);
  }, [conversationId]);
  
  const fetchAllUsers = useCallback(async () => {
      const users = await getAllUsers();
      setAllUsers(users);
  }, []);

  useEffect(() => {
    fetchAllUsers();
    const interval = setInterval(() => {
        fetchMessages();
    }, 2000); // Poll for new messages every 2 seconds

    return () => clearInterval(interval);
  }, [fetchAllUsers, fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !user || !userProfile) return;

    startSending(async () => {
      try {
        await sendMessage(conversationId, user.uid, userProfile.email, newMessage);
        setNewMessage('');
        await fetchMessages(); // Immediately fetch messages after sending
      } catch (error) {
        toast({ title: 'Error', description: 'Could not send message.', variant: 'destructive' });
      }
    });
  };

  return (
    <main className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="border-b border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Project Alpha Team</h2>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} isSender={msg.senderId === user?.uid} />
                ))}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark p-4">
                <form onSubmit={handleSendMessage} className="relative">
                    <Input
                        className="w-full rounded-lg bg-slate-100 dark:bg-slate-900/50 py-3 pl-4 pr-28 text-sm placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Write a message..."
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={isSending}
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                        <button type="button" className="rounded-full p-2 hover:bg-slate-200 dark:hover:bg-slate-800">
                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400"> image </span>
                        </button>
                        <button type="button" className="rounded-full p-2 hover:bg-slate-200 dark:hover:bg-slate-800">
                            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400"> sentiment_satisfied </span>
                        </button>
                        <Button type="submit" size="icon" className="rounded-lg w-auto px-3 py-2" disabled={isSending || !newMessage.trim()}>
                            {isSending ? <Loader2 className="animate-spin" /> : <span className="material-symbols-outlined text-base"> send </span>}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
        <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Group Members</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {allUsers.map(member => (
                       <GroupMember key={member.uid} user={member} />
                    ))}
                </div>
            </div>
        </aside>
    </main>
  );
}

    
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  writeBatch,
  Timestamp,
  serverTimestamp,
  getDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Conversation, ChatMessage, UserProfile } from '@/types';

const conversationsCollection = collection(db, 'conversations');

// Get all conversations for a specific user
export async function getConversationsForUser(userId: string): Promise<Conversation[]> {
  const q = query(conversationsCollection, where('participants', 'array-contains', userId));
  const snapshot = await getDocs(q);
  const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
  return convos.sort((a, b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
    return timeB - timeA;
  });
}

// Get all messages for a specific conversation
export async function getMessagesForConversation(conversationId: string): Promise<ChatMessage[]> {
  const messagesCollection = collection(db, `conversations/${conversationId}/messages`);
  const q = query(messagesCollection, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
}

// Send a new message in a conversation
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderEmail: string,
  text: string
): Promise<string> {
  const batch = writeBatch(db);
  
  const conversationRef = doc(db, 'conversations', conversationId);
  const messagesCollection = collection(conversationRef, 'messages');
  
  const newMessageRef = doc(messagesCollection);
  
  const timestamp = new Date().toISOString();
  
  const messageData = {
    senderId,
    senderEmail,
    text,
    timestamp,
  };
  
  batch.set(newMessageRef, messageData);
  
  // Update the last message on the conversation
  batch.update(conversationRef, {
    lastMessage: {
      text,
      timestamp,
    },
  });
  
  await batch.commit();
  
  return newMessageRef.id;
}


// Start a new conversation or get an existing one
export async function findOrCreateConversation(currentUser: UserProfile, otherUser: UserProfile): Promise<string> {
  const participants = [currentUser.uid, otherUser.uid].sort();

  // Query for an existing conversation with these two participants
  const q = query(
    conversationsCollection,
    where('participants', '==', participants)
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Conversation already exists
    return snapshot.docs[0].id;
  } else {
    // Create a new conversation
    const conversationData = {
      participants,
      participantEmails: [currentUser.email, otherUser.email].sort(),
      lastMessage: null,
    };
    const docRef = await addDoc(conversationsCollection, conversationData);
    return docRef.id;
  }
}

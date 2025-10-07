'use client';

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  writeBatch,
  limit,
  type Firestore
} from 'firebase/firestore';
import type { Conversation, ChatMessage, UserProfile } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';



// Get all conversations for a specific user
export async function getConversationsForUser(db: Firestore, userId: string): Promise<Conversation[]> {
  const conversationsCollection = collection(db, 'conversations');
  const q = query(conversationsCollection, where('participants', 'array-contains', userId));
  
  try {
    const snapshot = await getDocs(q);
    const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
    return convos.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return timeB - timeA;
    });
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `conversations where participants array-contains ${userId}`,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

// Get all messages for a specific conversation
export async function getMessagesForConversation(db: Firestore, conversationId: string): Promise<ChatMessage[]> {
  const messagesCollection = collection(db, `conversations/${conversationId}/messages`);
  const q = query(messagesCollection, orderBy('timestamp', 'asc'));

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
  } catch (serverError: any) {
     if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: messagesCollection.path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

// Send a new message in a conversation
export async function sendMessage(
  db: Firestore,
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
  
  const lastMessageData = {
    text,
    timestamp,
    senderId,
  };

  batch.set(newMessageRef, messageData);
  batch.update(conversationRef, { lastMessage: lastMessageData });
  
  try {
    await batch.commit();
    return newMessageRef.id;
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `batchWrite<${newMessageRef.path}, ${conversationRef.path}>`,
            operation: 'write',
            requestResourceData: {
                newMessage: messageData,
                conversationUpdate: { lastMessage: lastMessageData }
            }
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}


// Start a new conversation or get an existing one
export async function findOrCreateConversation(db: Firestore, currentUser: UserProfile, otherUser: UserProfile): Promise<string> {
  const conversationsCollection = collection(db, 'conversations');
  // Ensure participants are always in a consistent order to find existing conversations.
  const participants = [currentUser.uid, otherUser.uid].sort();
  
  const q = query(
    conversationsCollection,
    where('participants', '==', participants),
    limit(1)
  );

  try {
    const snapshot = await getDocs(q);

    // If a conversation already exists, return its ID.
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    } 
    
    // If no conversation exists, create a new one.
    const participantEmails = [currentUser.email, otherUser.email].sort();
    const conversationData: Omit<Conversation, 'id'> = {
      participants,
      participantEmails,
      createdAt: new Date().toISOString(),
      lastMessage: null,
    };

    const docRef = await addDoc(conversationsCollection, conversationData);
    return docRef.id;

  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `conversations where participants == [${participants.join(',')}]`,
            operation: 'list', // Querying is a 'list' operation at its core
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

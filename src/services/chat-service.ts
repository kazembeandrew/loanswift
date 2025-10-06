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
  Timestamp,
  serverTimestamp,
  getDoc,
  arrayUnion,
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
  
  const snapshot = await getDocs(q).catch(async (serverError) => {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `conversations where participants array-contains ${userId}`,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  });

  const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
  return convos.sort((a, b) => {
    const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
    return timeB - timeA;
  });
}

// Get all messages for a specific conversation
export async function getMessagesForConversation(db: Firestore, conversationId: string): Promise<ChatMessage[]> {
  const messagesCollection = collection(db, `conversations/${conversationId}/messages`);
  const q = query(messagesCollection, orderBy('timestamp', 'asc'));

  const snapshot = await getDocs(q).catch(async (serverError) => {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: messagesCollection.path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  });
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
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
  
  await batch.commit().catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
        path: `batchWrite<${newMessageRef.path}, ${conversationRef.path}>`,
        operation: 'write',
        requestResourceData: {
            newMessage: messageData,
            conversationUpdate: { lastMessage: lastMessageData }
        }
    });
    errorEmitter.emit('permission-error', permissionError);
    throw permissionError;
  });
  
  return newMessageRef.id;
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

    // The security rule for 'create' will check if the current user's UID is in this `participants` array.
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
    // Re-throw the error to be handled by the calling component
    throw serverError;
  }
}

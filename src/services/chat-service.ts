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
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Conversation, ChatMessage, UserProfile } from '@/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';


const conversationsCollection = collection(db, 'conversations');

// Get all conversations for a specific user
export async function getConversationsForUser(userId: string): Promise<Conversation[]> {
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
    const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
    return timeB - timeA;
  });
}

// Get all messages for a specific conversation
export async function getMessagesForConversation(conversationId: string): Promise<ChatMessage[]> {
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
export async function findOrCreateConversation(currentUser: UserProfile, otherUser: UserProfile): Promise<string> {
  const participants = [currentUser.uid, otherUser.uid].sort();
  
  const q = query(
    conversationsCollection,
    where('participants', '==', participants)
  );

  const snapshot = await getDocs(q).catch(async (serverError) => {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `conversations where participants == [${participants.join(',')}]`,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  });

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  } else {
    const participantEmails = [currentUser.email, otherUser.email].sort();
    const conversationData: Omit<Conversation, 'id'> = {
      participants,
      participantEmails,
      createdAt: new Date().toISOString(),
      lastMessage: null,
    };
    const docRef = await addDoc(conversationsCollection, conversationData)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: conversationsCollection.path,
            operation: 'create',
            requestResourceData: conversationData,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
    return docRef.id;
  }
}

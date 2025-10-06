"use client"

import * as React from "react"
import type { FirebaseApp } from "firebase/app"
import type { Auth } from "firebase/auth"
import type { Firestore } from "firebase/firestore"

import { FirebaseErrorListener } from "@/components/FirebaseErrorListener"

// Types
interface FirebaseContextValue {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

// Context
const FirebaseContext = React.createContext<FirebaseContextValue | undefined>(
  undefined,
)

// Provider
function FirebaseProvider({
  value,
  children,
}: {
  value: FirebaseContextValue
  children: React.ReactNode
}) {
  return (
    <FirebaseContext.Provider value={value}>
      {children}
      {process.env.NODE_ENV === "development" && <FirebaseErrorListener />}
    </FirebaseContext.Provider>
  )
}

// Hooks
function useFirebase() {
  const context = React.useContext(FirebaseContext)
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider")
  }
  return context
}

function useAuth() {
    const { auth } = useFirebase()
    return auth;
}

function useDB() {
    const { db } = useFirebase();
    return db;
}


export {
  FirebaseContext,
  FirebaseProvider,
  useFirebase,
  useAuth as useFirebaseAuth,
  useDB
}
export type { FirebaseContextValue }

"use client"

import * as React from "react"

import { getFirebase } from "./firebase"
import { FirebaseProvider } from "./firebase-provider"

function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // We are memoizing the firebase instance to prevent re-initialization on every render.
  const value = React.useMemo(() => getFirebase(), [])

  return <FirebaseProvider value={value}>{children}</FirebaseProvider>
}

export { FirebaseClientProvider }

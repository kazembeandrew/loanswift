"use client"

import * as React from "react"
import { app, auth, db } from "./firebase"
import { FirebaseProvider } from "./firebase-provider"
import type { FirebaseContextValue } from "./firebase-provider"

function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const value = React.useMemo<FirebaseContextValue>(() => ({ app, auth, db }), [])

  return <FirebaseProvider value={value}>{children}</FirebaseProvider>
}

export { FirebaseClientProvider }

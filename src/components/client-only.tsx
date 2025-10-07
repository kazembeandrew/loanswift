'use client';

import { useState, useEffect, type ReactNode } from 'react';

type ClientOnlyProps = {
  children: ReactNode;
};

/**
 * This component ensures that its children are only rendered on the client side.
 * This is useful for wrapping components that rely on browser-specific APIs
 * or need to avoid server-side rendering mismatches.
 */
export default function ClientOnly({ children }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : null;
}

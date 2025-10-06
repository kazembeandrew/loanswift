'use client';

import { useState, useEffect, type ReactNode } from 'react';

type ClientOnlyProps = {
  children: ReactNode;
};

export default function ClientOnly({ children }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : null;
}

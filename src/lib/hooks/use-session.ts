'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'grammar-checker-session-id';

/**
 * Hook to manage user session ID
 * Generates a UUID on first visit and stores in localStorage
 */
export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Get or create session ID
    let id = localStorage.getItem(SESSION_KEY);

    if (!id) {
      id = uuidv4();
      localStorage.setItem(SESSION_KEY, id);
    }

    setSessionId(id);
  }, []);

  return sessionId;
}

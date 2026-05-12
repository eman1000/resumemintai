'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/app/firebase';

type AuthStatus = {
  user: User | null;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  loading: boolean;
};

/**
 * Non-blocking auth status hook.
 * Does NOT redirect — just reports current auth + subscription state.
 */
export function useAuthStatus(): AuthStatus {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    let alive = true;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!alive) return;

      if (!firebaseUser) {
        setUser(null);
        setIsSubscribed(false);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      try {
        const idToken = await firebaseUser.getIdToken(true);
        const res = await fetch('/api/account/ensure', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!alive) return;

        if (res.ok) {
          const json = await res.json();
          setIsSubscribed(!!json.subscribed);
        } else {
          setIsSubscribed(false);
        }
      } catch {
        if (!alive) return;
        setIsSubscribed(false);
      } finally {
        if (alive) setLoading(false);
      }
    });

    return () => {
      alive = false;
      unsub();
    };
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isSubscribed,
    loading,
  };
}

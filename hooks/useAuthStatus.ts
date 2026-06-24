'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/app/firebase';

type AuthStatus = {
  user: User | null;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  /** Active recruiter subscription (recruiter plan). */
  isRecruiterSubscribed: boolean;
  /** "candidate" | "recruiter" — primary account type for routing/UX. */
  userType: string;
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
  const [isRecruiterSubscribed, setIsRecruiterSubscribed] = useState(false);
  const [userType, setUserType] = useState('candidate');

  useEffect(() => {
    let alive = true;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!alive) return;

      if (!firebaseUser) {
        setUser(null);
        setIsSubscribed(false);
        setIsRecruiterSubscribed(false);
        setUserType('candidate');
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
          setIsRecruiterSubscribed(!!json.recruiterSubscribed);
          setUserType(json.userType || 'candidate');
        } else {
          setIsSubscribed(false);
          setIsRecruiterSubscribed(false);
        }
      } catch {
        if (!alive) return;
        setIsSubscribed(false);
        setIsRecruiterSubscribed(false);
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
    isRecruiterSubscribed,
    userType,
    loading,
  };
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { ensureUserDocuments, updateUserProfileRecord } from '../firebase/repository';
import type { UserPrivate, UserProfile } from '../types/story';
import { isAdminAccount } from '../utils/storyUtils';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  privateInfo: UserPrivate | null;
  isAdmin: boolean;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  signOutUser: () => Promise<void>;
  saveProfile: (updates: {
    displayName: string;
    handle: string;
    bio: string;
    photoURL: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<UserPrivate | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthError(null);

      if (!firebaseUser) {
        setProfile(null);
        setPrivateInfo(null);
        setAuthReady(true);
        return;
      }

      if (!firebaseUser.emailVerified) {
        setProfile(null);
        setPrivateInfo(null);
        setAuthReady(true);
        return;
      }

      try {
        const docs = await ensureUserDocuments(firebaseUser);
        setProfile(docs.profile);
        setPrivateInfo(docs.privateInfo);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load user profile.';
        setAuthError(message);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Sign-in failed.';
      if (raw.includes('auth/operation-not-allowed')) {
        setAuthError(
          'Email/Password sign-in is not enabled in Firebase Authentication yet. Enable it in Firebase Console or use Continue with Google.'
        );
      } else if (
        raw.includes('auth/invalid-credential') ||
        raw.includes('auth/wrong-password') ||
        raw.includes('auth/user-not-found')
      ) {
        setAuthError('Invalid email or password. Make sure the account exists in Firebase Authentication.');
      } else {
        setAuthError(raw);
      }
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to send verification email.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signOut(auth);
      setProfile(null);
      setPrivateInfo(null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-out failed.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const saveProfile = useCallback(
    async (updates: { displayName: string; handle: string; bio: string; photoURL: string }) => {
      if (!user) {
        throw new Error('Sign in to update your profile.');
      }
      await updateUserProfileRecord(user.uid, updates);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              displayName: updates.displayName.trim(),
              handle: updates.handle.trim(),
              bio: updates.bio.trim(),
              photoURL: updates.photoURL.trim(),
              updatedAtMs: Date.now(),
            }
          : prev
      );
    },
    [user]
  );

  const isAdmin = useMemo(
    () => isAdminAccount(user?.email, user?.emailVerified),
    [user?.email, user?.emailVerified]
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      privateInfo,
      isAdmin,
      authReady,
      authLoading,
      authError,
      signInWithGoogle,
      signInWithEmail,
      resendVerificationEmail,
      signOutUser,
      saveProfile,
    }),
    [
      user,
      profile,
      privateInfo,
      isAdmin,
      authReady,
      authLoading,
      authError,
      signInWithGoogle,
      signInWithEmail,
      resendVerificationEmail,
      signOutUser,
      saveProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

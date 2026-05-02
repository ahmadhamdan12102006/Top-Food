import { create } from 'zustand';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  createUser,
  getUser,
  migrateLegacyPhoneUser,
} from '../services/userService';
import { getUserLoyaltyPoints } from '../services/orderService';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (isOpen: boolean) => void;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const buildFallbackUser = (firebaseUser: FirebaseUser): User => ({
  id: firebaseUser.uid,
  name: firebaseUser.displayName || 'مستخدم جديد',
  phone: firebaseUser.phoneNumber || '',
  countryCode: '+970',
  role: 'customer',
  profileImage: firebaseUser.photoURL || null,
  loyaltyPoints: 0,
  addresses: [],
});

const hydrateUserFromAuth = async (firebaseUser: FirebaseUser) => {
  let userData = await getUser(firebaseUser.uid);

  if (userData) {
    return userData;
  }

  if (firebaseUser.phoneNumber) {
    userData = await migrateLegacyPhoneUser({
      authUid: firebaseUser.uid,
      phone: firebaseUser.phoneNumber,
      countryCode: '+970',
    });
  }

  return userData;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAuthModalOpen: false,

  setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  logout: async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));

let authInitialized = false;

export const ensureAuthUserDocument = async (
  firebaseUser: FirebaseUser,
  payload?: Partial<User>
) => {
  const existing = await getUser(firebaseUser.uid);

  if (existing) {
    return existing;
  }

  await createUser(firebaseUser.uid, {
    ...buildFallbackUser(firebaseUser),
    ...payload,
  });

  return (await getUser(firebaseUser.uid)) || buildFallbackUser(firebaseUser);
};

export const initAuthListener = () => {
  if (authInitialized) return;
  authInitialized = true;

  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    try {
      const hydrated = await hydrateUserFromAuth(firebaseUser);
      const baseUser = hydrated || buildFallbackUser(firebaseUser);
      const loyaltyPoints =
        baseUser.role === 'customer'
          ? await getUserLoyaltyPoints(baseUser.id).catch(() => baseUser.loyaltyPoints || 0)
          : baseUser.loyaltyPoints || 0;

      useAuthStore.setState({
        user: {
          ...baseUser,
          loyaltyPoints,
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth hydration error:', error);

      useAuthStore.setState({
        user: buildFallbackUser(firebaseUser),
        isAuthenticated: true,
        isLoading: false,
      });
    }
  });
};

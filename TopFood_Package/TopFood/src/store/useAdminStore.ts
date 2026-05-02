import { create } from 'zustand';
import { getUser } from '../services/userService';
import { ADMIN_PIN } from '../constants';

const ADMIN_SESSION_KEY = 'topfood-admin-session';
const ADMIN_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const isAdminRole = (role?: string | null) =>
  String(role || '')
    .trim()
    .toLowerCase() === 'admin';

interface StoredAdminSession {
  isAuthenticated: boolean;
  userId: string;
  expiresAt: number;
}

interface AdminState {
  isAdminAuthenticated: boolean;
  adminUserId: string | null;
  adminLogin: (params: { pin: string; userId: string }) => Promise<boolean>;
  adminLogout: () => void;
  checkSession: () => Promise<void>;
}

const readStoredSession = (): StoredAdminSession | null => {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredAdminSession;

    if (
      !parsed ||
      parsed.isAuthenticated !== true ||
      !parsed.userId ||
      !parsed.expiresAt
    ) {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }

    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Admin session parse error:', error);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
};

const saveSession = (userId: string) => {
  const payload: StoredAdminSession = {
    isAuthenticated: true,
    userId,
    expiresAt: Date.now() + ADMIN_SESSION_DURATION_MS,
  };

  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(payload));
};

export const useAdminStore = create<AdminState>((set) => ({
  isAdminAuthenticated: false,
  adminUserId: null,

  adminLogin: async ({ pin, userId }) => {
    try {
      if (!userId) return false;
      if (pin !== ADMIN_PIN) return false;

      const latestUser = await getUser(userId);

      if (!latestUser || !isAdminRole(latestUser.role)) {
        return false;
      }

      saveSession(userId);

      set({
        isAdminAuthenticated: true,
        adminUserId: userId,
      });

      return true;
    } catch (error) {
      console.error('Admin login error:', error);
      return false;
    }
  },

  adminLogout: () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    set({
      isAdminAuthenticated: false,
      adminUserId: null,
    });
  },

  checkSession: async () => {
    try {
      const stored = readStoredSession();

      if (!stored) {
        set({
          isAdminAuthenticated: false,
          adminUserId: null,
        });
        return;
      }

      const latestUser = await getUser(stored.userId);

      if (!latestUser || !isAdminRole(latestUser.role)) {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        set({
          isAdminAuthenticated: false,
          adminUserId: null,
        });
        return;
      }

      saveSession(stored.userId);

      set({
        isAdminAuthenticated: true,
        adminUserId: stored.userId,
      });
    } catch (error) {
      console.error('Admin session validation error:', error);
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      set({
        isAdminAuthenticated: false,
        adminUserId: null,
      });
    }
  },
}));

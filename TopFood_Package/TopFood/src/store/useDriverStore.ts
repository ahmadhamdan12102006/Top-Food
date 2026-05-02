import { create } from 'zustand';

interface DriverState {
  isDriverAuthenticated: boolean;
  currentDriverId: string | null;
  currentDriverName: string | null;
  driverLogin: (phone: string, pin: string) => Promise<boolean>;
  driverLogout: () => void;
  checkSession: () => void;
}

export const useDriverStore = create<DriverState>((set) => ({
  isDriverAuthenticated: false,
  currentDriverId: null,
  currentDriverName: null,

  driverLogin: async (phone: string, pin: string) => {
    try {
      const { loginDriverWithPin } = await import('../services/driverService');
      const driver = await loginDriverWithPin(phone, pin);
      
      if (!driver) {
        return false; // Invalid credentials
      }

      sessionStorage.setItem('topfood-driver-auth', driver.id);
      sessionStorage.setItem('topfood-driver-name', driver.name);
      set({
        isDriverAuthenticated: true,
        currentDriverId: driver.id,
        currentDriverName: driver.name,
      });
      return true;
    } catch {
      return false;
    }
  },

  driverLogout: () => {
    sessionStorage.removeItem('topfood-driver-auth');
    sessionStorage.removeItem('topfood-driver-name');
    set({
      isDriverAuthenticated: false,
      currentDriverId: null,
      currentDriverName: null,
    });
  },

  checkSession: () => {
    const driverId = sessionStorage.getItem('topfood-driver-auth');
    const driverName = sessionStorage.getItem('topfood-driver-name');
    if (driverId) {
      set({
        isDriverAuthenticated: true,
        currentDriverId: driverId,
        currentDriverName: driverName,
      });
    }
  },
}));

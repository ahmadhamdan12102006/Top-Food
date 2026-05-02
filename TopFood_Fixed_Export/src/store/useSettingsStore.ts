import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adminGetSettings } from '../services/adminService';
import type { DeliveryArea, SiteSettings } from '../types';

interface SettingsState {
  settings: SiteSettings | null;
  deliveryAreas: DeliveryArea[];
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: null,
      deliveryAreas: [],
      loading: false,
      error: null,

      fetchSettings: async () => {
        set({ loading: true, error: null });
        try {
          const settings = await adminGetSettings();
          if (settings) {
            set({
              settings,
              deliveryAreas: settings.deliveryAreas || [],
              loading: false,
            });
          } else {
            set({ loading: false });
          }
        } catch (error) {
          console.error('Failed to fetch settings:', error);
          set({ error: 'Failed to load settings', loading: false });
        }
      },
    }),
    {
      name: 'topfood-settings',
      partialize: (state) => ({ 
        settings: state.settings,
        deliveryAreas: state.deliveryAreas 
      }),
    }
  )
);

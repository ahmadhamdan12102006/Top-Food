import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem } from '../types';

export interface FrequentOrder {
  hash: string;
  count: number;
  menuItem: MenuItem;
  customization: any;
  lastOrderedAt: number;
}

interface FrequentOrdersState {
  orders: Record<string, FrequentOrder>;
  hasSeenPopup: boolean;
  addOrder: (menuItem: MenuItem, customization: any) => void;
  getTopOrder: () => FrequentOrder | null;
  setHasSeenPopup: (seen: boolean) => void;
}

const generateHash = (itemId: string, customization: any) => {
  const customStr = JSON.stringify({
    bread: customization?.breadType || '',
    ingredients: [...(customization?.ingredients || [])].sort(),
    sauces: [...(customization?.sauces || [])].sort(),
    extras: [...(customization?.extras || [])].sort(),
    removals: [...(customization?.removals || [])].sort(),
  });
  return `${itemId}_${btoa(customStr)}`;
};

export const useFrequentOrdersStore = create<FrequentOrdersState>()(
  persist(
    (set, get) => ({
      orders: {},
      hasSeenPopup: false,
      addOrder: (menuItem, customization) => {
        const hash = generateHash(menuItem.id, customization);
        set((state) => {
          const existing = state.orders[hash];
          return {
            orders: {
              ...state.orders,
              [hash]: {
                hash,
                count: (existing?.count || 0) + 1,
                menuItem,
                customization,
                lastOrderedAt: Date.now(),
              },
            },
          };
        });
      },
      getTopOrder: () => {
        const state = get();
        const ordersArr = Object.values(state.orders);
        if (ordersArr.length === 0) return null;
        
        // Find the most ordered item that has been ordered > 3 times
        const topOrder = ordersArr.reduce((prev, current) => {
          return (prev.count > current.count) ? prev : current;
        });

        return topOrder.count >= 3 ? topOrder : null;
      },
      setHasSeenPopup: (seen) => set({ hasSeenPopup: seen }),
    }),
    {
      name: 'tf-frequent-orders',
    }
  )
);

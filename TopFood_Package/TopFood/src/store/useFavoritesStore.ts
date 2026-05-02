import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem } from '../types';

export interface FavoriteItem {
  id: string; // Unique ID for the favorite entry
  menuItem: MenuItem;
  isCustom?: boolean; // Whether this is a customized meal or just the base item
  customization: {
    breadType?: string;
    ingredients?: string[];
    sauces?: string[];
    extras?: string[];
    removals?: string[];
    notes?: string;
  };
  addedAt: number;
}

interface FavoritesState {
  items: FavoriteItem[];
  addItem: (item: Omit<FavoriteItem, 'id' | 'addedAt'>) => void;
  removeItem: (id: string) => void;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [
            {
              ...item,
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              addedAt: Date.now(),
            },
            ...state.items,
          ],
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      clearFavorites: () => set({ items: [] }),
    }),
    {
      name: 'tf-favorites-storage',
    }
  )
);

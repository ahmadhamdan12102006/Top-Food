import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateCustomization: (cartItemId: string, customization: any) => void;
  clearCart: () => void;
  total: () => number;
}

const generateCartItemId = (baseId: string): string => {
  return `${baseId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const ensureCartItemId = (item: CartItem): CartItem => {
  if (item.cartItemId) return item;

  return {
    ...item,
    cartItemId: generateCartItemId(item.menuItem.id),
  };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          // Check for exact duplicate (same menu item and identical customization)
          const existingItemIndex = state.items.findIndex(
            (i) => 
              i.menuItem.id === item.menuItem.id &&
              JSON.stringify(i.customization || {}) === JSON.stringify(item.customization || {}) &&
              i.subtotal === item.subtotal
          );

          if (existingItemIndex >= 0) {
            // Merge item by increasing quantity
            const newItems = [...state.items];
            newItems[existingItemIndex] = {
              ...newItems[existingItemIndex],
              quantity: newItems[existingItemIndex].quantity + item.quantity,
            };
            return { items: newItems };
          }

          // Not a duplicate, add as new
          const cartItem = ensureCartItemId(item);
          return {
            items: [...state.items, cartItem],
          };
        }),

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter(
            (item) => (item.cartItemId ?? item.menuItem.id) !== cartItemId
          ),
        })),

      updateQuantity: (cartItemId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            (item.cartItemId ?? item.menuItem.id) === cartItemId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          ),
        })),

      updateCustomization: (cartItemId, customization) =>
        set((state) => ({
          items: state.items.map((item) =>
            (item.cartItemId ?? item.menuItem.id) === cartItemId
              ? { ...item, customization }
              : item
          ),
        })),

      clearCart: () => set({ items: [] }),

      total: () => {
        return get().items.reduce(
          (acc, item) => acc + item.subtotal * item.quantity,
          0
        );
      },
    }),
    {
      name: 'topfood-cart-storage',
      version: 2,
      migrate: (persistedState: any) => {
        if (!persistedState?.items || !Array.isArray(persistedState.items)) {
          return { items: [] };
        }

        return {
          ...persistedState,
          items: persistedState.items.map((item: CartItem) => ensureCartItemId(item)),
        };
      },
    }
  )
);
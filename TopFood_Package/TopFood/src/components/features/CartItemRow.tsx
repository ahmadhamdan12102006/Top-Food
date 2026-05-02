import React, { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

import type { CartItem } from '../../types';
import { useCartStore } from '../../store/useCartStore';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatCurrency } from '../../utils';
import { useCartFx } from '../animations/CartFxProvider';

interface CartItemRowProps {
  item: CartItem;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item }) => {
  const { updateQuantity, removeItem } = useCartStore();
  const { addItem: addFavorite } = useFavoritesStore();
  const user = useAuthStore((s) => s.user);
  const { flyToTrash } = useCartFx();

  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const trashButtonRef = useRef<HTMLButtonElement | null>(null);

  const cartItemId = item.cartItemId ?? item.menuItem.id;

  const customizationSummary = useMemo(() => {
    const parts: string[] = [];

    if (item.customization?.breadType) {
      parts.push(item.customization.breadType);
    }

    if (item.customization?.ingredients?.length) {
      parts.push(`مكونات (${item.customization.ingredients.length})`);
    }

    if (item.customization?.extras?.length) {
      parts.push(`إضافات (${item.customization.extras.length})`);
    }

    if (item.customization?.removals?.length) {
      parts.push(`بدون (${item.customization.removals.length})`);
    }

    return parts.join('، ');
  }, [item.customization]);

  const handleDecrease = async () => {
    await flyToTrash({
      sourceEl: imageWrapRef.current,
      targetEl: trashButtonRef.current,
      imageSrc: item.menuItem.images?.[0],
      emoji: '🍔',
    });

    if (item.quantity <= 1) {
      removeItem(cartItemId);
    } else {
      updateQuantity(cartItemId, item.quantity - 1);
    }
  };

  const handleIncrease = () => {
    updateQuantity(cartItemId, item.quantity + 1);
  };

  const handleRemove = async () => {
    await flyToTrash({
      sourceEl: imageWrapRef.current,
      targetEl: trashButtonRef.current,
      imageSrc: item.menuItem.images?.[0],
      emoji: '🗑️',
    });

    removeItem(cartItemId);
  };

  const handleAddToFavorites = () => {
    if (!user) {
      toast('سجل دخولك أولاً لحفظ الوجبة', { icon: '❤️' });
      return;
    }

    addFavorite({
      menuItem: item.menuItem,
      isCustom: !!item.customization,
      customization: item.customization || {},
    });

    toast.success('تم حفظ الوجبة في مفضلتك', { icon: '❤️' });
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-surface-dark sm:flex-row">
      <Link
        to={`/menu/${item.menuItem.id}`}
        className="flex w-full min-w-0 items-center gap-4 sm:flex-1"
      >
        <div ref={imageWrapRef} className="shrink-0">
          <img
            src={item.menuItem.images?.[0] || '/favicon.svg'}
            alt={item.menuItem.name}
            className="h-16 w-16 rounded-xl bg-gray-100 object-cover dark:bg-gray-800"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold transition hover:text-primary-dark">
            {item.menuItem.name}
          </h3>

          {customizationSummary ? (
            <span className="mt-1 inline-block text-sm text-gray-500 opacity-80 hover:underline dark:text-gray-400">
              {customizationSummary}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="mt-4 flex w-full items-center justify-between gap-4 sm:mt-0 sm:w-auto">
        <div className="flex shrink-0 items-center rounded-full border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-black">
          <button
            onClick={handleDecrease}
            className="flex h-10 w-10 items-center justify-center text-gray-600 transition hover:text-primary-dark dark:text-gray-400"
          >
            <Minus size={16} />
          </button>

          <span className="w-8 text-center text-lg font-bold">{item.quantity}</span>

          <button
            onClick={handleIncrease}
            className="flex h-10 w-10 items-center justify-center text-gray-600 transition hover:text-primary-dark dark:text-gray-400"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="min-w-[78px] whitespace-nowrap text-left text-lg font-black text-primary-dark">
          {formatCurrency(item.subtotal * item.quantity)}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleAddToFavorites}
            className="shrink-0 rounded-full p-3 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
            title="حفظ في المفضلة"
          >
            <Heart size={20} />
          </button>
          
          <button
            ref={trashButtonRef}
            onClick={handleRemove}
            className="shrink-0 rounded-full p-3 text-gray-400 hover:text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
            title="حذف من السلة"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItemRow;

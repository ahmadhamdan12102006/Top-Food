import React, { useRef } from 'react';
import type { MenuItem } from '../../types';
import Button from '../common/Button';
import { formatCurrency } from '../../utils';
import { Star } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCartFx } from '../animations/CartFxProvider';

interface MenuCardProps {
  item: MenuItem;
  unavailableIngredients?: string[];
}

const MenuCard: React.FC<MenuCardProps> = ({
  item,
  unavailableIngredients = [],
}) => {
  const addItem = useCartStore((state) => state.addItem);
  const { isAuthenticated, setAuthModalOpen } = useAuthStore();
  const { flyToCart } = useCartFx();
  const imageRef = useRef<HTMLDivElement | null>(null);
  const shortageMessage =
    unavailableIngredients.length > 0
      ? `غير متوفر حاليًا: ${unavailableIngredients.join('، ')}`
      : '';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!item.isAvailable) return;

    if (!isAuthenticated) {
      setAuthModalOpen(true);
      toast('سجّل دخولك أولًا حتى تضيف للسلة', { icon: '🔐' });
      return;
    }

    addItem({
      menuItem: item,
      quantity: 1,
      subtotal: item.price,
      customization: {},
    });

    flyToCart({
      sourceEl: imageRef.current,
      imageSrc: item.images?.[0],
      emoji: '🍔',
    });

    toast.success('تمت الإضافة للسلة', {
      icon: '✅',
    });
  };

  return (
    <div className="relative group h-full">
      <Link to={`/menu/${item.id}`} className="block h-full">
        <div
          className={`h-full bg-white dark:bg-black rounded-[20px] sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-all flex flex-col ${!item.isAvailable ? 'grayscale opacity-70' : ''
            }`}
        >
          <div
            ref={imageRef}
            className="relative h-28 sm:h-40 md:h-44 bg-gray-100 dark:bg-gray-800 overflow-hidden"
          >
            <img
              src={item.images[0] || ''}
              alt={item.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            />

            {!item.isAvailable && (
              <div className="absolute inset-0 bg-white/40 dark:bg-black/40 flex items-center justify-center z-10 backdrop-blur-[2px]">
                <span className="bg-status-error text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-lg">
                  غير متوفر
                </span>
              </div>
            )}

            {item.rating > 0 && (
              <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-md">
                <Star size={11} className="text-primary-main fill-primary-main" />
                <span>{item.rating}</span>
              </div>
            )}
          </div>

          <div className="p-2.5 sm:p-4 flex flex-col flex-grow">
            <h3 className="font-black text-[14px] sm:text-[17px] leading-6 line-clamp-1 mb-1">
              {item.name}
            </h3>

            <p className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-grow">
              {item.description}
            </p>

            {shortageMessage && (
              <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-6 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                {shortageMessage}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-2">
              <span className="font-black text-[13px] sm:text-xl text-primary-dark leading-none">
                {formatCurrency(item.price)}
              </span>

              <motion.div whileTap={item.isAvailable ? { scale: 0.92 } : {}}>
                <Button
                  onClick={handleAddToCart}
                  disabled={!item.isAvailable}
                  className={`flex items-center justify-center text-sm font-black min-w-[34px] h-[34px] sm:min-w-[42px] sm:h-[42px] px-0 rounded-full ${!item.isAvailable
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300'
                      : 'bg-primary-main text-black hover:bg-primary-dark'
                    }`}
                >
                  +
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default MenuCard;

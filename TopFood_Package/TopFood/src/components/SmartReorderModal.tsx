import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Plus, Minus } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import type { FrequentOrder } from '../store/useFrequentOrdersStore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Button from './common/Button';

interface SmartReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: FrequentOrder;
}

const formatCurrency = (n: number) => `₪${n}`;

const SmartReorderModal: React.FC<SmartReorderModalProps> = ({ isOpen, onClose, order }) => {
  const [quantity, setQuantity] = React.useState(1);
  const addToCart = useCartStore((state) => state.addItem);
  const navigate = useNavigate();

  if (!isOpen || !order) return null;

  const { menuItem, customization } = order;

  const customizationExtrasTotal = customization.extras?.reduce((sum: number, extraName: string) => {
    const extra = menuItem.customizationOptions?.extras?.find(e => e.name === extraName);
    return sum + (extra ? extra.price : 0);
  }, 0) || 0;

  const finalPrice = menuItem.price + customizationExtrasTotal;
  const totalPrice = finalPrice * quantity;

  const handleQuickAdd = () => {
    addToCart({
      menuItem,
      quantity,
      subtotal: finalPrice,
      customization,
    });
    toast.success('تمت إضافة وجبتك المعتادة للسلة بنجاح!', { icon: '🍔' });
    onClose();
    navigate('/cart');
  };

  const handleEdit = () => {
    onClose();
    navigate(`/menu/${menuItem.id}`);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-surface-dark border border-primary-main/20"
        >
          <div className="absolute top-0 right-0 left-0 h-32 bg-gradient-to-b from-primary-main/20 to-transparent pointer-events-none" />
          
          <button
            onClick={onClose}
            className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-gray-500 hover:bg-black/20 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20"
          >
            <X size={18} />
          </button>

          <div className="p-6 pt-10 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-main/10 text-primary-main shadow-inner">
              <Heart size={40} className="fill-primary-main" />
            </div>

            <h2 className="mb-2 text-2xl font-black text-gray-900 dark:text-white">
              زي كل مرة؟
            </h2>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 font-medium">
              لاحظنا إنك بتحب هالطلب، جهزناه الك مع كل تفاصيلك اللي بتحبها!
            </p>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-right dark:border-gray-800 dark:bg-black/20 mb-6">
              <div className="flex gap-3 items-center border-b border-gray-200 dark:border-gray-800 pb-3 mb-3">
                <img src={menuItem.images?.[0] || '/favicon.svg'} alt={menuItem.name} className="w-16 h-16 rounded-xl object-cover" />
                <div>
                  <h3 className="font-bold text-lg">{menuItem.name}</h3>
                  <p className="text-primary-main font-black">{formatCurrency(finalPrice)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-bold">تفاصيل طلبك المعتاد:</p>
                <div className="flex flex-wrap gap-1">
                  {customization.breadType && (
                    <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold">
                      {customization.breadType}
                    </span>
                  )}
                  {customization.extras?.map((e: string) => (
                    <span key={e} className="bg-primary-main/10 text-primary-main text-[10px] px-1.5 py-0.5 rounded font-bold">
                      + {e}
                    </span>
                  ))}
                  {customization.removals?.map((r: string) => (
                    <span key={r} className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold line-through">
                      {r.replace('بدون ', '')}
                    </span>
                  ))}
                  {(!customization.extras?.length && !customization.removals?.length && !customization.breadType) && (
                    <span className="text-sm text-gray-400">الوجبة الأساسية بدون تعديلات</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex h-12 items-center overflow-hidden rounded-full border border-gray-300 bg-white dark:border-gray-700 dark:bg-black">
                <button
                  onClick={() => quantity > 1 && setQuantity(q => q - 1)}
                  className="flex h-full w-12 items-center justify-center text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  <Minus size={20} />
                </button>
                <div className="w-10 text-center text-lg font-bold">{quantity}</div>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="flex h-full w-12 items-center justify-center text-primary-dark transition hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleQuickAdd} className="flex-1 text-lg shadow-lg">
                أضف للسلة ({formatCurrency(totalPrice)})
              </Button>
              <Button onClick={handleEdit} variant="outline" className="flex-1 text-gray-600">
                حاب أغير
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SmartReorderModal;

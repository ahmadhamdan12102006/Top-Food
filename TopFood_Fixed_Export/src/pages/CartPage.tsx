import React from 'react';
import { Link } from 'react-router-dom';
import { Frown } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { formatCurrency } from '../utils';
import Button from '../components/common/Button';
import CartItemRow from '../components/features/CartItemRow';

const CartPage: React.FC = () => {
  const { items, total } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Frown size={80} className="text-gray-300 dark:text-gray-700 mb-6" />
        <h1 className="text-3xl font-black mb-2">سلتك فاضية! 🛒</h1>
        <p className="text-gray-500 text-lg mb-8">روح اختار من المطبخ شي بتحبه</p>
        <Link to="/menu">
          <Button className="text-lg px-8 py-3 rounded-full shadow-lg">
            روح للمطبخ
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-black mb-8">سلة المشتريات</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-4">
          {items.map((item) => (
            <CartItemRow
              key={item.cartItemId ?? item.menuItem.id}
              item={item}
            />
          ))}
        </div>

        <div className="w-full lg:w-96">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 lg:sticky lg:top-24">
            <h2 className="text-xl font-bold mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
              ملخص الطلب
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                <span>المجموع الفرعي</span>
                <span className="font-semibold">{formatCurrency(total())}</span>
              </div>

              <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                <span>رسوم التوصيل</span>
                <span className="text-sm">يُحدد حسب المنطقة</span>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mb-8 flex justify-between items-center">
              <span className="text-xl font-black">المجموع</span>
              <span className="text-3xl font-black text-primary-dark">
                {formatCurrency(total())}
              </span>
            </div>

            <Link to="/checkout" className="block w-full">
              <Button className="w-full text-lg py-4 rounded-xl shadow-md">
                أكمل الطلب
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
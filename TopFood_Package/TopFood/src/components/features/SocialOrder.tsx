import React, { useEffect, useState } from 'react';
import { ShoppingBag, User } from 'lucide-react';
import { getRecentOrders } from '../../services/orderService';
import type { Order } from '../../types';
import { useCartStore } from '../../store/useCartStore';
import Button from '../common/Button';
import toast from 'react-hot-toast';

const SocialOrder: React.FC = () => {
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();

  useEffect(() => {
    const fetchLastOrder = async () => {
      try {
        const orders = await getRecentOrders(1);
        if (orders.length > 0) {
          setLastOrder(orders[0]);
        }
      } catch (error) {
        console.error('Failed to fetch last order:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLastOrder();
  }, []);

  const handleOrderAgain = () => {
    if (!lastOrder) return;
    
    lastOrder.items.forEach(item => {
      addItem({
        menuItem: item.menuItem,
        quantity: item.quantity,
        subtotal: item.subtotal,
        customization: item.customization
      });
    });
    
    toast.success('تمت إضافة طلب الزبون السابق إلى سلتك! 🎉', {
      duration: 4000,
      icon: '🛒'
    });
  };

  if (loading || !lastOrder) return null;

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-l from-black to-gray-900 p-8 text-white shadow-2xl">
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary-main/10 blur-3xl" />
      
      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-primary-main backdrop-blur-sm">
            <User size={18} />
            <span className="text-sm font-black">طلب الزبون الذي قبلك</span>
          </div>
          <h2 className="mb-4 text-3xl font-black sm:text-4xl">
            شو <span className="text-primary-main">طلب</span> اللي قبلك؟ 🤔
          </h2>
          <p className="mb-6 text-lg font-bold text-gray-400">
            أحياناً الخيارات الصعبة حلها بسيط.. شوف شو طلب غيرك وجرب ذوقهم!
          </p>
          
          <div className="flex flex-wrap gap-4">
            {lastOrder.items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 pr-4 backdrop-blur-md border border-white/10">
                <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/20">
                  <img src={item.menuItem.images?.[0] || '/favicon.svg'} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black truncate max-w-[120px]">{item.menuItem.name}</span>
                  <span className="text-xs text-primary-main font-bold">×{item.quantity}</span>
                </div>
              </div>
            ))}
            {lastOrder.items.length > 3 && (
              <div className="flex items-center justify-center rounded-2xl bg-white/5 px-4 backdrop-blur-md border border-white/10">
                <span className="text-sm font-black">+{lastOrder.items.length - 3} أصناف أخرى</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-4 text-center lg:items-end">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex -space-x-2 overflow-hidden">
               {[1,2,3].map(i => (
                <div key={i} className="h-8 w-8 rounded-full ring-2 ring-black bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                   U{i}
                 </div>
               ))}
            </div>
            <span className="text-sm font-bold text-gray-400">نفس ذوقك وأكثر</span>
          </div>
          <Button 
            onClick={handleOrderAgain}
            className="h-16 px-12 text-xl font-black shadow-2xl shadow-primary-main/20"
          >
            طلب نفس الطلب
            <ShoppingBag className="mr-2" size={24} />
          </Button>
          <p className="text-sm font-bold text-gray-500">تم الطلب منذ {Math.floor((Date.now() - Number(lastOrder.createdAt)) / 60000)} دقيقة</p>
        </div>
      </div>
    </section>
  );
};

export default SocialOrder;

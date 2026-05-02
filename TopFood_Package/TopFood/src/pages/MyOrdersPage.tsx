import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardList, ChevronRight, Loader2, Package, Clock, Truck, CheckCircle2, XCircle, ShoppingBag } from 'lucide-react';
import { getUserOrders } from '../services/orderService';
import { useAuthStore } from '../store/useAuthStore';
import type { Order } from '../types';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'قيد الانتظار', color: 'text-yellow-500 bg-yellow-500/10', icon: Clock },
  preparing: { label: 'جاري التحضير', color: 'text-blue-500 bg-blue-500/10', icon: Package },
  ready_for_pickup: { label: 'جاهز للاستلام', color: 'text-purple-500 bg-purple-500/10', icon: ShoppingBag },
  on_the_way: { label: 'في الطريق', color: 'text-primary-main bg-primary-main/10', icon: Truck },
  delivered: { label: 'تم التوصيل', color: 'text-green-500 bg-green-500/10', icon: CheckCircle2 },
  cancelled: { label: 'ملغي', color: 'text-red-500 bg-red-500/10', icon: XCircle },
};

const formatCurrency = (n: number) => `₪${n}`;

const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);
  const setAuthModalOpen = useAuthStore(s => s.setAuthModalOpen);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    getUserOrders(user.id)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('ar-PS', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <ClipboardList size={64} className="text-primary-main opacity-50" />
        <h2 className="text-2xl font-black">طلباتي</h2>
        <p className="text-white/50 font-medium">سجل دخول لمشاهدة طلباتك</p>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="bg-primary-main text-black font-bold px-8 py-3 rounded-2xl hover:bg-primary-dark transition"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-main" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 max-w-2xl mx-auto pb-8">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList size={28} className="text-primary-main" />
        <h1 className="text-2xl font-black">طلباتي</h1>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-primary-main/10 flex items-center justify-center">
            <ClipboardList size={36} className="text-primary-main" />
          </div>
          <p className="text-lg font-bold">مفيش طلبات لسا</p>
          <p className="text-white/40 font-medium text-sm">اطلب أول وجبة من المنيو!</p>
          <Link to="/menu" className="bg-primary-main text-black font-bold px-8 py-3 rounded-2xl hover:bg-primary-dark transition">
            تصفح المنيو
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => {
            const cfg = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={order.status !== 'delivered' && order.status !== 'cancelled' ? '/track-order' : '#'}
                  className="block rounded-2xl bg-white dark:bg-[#1c1c22] border border-gray-100 dark:border-white/6 p-4 hover:border-primary-main/20 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <ChevronRight size={18} className="text-white/20" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-primary-main">
                        {order.orderNumber || `#${order.id.slice(-4)}`}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${cfg.color}`}>
                        <StatusIcon size={12} />
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary-main font-black">{formatCurrency(order.total)}</span>
                    <div className="text-right">
                      <p className="text-xs text-white/40 font-medium">{formatDate(order.createdAt)}</p>
                      <p className="text-xs text-white/30">{order.items.length} أصناف</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, 
  Printer, 
  Bell, 
  Store, 
  Clock3, 
  ArrowRight,
  User as UserIcon,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  Hash,
  ClipboardList,
  Trash2
} from 'lucide-react';
import { ORDER_STATUS_MAP } from '../../constants';
import { formatCurrency } from '../../utils';
import type { Order, OrderStatus, User } from '../../types';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../../store/useNotificationStore';
import {
  subscribeToAllOrders,
  adminUpdateOrderStatus,
  adminAssignDriver,
  adminDeleteOrder,
  adminDeleteAllOrders
} from '../../services/adminService';
import { getUser } from '../../services/userService';

const ALL_STATUSES: { key: string; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'قيد الانتظار' },
  { key: 'preparing', label: 'قيد التحضير' },
  { key: 'ready_for_pickup', label: 'جاهز للاستلام' },
  { key: 'on_the_way', label: 'في الطريق' },
  { key: 'delivered', label: 'تم التوصيل' },
  { key: 'cancelled', label: 'ملغي' },
];

const DELIVERY_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'preparing',
  'on_the_way',
  'delivered',
];

const PICKUP_STATUS_FLOW: OrderStatus[] = ['pending', 'ready_for_pickup'];

const normalizeTimestamp = (timestamp: number | string | Date): number => {
  if (typeof timestamp === 'number') return timestamp;
  const parsed = new Date(timestamp).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const ManageOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [orderUsers, setOrderUsers] = useState<Record<string, User | null>>({});
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const prevLatestOrderTime = useRef<number>(0);
  const hasInitialized = useRef(false);

  const addNotification = useNotificationStore((state) => state.addNotification);

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const { getAllDrivers } = await import('../../services/driverService');
      const data = await getAllDrivers();
      setDrivers(
        Array.isArray(data)
          ? data
            .filter((driver) => driver.isActive !== false)
            .map((driver) => ({ id: driver.id, name: driver.name }))
          : []
      );
    } catch (error) {
      console.error('Failed to load drivers', error);
      setDrivers([]);
    }
  };

  useEffect(() => {
    let isFirstSnapshot = true;

    const unsubscribe = subscribeToAllOrders((data) => {
      const safeOrders = Array.isArray(data) ? data : [];
      const latestOrder = safeOrders[0];

      if (latestOrder) {
        const latestTime = normalizeTimestamp(latestOrder.createdAt);

        if (!hasInitialized.current) {
          prevLatestOrderTime.current = latestTime;
          hasInitialized.current = true;
        } else if (!isFirstSnapshot && latestTime > prevLatestOrderTime.current) {
          const orderLabel = latestOrder.orderNumber || latestOrder.id;
          const customerName = latestOrder.customerName || 'زبون جديد';

          toast.custom(
            (t) => (
              <div
                className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-surface-dark shadow-2xl rounded-2xl pointer-events-auto border border-yellow-300 dark:border-yellow-800 overflow-hidden`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                      <Bell className="text-yellow-600 dark:text-yellow-400" size={22} />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="font-black text-lg text-black dark:text-white">في طلب جديد</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{customerName}</p>
                      <p className="text-sm font-bold text-primary-dark mt-2">رقم الطلب: {orderLabel}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/10 px-4 py-2 text-xs font-semibold text-yellow-800 dark:text-yellow-400 text-center">
                  تم استلام طلب جديد ويحتاج متابعة
                </div>
              </div>
            ),
            { duration: 7000, position: 'top-center' }
          );

          addNotification({
            title: 'في طلب جديد',
            message: `وصل طلب جديد من ${customerName} — رقم الطلب: ${orderLabel}`,
            type: 'general',
            icon: 'bell'
          });
        }
        prevLatestOrderTime.current = Math.max(prevLatestOrderTime.current, latestTime);
      }

      isFirstSnapshot = false;
      setOrders(safeOrders);
    });

    return () => unsubscribe();
  }, [addNotification]);

  useEffect(() => {
    if (!selectedOrderId) return;
    const targetOrder = orders.find(o => o.id === selectedOrderId);
    if (!targetOrder?.userId || orderUsers[targetOrder.userId] !== undefined) return;

    getUser(targetOrder.userId)
      .then(user => {
        setOrderUsers(prev => ({ ...prev, [targetOrder.userId as string]: user }));
      })
      .catch(err => {
        console.error('Failed to load user', err);
        setOrderUsers(prev => ({ ...prev, [targetOrder.userId as string]: null }));
      });
  }, [selectedOrderId, orders, orderUsers]);

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const getNextStatus = (order: Order): OrderStatus | null => {
    const isPickup = order.fulfillmentType === 'pickup';
    const flow = isPickup ? PICKUP_STATUS_FLOW : DELIVERY_STATUS_FLOW;
    const idx = flow.indexOf(order.status);
    if (idx === -1 || idx === flow.length - 1) return null;
    return flow[idx + 1];
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const order = orders.find(o => o.id === orderId);
      await adminUpdateOrderStatus(orderId, newStatus, order?.userId);
      toast.success('تم تحديث حالة الطلب');
    } catch (error) {
      console.error('Status update error', error);
      const errorMessage = error?.message || 'فشل تحديث حالة الطلب';
      toast.error(`خطأ: ${errorMessage}`);
    }
  };

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    try {
      await adminAssignDriver(orderId, driverId || null);
      toast.success(driverId ? 'تم تعيين السائق' : 'تم إلغاء تعيين السائق');
    } catch (error) {
      console.error('Driver assign error', error);
      toast.error('فشل تعيين السائق');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (deletingOrderId) return; // Prevent double click
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    setDeletingOrderId(orderId);
    
    try {
      await adminDeleteOrder(orderId);
      toast.success('تم حذف الطلب بنجاح');
      if (selectedOrderId === orderId) {
        setSelectedOrderId(null);
      }
    } catch (error) {
      console.error('Delete order error', error);
      toast.error('فشل حذف الطلب');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleDeleteAllOrders = async () => {
    if (isDeletingAll) return;
    if (!window.confirm('تحذير! هل أنت متأكد من حذف جميع الطلبات؟ لا يمكن التراجع عن هذه الخطوة.')) return;
    
    setIsDeletingAll(true);
    const loadingToast = toast.loading('جاري حذف جميع الطلبات...');
    try {
      await adminDeleteAllOrders();
      toast.success('تم حذف جميع الطلبات بنجاح', { id: loadingToast });
    } catch (error) {
      console.error('Delete all orders error', error);
      toast.error('فشل حذف الطلبات', { id: loadingToast });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const getTimeAgo = (timestamp: number | string | Date) => {
    const ts = normalizeTimestamp(timestamp);
    if (!ts) return 'غير معروف';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `${days} يوم`;
  };

  const getDriverName = (id?: string | null) => drivers.find(d => d.id === id)?.name || 'غير معروف';

  // Order Details View (Beautiful Card)
  if (selectedOrder) {
    const statusInfo = ORDER_STATUS_MAP[selectedOrder.status] || ORDER_STATUS_MAP.pending;
    const nextStatus = getNextStatus(selectedOrder);
    const isPickup = selectedOrder.fulfillmentType === 'pickup';
    const customer = selectedOrder.userId ? orderUsers[selectedOrder.userId] : null;
    const isLocked = selectedOrder.status === 'on_the_way' || selectedOrder.status === 'delivered';

    return (
      <div className="admin-page animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="mb-6 flex items-center justify-between">
          <button 
            onClick={() => setSelectedOrderId(null)}
            className="flex items-center gap-2 font-bold text-gray-500 hover:text-primary-main transition-colors"
          >
            <ArrowRight size={20} />
            الرجوع لقائمة الطلبات
          </button>
          
          <div className="flex items-center gap-3">
             <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition"
            >
              <Printer size={18} />
              طباعة
            </button>
            
            <button 
              onClick={() => handleDeleteOrder(selectedOrder.id)}
              className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition"
            >
              <Trash2 size={18} />
              حذف
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Detail Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="admin-card overflow-hidden !p-0">
              <div className="bg-gradient-to-r from-primary-main to-primary-dark p-6 text-white">
                <div className="flex justify-between items-start mb-4">
                   <div>
                    <h2 className="text-2xl font-black mb-1">تفاصيل الطلب #{selectedOrder.orderNumber || selectedOrder.id.slice(-6)}</h2>
                    <p className="opacity-80 font-medium flex items-center gap-2">
                      <Clock3 size={16} />
                      {new Date(normalizeTimestamp(selectedOrder.createdAt)).toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full font-black text-sm">
                    {statusInfo.label}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* Items Section */}
                <div>
                  <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                    <FileText size={20} className="text-primary-main" />
                    الوجبات المطلوبة
                  </h3>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                          <img 
                            src={item.menuItem.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'} 
                            alt={item.menuItem.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-black text-lg">{item.menuItem.name}</h4>
                            <span className="font-black text-primary-dark">x{item.quantity}</span>
                          </div>
                          
                          {/* Customizations */}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.customization?.breadType && (
                              <span className="text-[11px] bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                                الخبز: {item.customization.breadType}
                              </span>
                            )}
                            {item.customization?.ingredients?.map((ing, i) => (
                              <span key={i} className="text-[11px] bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                {ing}
                              </span>
                            ))}
                            {item.customization?.sauces?.map((sauce, i) => (
                              <span key={`sauce-${i}`} className="text-[11px] bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                                صوص: {sauce}
                              </span>
                            ))}
                            {item.customization?.extras?.map((extra, i) => (
                              <span key={`extra-${i}`} className="text-[11px] bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-lg border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                                إضافة: {extra}
                              </span>
                            ))}
                            {item.customization?.removals?.map((removal, i) => (
                              <span key={`removal-${i}`} className="text-[11px] bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                                بدون: {removal}
                              </span>
                            ))}
                            {item.customization?.without?.map((removal, i) => (
                              <span key={`without-${i}`} className="text-[11px] bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                                بدون: {removal}
                              </span>
                            ))}
                            {item.customization?.notes && (
                              <p className="w-full text-xs text-amber-600 dark:text-amber-400 mt-2 italic">
                                * ملاحظة: {item.customization.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-left font-black">
                          {formatCurrency(item.menuItem.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Table */}
                <div className="border-t dark:border-white/10 pt-6">
                  <div className="space-y-2 max-w-xs ms-auto text-left">
                    <div className="flex justify-between text-gray-500">
                      <span>المجموع الفرعي:</span>
                      <span>{formatCurrency(selectedOrder.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>رسوم التوصيل:</span>
                      <span>{formatCurrency(selectedOrder.deliveryFee || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-black text-primary-dark pt-2 border-t dark:border-white/5">
                      <span>الإجمالي:</span>
                      <span>{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="admin-card flex items-center justify-between gap-4">
               <div className="flex items-center gap-4 flex-1">
                {nextStatus && (
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, nextStatus)}
                    className="flex-1 bg-primary-main hover:bg-primary-dark text-white font-black py-4 rounded-2xl transition shadow-lg shadow-primary-main/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} />
                    نقل الطلب لـ ({ORDER_STATUS_MAP[nextStatus]?.label})
                  </button>
                )}
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'cancelled')}
                    className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 font-black px-8 py-4 rounded-2xl transition"
                  >
                    إلغاء الطلب
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Customer & Delivery Sidebar */}
          <div className="space-y-6">
             <div className="admin-card">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                <UserIcon size={20} className="text-primary-main" />
                معلومات الزبون
              </h3>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary-main/10 flex items-center justify-center border-2 border-primary-main/20">
                  {customer?.profileImage ? (
                    <img src={customer.profileImage} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-primary-main">
                      {(customer?.name || selectedOrder.customerName || 'ز').charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-black text-lg">{customer?.name || selectedOrder.customerName || 'زبون'}</h4>
                  <p className="text-gray-500 text-sm">{getTimeAgo(selectedOrder.createdAt)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                  <Phone size={18} className="text-gray-400" />
                  <span className="font-bold" dir="ltr">{selectedOrder.customerPhone || '-'}</span>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                  <MapPin size={18} className="text-gray-400 mt-1 shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold mb-1">{isPickup ? 'استلام من المطعم' : selectedOrder.deliveryAddress?.label}</p>
                    {!isPickup && <p className="text-gray-500 leading-relaxed">{selectedOrder.deliveryAddress?.details}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-card">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                <Truck size={20} className="text-primary-main" />
                معلومات التوصيل
              </h3>
              
              {!isPickup ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 mb-2 font-bold">السائق المسؤول:</p>
                  
                  {isLocked ? (
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 text-green-700 dark:text-green-400 flex items-center gap-3">
                      <Truck size={20} />
                      <span className="font-black text-lg">{getDriverName(selectedOrder.assignedDriverId)}</span>
                      <CheckCircle2 size={16} className="ms-auto" />
                    </div>
                  ) : (
                    <select
                      value={selectedOrder.assignedDriverId || ''}
                      onChange={(e) => handleAssignDriver(selectedOrder.id, e.target.value)}
                      className="admin-input w-full font-bold"
                    >
                      <option value="">-- اختر سائقاً --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                  
                  {selectedOrder.driverNotes && (
                    <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-bold mb-1">ملاحظات السائق:</p>
                      <p className="text-sm">{selectedOrder.driverNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 text-center">
                  <Store size={40} className="mx-auto mb-3 text-blue-500" />
                  <p className="font-black text-blue-700 dark:text-blue-300 text-lg">استلام مباشر</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">الزبون سيأتي لاستلام الطلب بنفسه</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Orders List View
  return (
    <div className="admin-page">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black mb-2">إدارة الطلبات</h1>
          <p className="text-gray-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-main animate-pulse"></span>
            يوجد {orders.length} طلب إجمالي في النظام
          </p>
        </div>

        <button 
          onClick={handleDeleteAllOrders}
          className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 px-6 py-3 rounded-2xl font-black hover:bg-red-100 dark:hover:bg-red-900/20 transition shadow-sm"
        >
          <Trash2 size={20} />
          حذف جميع الطلبات
        </button>
        
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl">
          {ALL_STATUSES.slice(0, 4).map(s => (
             <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
                statusFilter === s.key 
                ? 'bg-white dark:bg-white/10 shadow-md text-primary-main scale-105' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.map((order, index) => {
          const statusInfo = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.pending;
          const isPickup = order.fulfillmentType === 'pickup';
          
          return (
            <motion.div
              key={order.id}
              layoutId={order.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => setSelectedOrderId(order.id)}
              className={`group admin-card hover:border-primary-main/30 cursor-pointer transition-all hover:shadow-2xl hover:shadow-primary-main/5 relative overflow-hidden ${
                order.status === 'pending' ? 'ring-2 ring-yellow-400/50' : ''
              }`}
            >
              {order.status === 'pending' && (
                <div className="absolute top-0 right-0 left-0 h-1 bg-yellow-400 animate-pulse"></div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-main/10 flex items-center justify-center text-primary-main">
                    <Hash size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg line-clamp-1">{order.customerName || 'زبون'}</h3>
                    <p className="text-xs text-gray-500 font-medium">#{order.orderNumber || order.id.slice(-6)}</p>
                  </div>
                </div>
                <span 
                  className="px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider"
                  style={{ background: `${statusInfo.bg}20`, color: statusInfo.color }}
                >
                  {statusInfo.label}
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-2">
                    <MapPin size={14} />
                    المكان
                  </span>
                  <span className="font-bold truncate max-w-[150px]">
                    {isPickup ? 'استلام' : order.deliveryAddress?.label || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Clock3 size={14} />
                    الوقت
                  </span>
                  <span className="font-bold">{getTimeAgo(order.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Truck size={14} />
                    نوع التوصيل
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isPickup ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                    {isPickup ? 'استلام محلي' : 'توصيل للمنزل'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t dark:border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">الإجمالي</p>
                  <p className="text-xl font-black text-primary-dark">{formatCurrency(order.total)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2 rtl:space-x-reverse">
                    {order.items.slice(0, 3).map((item, i) => (
                      <img 
                        key={i}
                        src={item.menuItem.images?.[0]} 
                        className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 object-cover shadow-sm"
                      />
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOrder(order.id);
                    }}
                    className="p-2 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition"
                    title="حذف الطلب"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="absolute bottom-0 right-0 left-0 h-1 bg-primary-main scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-right"></div>
            </motion.div>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <div className="admin-empty py-20 flex flex-col items-center justify-center grayscale opacity-50">
          <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
            <ClipboardList size={40} />
          </div>
          <h3 className="text-xl font-black">لا توجد طلبات</h3>
          <p className="text-gray-500">لا توجد أي طلبات حالية بهذه الحالة</p>
        </div>
      )}
    </div>
  );
};

export default ManageOrdersPage;

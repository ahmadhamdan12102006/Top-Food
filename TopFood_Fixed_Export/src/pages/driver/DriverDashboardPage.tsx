import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  LogOut, 
  RefreshCw, 
  ChevronDown, 
  MapPin, 
  Phone, 
  Navigation,
  Star,
  Users,
  User as UserIcon,
  Sun,
  Moon,
  StickyNote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDriverStore } from '../../store/useDriverStore';
import { 
  subscribeToAvailableOrders, 
  subscribeToMyOrders, 
  acceptOrder, 
  startDelivery, 
  completeDelivery 
} from '../../services/driverService';
import { formatCurrency } from '../../utils';
import type { Order, User, DriverRating } from '../../types';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

type Tab = 'available' | 'my-orders' | 'delivered' | 'balance' | 'customers' | 'ratings';

const DriverDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentDriverId, currentDriverName, driverLogout } = useDriverStore();
  const { isDark, toggleTheme } = useDarkMode();
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myCustomers, setMyCustomers] = useState<User[]>([]);
  const [myRatings, setMyRatings] = useState<DriverRating[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [driverProfile, setDriverProfile] = useState<Driver | null>(null);

  useEffect(() => {
    if (!currentDriverId) return;

    const unsubAvailable = subscribeToAvailableOrders((orders) => {
      setAvailableOrders(orders);
    });

    const unsubMy = subscribeToMyOrders(currentDriverId, (orders) => {
      setMyOrders(orders);
    });

    fetchExtraData();

    return () => {
      unsubAvailable();
      unsubMy();
    };
  }, [currentDriverId]);

  const fetchExtraData = async () => {
    if (!currentDriverId) return;
    try {
      const dSnap = await getDoc(doc(db, 'drivers', currentDriverId));
      if (dSnap.exists()) setDriverProfile(dSnap.data());

      const customersSnap = await getDocs(query(collection(db, 'users'), where('preferredDriverId', '==', currentDriverId)));
      setMyCustomers(customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
      
      const ratingsSnap = await getDocs(query(collection(db, 'driverRatings'), where('driverId', '==', currentDriverId)));
      setMyRatings(ratingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverRating)));
    } catch (error) {
      console.error('Error fetching driver extra data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchExtraData();
    setTimeout(() => setRefreshing(false), 1000);
    toast.success('تم تحديث البيانات');
  };

  const handleLogout = () => {
    driverLogout();
    navigate('/driver');
  };

  const completedDeliveries = useMemo(() => 
    myOrders.filter((o) => o.status === 'delivered'),
    [myOrders]
  );

  const activeDeliveries = useMemo(() => 
    myOrders.filter((o) => o.status === 'on_the_way'),
    [myOrders]
  );

  const waitingOrders = useMemo(() => 
    myOrders.filter((o) => o.status === 'preparing' || o.status === 'ready_for_pickup'),
    [myOrders]
  );

  const isSameDay = (d1: number, d2: number) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const normalizeTimestamp = (ts: number | string | Date): number => {
    if (!ts) return Date.now();
    if (typeof ts === 'number') return ts;
    if (ts.toMillis) return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    return Date.now();
  };

  const todayEarnings = useMemo(() => {
    const now = Date.now();
    return completedDeliveries
      .filter((o) => isSameDay(normalizeTimestamp(o.updatedAt || o.createdAt), now))
      .reduce((sum, o) => sum + Number(o.deliveryFee || 0), 0);
  }, [completedDeliveries]);

  const todayCollected = useMemo(() => {
    const now = Date.now();
    return completedDeliveries
      .filter((o) => isSameDay(normalizeTimestamp(o.updatedAt || o.createdAt), now))
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [completedDeliveries]);

  const totalCollected = useMemo(() => {
    return completedDeliveries.reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [completedDeliveries]);

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    return `قبل ${hours} ساعة`;
  };

  const getOrderAction = (order: Order) => {
    if (activeTab === 'available') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            acceptOrder(order.id, currentDriverId!);
            toast.success('تم قبول الطلب بنجاح');
          }}
          className="w-full bg-primary-main text-black font-black py-3 rounded-2xl shadow-lg shadow-primary-main/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
        >
          <Truck size={18} />
          قبول الطلب
        </button>
      );
    }

    if (order.status === 'preparing' || order.status === 'ready_for_pickup') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            startDelivery(order.id);
            toast.success('تم بدء التوصيل');
          }}
          className="w-full bg-blue-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
        >
          <Navigation size={18} />
          بدء التوصيل
        </button>
      );
    }

    if (order.status === 'on_the_way') {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            completeDelivery(order.id);
            toast.success('تم تسليم الطلب، مبروك!');
          }}
          className="w-full bg-green-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={18} />
          تأكيد التسليم
        </button>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0c] text-gray-900 dark:text-white flex overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-72 border-l border-gray-200 dark:border-gray-800/50 bg-white dark:bg-[#0d0d10] hidden lg:flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-primary-main rounded-2xl flex items-center justify-center shadow-lg shadow-primary-main/20 rotate-3">
              <Truck size={24} className="text-black" />
            </div>
            <div>
              <h1 className="font-black text-2xl tracking-tighter leading-none text-gray-900 dark:text-white">TOP FOOD</h1>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-[0.2em] mt-1">DRIVER PANEL</p>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'available', label: 'الطلبات المتاحة', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { id: 'my-orders', label: 'طلباتي الجارية', icon: Navigation, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { id: 'delivered', label: 'الطلبات المكتملة', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
              { id: 'balance', label: 'الرصيد والحساب', icon: Wallet, color: 'text-purple-500', bg: 'bg-purple-500/10' },
              { id: 'customers', label: 'زبائني المفضلين', icon: Users, color: 'text-rose-500', bg: 'bg-rose-500/10' },
              { id: 'ratings', label: 'تقييمات الزبائن', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-[24px] transition-all duration-300 group ${
                  activeTab === tab.id 
                    ? 'bg-primary-main text-black font-black shadow-xl shadow-primary-main/10 translate-x-1' 
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${activeTab === tab.id ? 'bg-black/10' : tab.bg}`}>
                  <tab.icon size={20} className={activeTab === tab.id ? 'text-black' : tab.color} />
                </div>
                <span className="text-sm font-bold">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-gray-100 dark:border-gray-800/30">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-500/5 transition-all font-black text-sm group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-24 border-b border-gray-200 dark:border-gray-800/20 bg-white/80 dark:bg-[#0a0a0c]/80 backdrop-blur-xl flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/driver/settings')}
              className="flex items-center gap-4 p-2 pr-6 rounded-3xl bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/50 hover:border-primary-main/30 hover:bg-white dark:hover:bg-gray-900/50 transition-all group shadow-sm dark:shadow-none"
            >
              <div className="text-right">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-0.5">لوحة السائق</p>
                <p className="text-base font-black text-gray-900 dark:text-white group-hover:text-primary-main transition-colors">{currentDriverName}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-primary-main overflow-hidden shadow-2xl shadow-primary-main/20 relative border-2 border-white dark:border-gray-800 group-hover:border-primary-main/50 transition-colors">
                {driverProfile?.profileImage ? (
                  <img src={driverProfile.profileImage} alt={currentDriverName} className="w-full h-full object-cover scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-black">
                    <Truck size={28} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 dark:bg-gray-900/30 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800/50">
              <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                {!isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button 
                onClick={handleRefresh}
                className={`w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white ${refreshing ? 'animate-spin' : ''}`}
              >
                <RefreshCw size={20} />
              </button>
            </div>
            <button 
              onClick={handleLogout}
              className="lg:hidden w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {/* Top Stats - Modern Horizontal Scroll */}
          <div className="flex gap-5 overflow-x-auto pb-6 mb-8 no-scrollbar">
            {[
              { label: 'طلبات متاحة', value: availableOrders.length, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'في الطريق', value: activeDeliveries.length, icon: Navigation, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'مكتملة اليوم', value: completedDeliveries.filter(o => isSameDay(normalizeTimestamp(o.updatedAt || o.createdAt), Date.now())).length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
              { label: 'بانتظار الانطلاق', value: waitingOrders.length, icon: Clock, color: 'text-rose-500', bg: 'bg-rose-500/10' },
              { label: 'أرباح اليوم', value: formatCurrency(todayEarnings), icon: Wallet, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            ].map((stat, idx) => (
              <div key={idx} className="min-w-[200px] flex-1 bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-gray-800/40 p-6 rounded-[32px] flex flex-col gap-4 hover:border-primary-main/20 transition-all group shadow-sm dark:shadow-none">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* Mobile Tab Selector */}
              <div className="lg:hidden flex gap-3 overflow-x-auto mb-8 pb-2 no-scrollbar">
                {[
                  { id: 'available', label: 'المتاحة', icon: Package },
                  { id: 'my-orders', label: 'طلباتي', icon: Navigation },
                  { id: 'delivered', label: 'المكتملة', icon: CheckCircle2 },
                  { id: 'balance', label: 'الرصيد', icon: Wallet },
                  { id: 'customers', label: 'زبائني', icon: Users },
                  { id: 'ratings', label: 'تقييماتي', icon: Star },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as Tab)}
                    className={`px-6 py-4 rounded-[20px] text-xs font-black whitespace-nowrap flex items-center gap-2 transition-all ${
                      activeTab === t.id 
                        ? 'bg-primary-main text-black shadow-2xl shadow-primary-main/20 scale-105' 
                        : 'bg-gray-100 dark:bg-gray-900/50 text-gray-500 border border-gray-200 dark:border-gray-800/50'
                    }`}
                  >
                    <t.icon size={16} />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Lists */}
              {(activeTab === 'available' || activeTab === 'my-orders') && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {(activeTab === 'available' ? availableOrders : myOrders.filter(o => o.status !== 'delivered')).map((order) => {
                    const isExpanded = expandedOrder === order.id;

                    return (
                      <div key={order.id} className="bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-gray-800/40 rounded-[32px] overflow-hidden hover:border-primary-main/20 transition-all duration-300 shadow-sm dark:shadow-none">
                        <div
                          className="p-6 flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center text-primary-main shadow-inner">
                              <Package size={28} />
                            </div>
                            <div>
                              <h3 className="font-black text-lg text-gray-900 dark:text-gray-100 mb-1">{order.customerName}</h3>
                              <div className="flex items-center gap-2">
                                <Clock size={12} className="text-gray-400 dark:text-gray-500" />
                                <span className="text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{getTimeAgo(order.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="font-black text-xl text-primary-main mb-2">{formatCurrency(order.total)}</p>
                            <div className={`w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary-main border-primary-main/30' : ''}`}>
                              <ChevronDown size={20} />
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-6 pb-6 border-t border-gray-100 dark:border-gray-800/20 pt-6 space-y-5"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <a href={`tel:${order.customerPhone}`} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 hover:border-primary-main/30 transition-colors group">
                                  <div className="w-10 h-10 rounded-xl bg-primary-main/10 flex items-center justify-center text-primary-main group-hover:scale-110 transition-transform">
                                    <Phone size={18} />
                                  </div>
                                  <span dir="ltr" className="font-black text-sm text-gray-900 dark:text-white">{order.customerPhone}</span>
                                </a>
                                <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50">
                                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <MapPin size={18} />
                                  </div>
                                  <span className="font-bold text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">{order.deliveryAddress?.details || 'لا يوجد عنوان تفصيلي'}</span>
                                </div>
                              </div>

                              {order.driverNotes && (
                                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                                  <StickyNote size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                  <p className="text-xs text-amber-500/80 font-bold leading-relaxed">{order.driverNotes}</p>
                                </div>
                              )}
                              
                              <div className="pt-2">{getOrderAction(order)}</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {(activeTab === 'available' ? availableOrders : myOrders.filter(o => o.status !== 'delivered')).length === 0 && (
                    <div className="col-span-full py-32 text-center bg-[#0d0d10] border border-dashed border-gray-800 rounded-[40px]">
                      <Package size={64} className="mx-auto mb-6 text-gray-800" />
                      <p className="font-black text-gray-600 text-lg">لا توجد طلبات في هذه القائمة حالياً</p>
                    </div>
                  )}
                </div>
              )}

              {/* Delivered */}
              {activeTab === 'delivered' && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {completedDeliveries.map((order) => (
                    <div key={order.id} className="bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-gray-800/30 p-6 rounded-[28px] flex items-center justify-between group hover:border-green-500/20 transition-all shadow-sm dark:shadow-none">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <h3 className="font-black text-gray-900 dark:text-gray-200">{order.customerName}</h3>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-wider mt-1">
                            تم التوصيل: {new Date(normalizeTimestamp(order.updatedAt || order.createdAt)).toLocaleString('ar-PS', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg text-gray-700 dark:text-gray-300">{formatCurrency(order.total)}</p>
                        <p className="text-[10px] text-green-500/60 font-black">ناجح</p>
                      </div>
                    </div>
                  ))}
                  {completedDeliveries.length === 0 && (
                    <div className="py-32 text-center bg-white dark:bg-[#0d0d10] border border-dashed border-gray-200 dark:border-gray-800 rounded-[40px]">
                      <CheckCircle2 size={64} className="mx-auto mb-6 text-gray-200 dark:text-gray-800" />
                      <p className="font-black text-gray-400 dark:text-gray-600 text-lg">لم تسلم أي طلبات بعد</p>
                    </div>
                  )}
                </div>
              )}

              {/* Balance Section */}
              {activeTab === 'balance' && (
                <div className="max-w-3xl mx-auto space-y-8">
                  <div className="bg-gradient-to-br from-primary-main to-primary-dark p-10 rounded-[48px] text-black shadow-2xl shadow-primary-main/20 relative overflow-hidden group">
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/20 blur-[80px] rounded-full group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10 text-center">
                      <div className="w-20 h-20 bg-black/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Wallet size={40} className="opacity-80" />
                      </div>
                      <p className="text-xs font-black opacity-60 uppercase tracking-[0.3em] mb-2">صافي أرباح التوصيل اليوم</p>
                      <h2 className="text-6xl font-black tracking-tighter">{formatCurrency(todayEarnings)}</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-gray-800/50 p-8 rounded-[40px] flex flex-col items-center text-center group hover:border-green-500/30 transition-colors shadow-sm dark:shadow-none">
                      <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mb-4 group-hover:scale-110 transition-transform">
                        <Wallet size={28} />
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">كاش مجموع اليوم</p>
                      <p className="text-3xl font-black text-green-500">{formatCurrency(todayCollected)}</p>
                    </div>
                    <div className="bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-gray-800/50 p-8 rounded-[40px] flex flex-col items-center text-center group hover:border-blue-500/30 transition-colors shadow-sm dark:shadow-none">
                      <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                        <CheckCircle2 size={28} />
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">توصيلات مكتملة اليوم</p>
                      <p className="text-3xl font-black text-gray-900 dark:text-white">{completedDeliveries.filter(o => isSameDay(normalizeTimestamp(o.updatedAt || o.createdAt), Date.now())).length}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-gray-800/30 rounded-[40px] p-8 space-y-5 shadow-sm dark:shadow-none">
                    <h4 className="font-black text-xl text-gray-700 dark:text-gray-300 mb-2">السجل الإجمالي للنظام</h4>
                    <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-gray-800/30">
                      <span className="text-gray-400 dark:text-gray-500 font-black text-sm uppercase tracking-wider">إجمالي العمولات المستحقة</span>
                      <span className="font-black text-xl text-primary-main">{formatCurrency(completedDeliveries.reduce((sum, o) => sum + Number(o.deliveryFee || 0), 0))}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-gray-800/30">
                      <span className="text-gray-400 dark:text-gray-500 font-black text-sm uppercase tracking-wider">إجمالي الكاش المحصل من الزبائن</span>
                      <span className="font-black text-xl text-green-500">{formatCurrency(totalCollected)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-gray-400 dark:text-gray-500 font-black text-sm uppercase tracking-wider">العدد الكلي للطلبات المسلمة</span>
                      <span className="font-black text-xl text-gray-900 dark:text-white">{completedDeliveries.length} طلب</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Customers Tab */}
              {activeTab === 'customers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {myCustomers.map(customer => (
                    <div key={customer.id} className="bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-gray-800/40 p-6 rounded-[32px] flex items-center gap-5 hover:border-primary-main/20 transition-all group shadow-sm dark:shadow-none">
                      <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center text-2xl font-black transition-transform group-hover:scale-105 ${customer.isVip ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-black shadow-xl shadow-yellow-500/10' : 'bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500'}`}>
                        {customer.isVip ? '👑' : (customer.name?.[0] || 'ز')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-lg text-gray-900 dark:text-white">{customer.name || 'زبون'}</h4>
                          {customer.isVip && <span className="bg-primary-main text-black text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">VIP Member</span>}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-black tracking-widest uppercase" dir="ltr">{customer.phone}</p>
                      </div>
                      <Users size={20} className="text-gray-200 dark:text-gray-800 group-hover:text-primary-main/30 transition-colors" />
                    </div>
                  ))}
                  {myCustomers.length === 0 && (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-[#0d0d10] border border-dashed border-gray-200 dark:border-gray-800 rounded-[40px]">
                      <Users size={64} className="mx-auto mb-6 text-gray-200 dark:text-gray-800" />
                      <p className="font-black text-gray-400 dark:text-gray-600 text-lg">لا يوجد زبائن يفضلون التعامل معك حالياً</p>
                    </div>
                  )}
                </div>
              )}

              {/* Ratings Tab */}
              {activeTab === 'ratings' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {myRatings.length > 0 && (
                    <div className="bg-gradient-to-br from-amber-400 to-yellow-600 p-8 rounded-[40px] text-center text-black mb-10 shadow-2xl shadow-yellow-500/10">
                      <div className="w-16 h-16 bg-black/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star size={32} className="opacity-80" />
                      </div>
                      <p className="text-5xl font-black tracking-tighter">
                        {(myRatings.reduce((sum, r) => sum + r.rating, 0) / myRatings.length).toFixed(1)}
                      </p>
                      <p className="text-[10px] font-black opacity-60 uppercase tracking-[0.2em] mt-2">متوسط التقييم من {myRatings.length} زبون</p>
                    </div>
                  )}
                  {myRatings.map(rating => (
                    <div key={rating.id} className="bg-white dark:bg-[#0d0d10] border border-gray-100 dark:border-gray-800/40 p-6 rounded-[32px] hover:border-yellow-500/20 transition-all shadow-sm dark:shadow-none">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-600">
                            <UserIcon size={24} />
                          </div>
                          <div>
                            <h4 className="font-black text-base text-gray-900 dark:text-white">{rating.userName || 'زبون مجهول'}</h4>
                            <p className="text-[10px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-wider">{new Date(rating.createdAt).toLocaleDateString('ar')}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 bg-yellow-500/5 p-2 rounded-xl border border-yellow-500/10">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} fill={i < rating.rating ? '#f59e0b' : 'none'} color={i < rating.rating ? '#f59e0b' : '#374151'} />
                          ))}
                        </div>
                      </div>
                      {rating.comment && (
                        <div className="bg-gray-50 dark:bg-[#08080a] p-5 rounded-[24px] text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed italic border border-gray-100 dark:border-gray-800/30">
                          "{rating.comment}"
                        </div>
                      )}
                    </div>
                  ))}
                  {myRatings.length === 0 && (
                    <div className="py-32 text-center bg-white dark:bg-[#0d0d10] border border-dashed border-gray-200 dark:border-gray-800 rounded-[40px]">
                      <Star size={64} className="mx-auto mb-6 text-gray-200 dark:text-gray-800" />
                      <p className="font-black text-gray-400 dark:text-gray-600 text-lg">لا توجد تقييمات لك بعد</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default DriverDashboardPage;
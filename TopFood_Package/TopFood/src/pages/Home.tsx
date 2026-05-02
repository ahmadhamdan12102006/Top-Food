import React, { useEffect, useState } from 'react';
import './Home.css';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, ArrowLeft, Plus, MapPin, Bell,
  Wallet, Navigation, Gift, TrendingUp, Zap, Truck, Package,
  CheckCircle2, Clock, Crown, Loader2, ChevronLeft
} from 'lucide-react';
import { getHomeSettings } from '../services/homeService';
import { getMenuItems } from '../services/menuService';
import { getUserOrders } from '../services/orderService';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useFrequentOrdersStore } from '../store/useFrequentOrdersStore';
import SmartReorderModal from '../components/SmartReorderModal';
import Logo from '../components/common/Logo';
import type { HomeSettings, MenuItem, Order } from '../types';

const formatCurrency = (price: number) => `₪${price}`;

const quickActions = [
  { id: 'quick', label: 'اطلب بسرعة', sub: 'خلال 10 ثواني', icon: Zap, link: '/menu', color: '#F1B76D' },
  { id: 'popular', label: 'الأكثر طلباً', sub: 'هذا الأسبوع', icon: TrendingUp, link: '/menu', color: '#FF6B35' },
  { id: 'offers', label: 'العروض', sub: 'خصومات حصرية', icon: Gift, link: '/menu', badge: 2, color: '#4CAF50' },
  { id: 'track', label: 'تتبع الطلب', sub: 'لايف', icon: Navigation, link: '/track-order', color: '#2196F3' },
  { id: 'wallet', label: 'محفظتي', sub: 'رصيد وعروض', icon: Wallet, link: '/account', color: '#9C27B0' },
];

const trackingSteps = [
  { label: 'في الطريق اليك', icon: Truck, status: 'on_the_way' },
  { label: 'جاهز للتغليف', icon: Package, status: 'ready_for_pickup' },
  { label: 'جاري التحضير', icon: Clock, status: 'preparing' },
  { label: 'تم استلام الطلب', icon: CheckCircle2, status: 'pending' },
];

const Home: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<HomeSettings | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const user = useAuthStore((s) => s.user);
  const notificationCount = useNotificationStore((s) => s.unreadCount());
  const { getTopOrder, hasSeenPopup, setHasSeenPopup } = useFrequentOrdersStore();
  const navigate = useNavigate();

  const [showSmartReorder, setShowSmartReorder] = useState(false);
  const [topOrder, setTopOrder] = useState<any>(null);

  useEffect(() => {
    if (!loading) {
      const order = getTopOrder();
      if (order && !hasSeenPopup) {
        setTopOrder(order);
        setShowSmartReorder(true);
        setHasSeenPopup(true);
      }
    }
  }, [loading, getTopOrder, hasSeenPopup, setHasSeenPopup]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [homeSet, items] = await Promise.all([getHomeSettings(), getMenuItems()]);
        setSettings(homeSet);
        setMenuItems(items);
        if (user?.id) {
          const orders = await getUserOrders(user.id);
          const now = Date.now();
          const twelveHoursMs = 12 * 60 * 60 * 1000;
          const active = orders.find(o =>
            ['pending', 'preparing', 'ready_for_pickup', 'on_the_way'].includes(o.status) &&
            (now - (o.createdAt || 0)) < twelveHoursMs
          );
          if (active) setActiveOrder(active);
        }
      } catch (error) {
        console.error('Home data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  useEffect(() => {
    const activeBanners = settings?.banners?.filter(b => b.isActive) || [];
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [settings?.banners]);

  const handleSearch = () => {
    if (searchQuery.trim()) navigate(`/menu?search=${encodeURIComponent(searchQuery.trim())}`);
    else navigate('/menu');
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-main" />
      </div>
    );
  }

  const activeBanners = settings?.banners?.filter(b => b.isActive) || [];
  const trendingItems = menuItems.filter(i => i.isAvailable).slice(0, 8);
  const getStepIndex = (status: string) => {
    const map: Record<string, number> = { pending: 3, preparing: 2, ready_for_pickup: 1, on_the_way: 0 };
    return map[status] ?? -1;
  };
  const activeStepIdx = activeOrder ? getStepIndex(activeOrder.status) : -1;

  const getBadge = (index: number) => {
    const badges = ['الاكثر طلباً', 'جديد', 'مميز', 'جديد'];
    const colors = ['bg-red-500', 'bg-green-500', 'bg-primary-main text-black', 'bg-green-500'];
    if (index < badges.length) return { text: badges[index], cls: colors[index] };
    return null;
  };

  return (
    <div className="tf-home">
      {/* ─── Top Bar: Location + Logo ─── */}
      <div className="tf-topbar">
        <button
          onClick={() => navigate('/notifications')}
          className="tf-topbar__bell"
        >
          <Bell size={22} />
          {notificationCount > 0 && <span className="tf-topbar__badge">{notificationCount}</span>}
        </button>

        <div className="flex items-center gap-3">
          <div className="tf-topbar__location">
            <div className="tf-topbar__location-text">
              <span className="tf-topbar__city">دورا</span>
              <span className="tf-topbar__sub">التوصيل الآن</span>
            </div>
            <MapPin size={18} className="text-primary-main" />
          </div>
          <Logo size={48} className="tf-topbar__main-logo" />
        </div>
      </div>

      {/* Central Logo Removed and replaced with spacer or small tagline if needed */}
      <div className="tf-header-spacer h-4" />

      {/* ─── Search ─── */}
      <div className="tf-search-wrap">
        <div className="tf-search">
          <button className="tf-search__filter" onClick={() => navigate('/menu')}>
            <SlidersHorizontal size={16} />
            <span>الفلتر</span>
          </button>
          <input
            type="text"
            placeholder="ابحث عن وجبتك المفضلة..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="tf-search__input"
          />
          <Search size={18} className="tf-search__icon" />
        </div>
      </div>

      {/* ─── Hero Banner Slider ─── */}
      <section className="tf-banner-section">
        {activeBanners.length > 0 ? (
          <div className="tf-banner">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBannerIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="tf-banner__slide"
              >
                <img src={activeBanners[currentBannerIndex].image} alt={activeBanners[currentBannerIndex].title} className="tf-banner__img" />
                <div className="tf-banner__gradient" />
                <div className="tf-banner__fire-particles" />
                <div className="tf-banner__badge-new">
                  <span>🔥</span> جديد
                </div>
                <div className="tf-banner__content">
                  <h2 className="tf-banner__title">{activeBanners[currentBannerIndex].title}</h2>
                  {activeBanners[currentBannerIndex].description && (
                    <p className="tf-banner__desc">{activeBanners[currentBannerIndex].description}</p>
                  )}
                  <Link to={activeBanners[currentBannerIndex].link || '/menu'} className="tf-banner__cta">
                    <ArrowLeft size={16} />
                    <span>اطلب الآن</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
            {activeBanners.length > 1 && (
              <div className="tf-banner__dots">
                {activeBanners.map((_, i) => (
                  <button key={i} onClick={() => setCurrentBannerIndex(i)} className={`tf-banner__dot ${i === currentBannerIndex ? 'tf-banner__dot--active' : ''}`} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="tf-banner tf-banner--fallback">
            <div className="tf-banner__gradient" />
            <div className="tf-banner__content">
              <h2 className="tf-banner__title">Top Food</h2>
              <p className="tf-banner__desc">أفضل المأكولات بجودة لا تضاهى</p>
              <Link to="/menu" className="tf-banner__cta"><ArrowLeft size={16} /><span>استعرض المنيو</span></Link>
            </div>
          </div>
        )}
      </section>

      {/* ─── Quick Actions ─── */}
      <section className="tf-quick-actions">
        {quickActions.map(action => (
          <Link key={action.id} to={action.link} className="tf-quick-action">
            <div className="tf-quick-action__circle" style={{ background: `${action.color}20`, color: action.color }}>
              <action.icon size={22} />
              {action.badge && <span className="tf-quick-action__badge">{action.badge}</span>}
            </div>
            <span className="tf-quick-action__label">{action.label}</span>
            <span className="tf-quick-action__sub">{action.sub}</span>
          </Link>
        ))}
      </section>

      {/* ─── Order Tracking Card ─── */}
      {activeOrder && (
        <section className="tf-tracking-section">
          <Link to="/track-order" className="tf-tracking">
            <div className="tf-tracking__header">
              <div className="tf-tracking__info">
                <span className="tf-tracking__order-num">#{activeOrder.orderNumber || activeOrder.id.slice(-4)}</span>
                <span className="tf-tracking__order-label">الطلب</span>
                <span className="tf-tracking__eta">الوصول المتوقع<br /><strong>22 دقيقة</strong></span>
              </div>
              <div className="tf-tracking__title-row">
                <h3 className="tf-tracking__title">تتبع طلبك</h3>
                <div className="tf-tracking__scooter">🛵</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs font-bold text-white/60 mb-1">
                  <Navigation size={12} />
                  <span>تتبع مباشر</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(activeStepIdx / (trackingSteps.length - 1)) * 100}%` }}
                    className="h-full bg-primary-main"
                  />
                </div>
              </div>
              <button className="flex h-10 items-center gap-2 rounded-xl bg-primary-main px-4 font-black text-black shadow-lg shadow-primary-main/20 active:scale-95 transition-transform">
                تتبع على الخريطة
              </button>
            </div>

            <div className="tf-tracking__steps mt-6">
              {trackingSteps.map((step, i) => {
                const isActive = i >= activeStepIdx && activeStepIdx !== -1;
                const isCurrent = i === activeStepIdx;
                return (
                  <React.Fragment key={i}>
                    <div className={`tf-tracking__step ${isActive ? 'tf-tracking__step--active' : ''} ${isCurrent ? 'tf-tracking__step--current' : ''}`}>
                      <div className="tf-tracking__step-icon"><step.icon size={16} /></div>
                      <span className="tf-tracking__step-label">{step.label}</span>
                    </div>
                    {i < trackingSteps.length - 1 && (
                      <div className={`tf-tracking__line ${i >= activeStepIdx && activeStepIdx !== -1 ? 'tf-tracking__line--active' : ''}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </Link>
        </section>
      )}

      {/* ─── Trending Section ─── */}
      {trendingItems.length > 0 && (
        <section className="tf-trending-section">
          <div className="tf-trending__header">
            <Link to="/menu" className="tf-trending__see-all">
              <ChevronLeft size={16} />
              عرض الكل
            </Link>
            <h3 className="tf-trending__title">🔥 ترند اليوم</h3>
          </div>
          <div className="tf-trending__scroll hide-scrollbar">
            {trendingItems.map((item, index) => {
              const badge = getBadge(index);
              return (
                <Link key={item.id} to={`/menu/${item.id}`} className="tf-food-card">
                  <div className="tf-food-card__img-wrap">
                    <img src={item.images?.[0]} alt={item.name} className="tf-food-card__img" />
                    {badge && <span className={`tf-food-card__badge ${badge.cls}`}>{badge.text}</span>}
                  </div>
                  <div className="tf-food-card__body">
                    <h4 className="tf-food-card__name">{item.name}</h4>
                    <p className="tf-food-card__desc">{item.description}</p>
                    <div className="tf-food-card__footer">
                      <button
                        className="tf-food-card__add"
                        onClick={e => { e.preventDefault(); navigate(`/menu/${item.id}`); }}
                      >
                        <Plus size={16} />
                      </button>
                      <span className="tf-food-card__price">{formatCurrency(item.price)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── VIP Banner ─── */}
      <section className="tf-vip-section">
        <div className="tf-vip">
          <div className="tf-vip__right">
            <div className="tf-vip__crown-badge">
              <Crown size={32} className="text-primary-main" />
              <span>VIP</span>
            </div>
          </div>
          <div className="tf-vip__center">
            <Link to="/account" className="tf-vip__cta">انضم الآن</Link>
            <div className="tf-vip__features">
              <div className="tf-vip__feature">
                <Crown size={16} />
                <span>نقاط تكسبها</span>
              </div>
              <div className="tf-vip__feature">
                <Truck size={16} />
                <span>شحن مجاني</span>
              </div>
              <div className="tf-vip__feature">
                <Gift size={16} />
                <span>عروض حصرية</span>
              </div>
            </div>
          </div>
          <div className="tf-vip__left">
            <h3 className="tf-vip__title">انضم لبرنامج VIP</h3>
            <p className="tf-vip__sub">اطلب أكثر, اربح أكثر!</p>
            <div className="tf-vip__brand">
              <span className="tf-vip__brand-name">Top Food</span>
              <span className="tf-vip__brand-vip">VIP</span>
            </div>
          </div>
        </div>
      </section>

      {topOrder && (
        <SmartReorderModal
          isOpen={showSmartReorder}
          onClose={() => setShowSmartReorder(false)}
          order={topOrder}
        />
      )}
    </div>
  );
};

export default Home;

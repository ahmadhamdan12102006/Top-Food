import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, UtensilsCrossed, Loader2, ChevronLeft, Phone, Bike } from 'lucide-react';
import Button from '../components/common/Button';
import { getHomeSettings } from '../services/homeService';
import { getMenuItems } from '../services/menuService';
import type { HomeSettings, MenuItem } from '../types';
import DailyWheel from '../components/home/DailyWheel';
import MotorcyclePath from '../components/home/MotorcyclePath';
import CommunityHighlights from '../components/home/CommunityHighlights';

const Home: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<HomeSettings | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [homeSet, items] = await Promise.all([
          getHomeSettings(),
          getMenuItems()
        ]);
        setSettings(homeSet);
        setMenuItems(items);
      } catch (error) {
        console.error('Home data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-rotate banners
  useEffect(() => {
    if (!settings?.banners || settings.banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % settings.banners.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [settings?.banners]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-main" />
      </div>
    );
  }

  const activeBanners = settings?.banners?.filter(b => b.isActive) || [];

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      {/* Hero Section / Banner Slider */}
      <section className="px-4 sm:px-6 lg:px-8 pt-2">
        <div className="max-w-7xl mx-auto">
          {activeBanners.length > 0 ? (
            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-[40px] shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentBannerIndex}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0"
                >
                  <img 
                    src={activeBanners[currentBannerIndex].image} 
                    alt={activeBanners[currentBannerIndex].title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                  
                  <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-10 sm:px-16 max-w-2xl text-white">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="inline-flex items-center gap-2 rounded-full bg-primary-main/20 border border-primary-main/30 px-3 py-1 text-xs font-bold text-primary-main mb-4"
                    >
                      <Sparkles size={12} />
                      <span>Top Food Exclusive</span>
                    </motion.div>
                    <motion.h2 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-4"
                    >
                      {activeBanners[currentBannerIndex].title}
                    </motion.h2>
                    <motion.p 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="text-lg text-white/70 mb-8 line-clamp-2"
                    >
                      {activeBanners[currentBannerIndex].description}
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Link to={activeBanners[currentBannerIndex].link || '/menu'}>
                        <Button className="h-14 px-10 rounded-2xl text-lg font-black shadow-xl">
                          اطلب الآن
                          <ArrowLeft className="mr-2" size={20} />
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>
              
              {/* Slider Dots */}
              {activeBanners.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  {activeBanners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentBannerIndex(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === currentBannerIndex ? 'w-8 bg-primary-main' : 'w-2 bg-white/30 hover:bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Fallback Hero if no banners */
            <div className="relative overflow-hidden rounded-[40px] bg-[#0b0b0c] text-white p-12 lg:p-20 shadow-2xl">
              <div className="relative z-10 max-w-2xl">
                <h1 className="text-5xl lg:text-7xl font-black mb-6">Top Food</h1>
                <p className="text-xl text-white/70 mb-10 leading-relaxed">أفضل المأكولات بجودة لا تضاهى. اطلب وجبتك المفضلة الآن واستمتع بتجربة فريدة.</p>
                <Link to="/menu">
                  <Button className="h-14 px-10 rounded-2xl text-lg font-black">
                    استعراض المنيو
                    <UtensilsCrossed className="mr-2" size={20} />
                  </Button>
                </Link>
              </div>
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 grayscale">
                <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1400&q=80" alt="pizza" className="h-full w-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Daily Wheel Section */}
      <section className="mt-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <DailyWheel items={menuItems} />
        </div>
      </section>

      {/* Community Highlights Section (Most Popular & Previous Order) */}
      <section className="mt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <CommunityHighlights allItems={menuItems} />
        </div>
      </section>

      {/* Tracking Call-to-Action with Motorcycle Path */}
      <section className="mt-24 px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h3 className="text-2xl font-black flex items-center gap-3 mb-2">
              <Bike className="text-primary-main" size={28} />
              تتبع طلباتك في الوقت الفعلي
            </h3>
            <p className="text-white/40 font-medium">وجبتك دايماً في الطريق الصحيح مع توب فود</p>
          </div>
          
          <Link to="/track-order" className="block group">
            <MotorcyclePath />
            <div className="mt-6 flex items-center justify-between bg-surface-dark border border-white/5 p-6 rounded-[2rem] group-hover:bg-primary-main group-hover:text-black transition-colors duration-300">
              <div className="text-right">
                <p className="font-black text-xl">إضغط هنا لتتبع طلبك الحالي</p>
                <p className="opacity-60 text-sm font-bold">شاهد موقع السائق والوقت المتوقع للوصول</p>
              </div>
              <ChevronLeft size={32} />
            </div>
          </Link>
        </div>
      </section>

      {/* Quick Contact Card */}
      <section className="mt-12 px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-[3rem] bg-gradient-to-r from-[#1a1a1b] to-black p-10 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-right">
              <h4 className="text-3xl font-black text-white mb-2">عندك سؤال أو استفسار؟</h4>
              <p className="text-white/50 font-bold">فريق توب فود جاهز لمساعدتك في أي وقت</p>
            </div>
            <Link to="/contact">
              <Button className="h-16 px-12 rounded-2xl text-lg font-black bg-white text-black hover:bg-white/90">
                تواصل معنا الآن
                <Phone className="mr-3" size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

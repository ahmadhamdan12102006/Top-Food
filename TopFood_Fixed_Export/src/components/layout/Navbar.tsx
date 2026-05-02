import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Home,
  Menu,
  Moon,
  Phone,
  Settings,
  ShoppingCart,
  Sun,
  User,
  UtensilsCrossed,
  X,
} from 'lucide-react';

import { useCartStore } from '../../store/useCartStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useDarkMode } from '../../hooks/useDarkMode';

const bottomNavLinks = [
  { path: '/', label: 'الرئيسية', icon: Home },
  { path: '/menu', label: 'المنيو', icon: UtensilsCrossed },
  { path: '/contact', label: 'تواصل معنا', icon: Phone },
  { path: '/cart', label: 'السلة', icon: ShoppingCart, isCart: true },
  { path: '/account', label: 'الحساب', icon: User },
];

const Navbar: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const { isDark, toggleTheme } = useDarkMode();
  const navigate = useNavigate();

  const cartItemsCount = useCartStore((state) => state.items.length);
  const notificationCount = useNotificationStore((state) => state.unreadCount());

  useEffect(() => {
    const onBump = () => {
      setCartBump(true);
      window.setTimeout(() => setCartBump(false), 520);
    };

    window.addEventListener('cart-bump', onBump as EventListener);
    return () => {
      window.removeEventListener('cart-bump', onBump as EventListener);
    };
  }, []);

  return (
    <>
      {/* Top Actions (Floating) */}
      <div className="fixed top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        {/* Left side actions (Notifications, Settings, Theme) */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/70 dark:bg-[#111317]/70 backdrop-blur-md rounded-2xl p-2 shadow-sm border border-white/20 dark:border-white/5">
          <button
            onClick={() => navigate('/notifications')}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-main text-[10px] font-black text-black">
                {notificationCount}
              </span>
            )}
          </button>
          
          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-black/5 dark:hover:bg-white/5"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto max-w-lg px-3 pb-3">
          <div className="grid grid-cols-6 overflow-hidden rounded-[24px] border border-white/10 bg-white/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] dark:bg-[#111317]/95 dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            {bottomNavLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center gap-1 py-3 transition ${
                    isActive
                      ? 'bg-primary-main/10 text-primary-main'
                      : 'text-text-light dark:text-text-dark opacity-80 hover:opacity-100'
                  }`
                }
              >
                {link.isCart ? (
                  <div className="relative">
                    {cartBump && (
                      <motion.div
                        initial={{ boxShadow: '0 0 0 rgba(245,158,11,0)' }}
                        animate={{
                          boxShadow: [
                            '0 0 0 rgba(245,158,11,0)',
                            '0 0 0 10px rgba(245,158,11,0.18)',
                            '0 0 0 18px rgba(245,158,11,0)',
                          ],
                        }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-full"
                      />
                    )}
                    <link.icon size={22} />
                    {cartItemsCount > 0 && (
                      <motion.span
                        key={cartItemsCount}
                        initial={{ scale: 0.6, y: -6, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-main px-1 text-[10px] font-black text-black shadow-lg"
                      >
                        {cartItemsCount}
                      </motion.span>
                    )}
                  </div>
                ) : (
                  <link.icon size={22} />
                )}
                <span className="text-[10px] font-bold mt-1">{link.label}</span>
              </NavLink>
            ))}
            
            {/* More / Drawer Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-3 transition text-text-light dark:text-text-dark opacity-80 hover:opacity-100"
            >
              <Menu size={22} />
              <span className="text-[10px] font-bold mt-1">المزيد</span>
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 z-[70] flex h-full w-[85%] max-w-[320px] flex-col bg-white shadow-2xl dark:bg-[#0f1115]"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-6 dark:border-gray-800">
                <div className="flex items-center gap-2 text-primary-main">
                  <UtensilsCrossed size={28} />
                  <span className="text-2xl font-black tracking-tight">Top Food</span>
                </div>

                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-500 transition hover:bg-gray-100 hover:text-black dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-2 p-4">
                <NavLink
                  to="/orders"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between rounded-2xl px-5 py-4 font-bold transition hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <span>طلباتي</span>
                </NavLink>

                <NavLink
                  to="/about"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between rounded-2xl px-5 py-4 font-bold transition hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <span>من نحن</span>
                </NavLink>

                <NavLink
                  to="/privacy"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between rounded-2xl px-5 py-4 font-bold transition hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <span>سياسة الخصوصية</span>
                </NavLink>
                
                <NavLink
                  to="/terms"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between rounded-2xl px-5 py-4 font-bold transition hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <span>الشروط والأحكام</span>
                </NavLink>
              </div>
              
              <div className="mt-auto p-6">
                <p className="text-center text-sm font-semibold text-gray-400">
                  الإصدار 1.0.0
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;

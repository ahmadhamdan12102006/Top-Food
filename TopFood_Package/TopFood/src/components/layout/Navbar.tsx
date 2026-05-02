import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Heart,
  Home,
  Menu,
  Moon,
  Phone,
  Settings,
  Sun,
  User,
  UtensilsCrossed,
  X,
  ClipboardList,
} from 'lucide-react';

import Logo from '../common/Logo';
import { useCartStore } from '../../store/useCartStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useDarkMode } from '../../hooks/useDarkMode';

const bottomNavLinks = [
  { path: '/account', label: 'حسابي', icon: User },
  { path: '/favorites', label: 'المفضلة', icon: Heart },
  { path: '/', label: 'الرئيسية', icon: Home, isHome: true },
  { path: '/menu', label: 'المنيو', icon: UtensilsCrossed },
  { path: '/cart', label: 'طلباتي', icon: ClipboardList, isCart: true },
];

const Navbar: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isDark, toggleTheme } = useDarkMode();
  const navigate = useNavigate();

  const cartItemsCount = useCartStore((state) => state.items.length);
  const notificationCount = useNotificationStore((state) => state.unreadCount());

  return (
    <>
      <div className="sticky top-0 z-40 w-full px-4 py-3 flex items-center justify-end bg-bg-light/95 dark:bg-bg-dark/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/notifications')}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 transition hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <Bell size={20} className="text-gray-700 dark:text-gray-300" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-main text-[11px] font-black text-black shadow-sm">
                {notificationCount}
              </span>
            )}
          </button>

          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 transition hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {isDark ? <Sun size={20} className="text-gray-700 dark:text-gray-300" /> : <Moon size={20} className="text-gray-700 dark:text-gray-300" />}
          </button>
        </div>
      </div>

      {/* ═══ Bottom Navigation ═══ */}
      <nav className="fixed inset-x-0 bottom-0 z-50">
        <div className="mx-auto max-w-lg px-3 pb-3">
          <div className="grid grid-cols-6 overflow-hidden rounded-[24px] border border-white/10 bg-white/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] dark:bg-[#111317]/95 dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            {bottomNavLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/'}
                className="relative flex flex-col items-center justify-center gap-1 py-2 z-10 text-text-light dark:text-text-dark opacity-70 hover:opacity-100 [&.active]:opacity-100"
              >
                {({ isActive }) => (
                  <>
                    <div className="relative flex items-center justify-center w-full h-8 mt-1">
                      {isActive && (
                        <motion.div
                          layoutId="nav-bubble"
                          className="absolute bg-primary-main rounded-full shadow-lg shadow-primary-main/30 z-0"
                          style={{ width: '46px', height: '46px', top: '-18px' }}
                          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        />
                      )}
                      
                      <motion.div
                        animate={{ y: isActive ? -18 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        className={`relative z-10 flex items-center justify-center w-full h-full transition-colors duration-300 ${isActive ? 'text-black' : ''}`}
                      >
                        <link.icon size={22} />
                        {link.isCart && cartItemsCount > 0 && (
                          <span className={`absolute ml-6 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full ${isActive ? 'bg-black text-primary-main' : 'bg-primary-main text-black'} px-1 text-[10px] font-black shadow-sm`}>
                            {cartItemsCount}
                          </span>
                        )}
                      </motion.div>
                    </div>
                    <span className={`text-[10px] font-bold z-10 transition-colors duration-300 ${isActive ? 'text-primary-main' : ''}`}>
                      {link.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}

            {/* More / Drawer Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-3 transition text-text-light dark:text-text-dark opacity-70 hover:opacity-100"
            >
              <Menu size={22} />
              <span className="text-[10px] font-bold mt-1">المزيد</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ Drawer ═══ */}
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
                <div className="flex items-center gap-2">
                  <Logo size={40} monochrome={true} />
                  <span className="text-2xl font-black tracking-tight dark:text-white">Top Food</span>
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
                  to="/contact"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-5 py-4 font-bold transition hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <Phone size={20} className="text-primary-main" />
                  <span>تواصل</span>
                </NavLink>

                <NavLink
                  to="/settings"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-5 py-4 font-bold transition hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <Settings size={20} className="text-primary-main" />
                  <span>الاعدادات</span>
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

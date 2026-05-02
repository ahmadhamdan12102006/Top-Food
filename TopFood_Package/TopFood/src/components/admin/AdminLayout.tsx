import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  UtensilsCrossed,
  FolderOpen,
  ClipboardList,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Truck,
  Sun,
  Moon,
  Calculator,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useAdminStore } from '../../store/useAdminStore';
import { useAuthStore } from '../../store/useAuthStore';

const sidebarLinks = [
  { path: '/admin/orders', label: 'الطلبات', icon: ClipboardList },
  { path: '/admin/drivers', label: 'السائقين', icon: Truck },
  { path: '/admin/customers', label: 'الزبائن', icon: Users },
  { path: '/admin/reviews', label: 'التقييمات والدردشات', icon: Star },
];

const moreLinks = [
  { path: '/admin/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/admin/menu', label: 'المنيو', icon: UtensilsCrossed },
  { path: '/admin/inventory', label: 'المخزن', icon: FolderOpen },
  { path: '/admin/categories', label: 'الفئات', icon: FolderOpen },
  { path: '/admin/accounting', label: 'المحاسبة', icon: Calculator },
  { path: '/admin/invoices', label: 'الفواتير', icon: FileSpreadsheet },
  { path: '/admin/home', label: 'تخصيص الهوم', icon: LayoutDashboard },
  { path: '/admin/settings', label: 'الإعدادات', icon: Settings },
];

// ✅ FIX: AdminLayout is now a pure layout component - auth check moved to AdminProtectedRoute
const AdminLayout: React.FC = () => {
  const { adminLogout } = useAdminStore();
  const { user } = useAuthStore();
  const { isDark, toggleTheme } = useDarkMode();

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  React.useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingOrdersCount(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    adminLogout();
    navigate('/admin', { replace: true });
  };

  return (
    <div
      className={`admin-shell ${isDark ? 'admin-shell--dark' : 'admin-shell--light'}`}
      dir="rtl"
    >
      <aside className={`admin-sidebar ${collapsed ? 'admin-sidebar--collapsed' : ''}`}>
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__logo">
            <span className="admin-sidebar__logo-icon">🍔</span>
            {!collapsed && <span className="admin-sidebar__logo-text">Top Food</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="admin-sidebar__collapse-btn"
              title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="admin-sidebar__collapse-btn"
            >
              <ChevronLeft size={18} className={collapsed ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>

        {!collapsed && user && (
          <div className="px-4 pb-3">
            <div className="rounded-2xl bg-white/10 px-3 py-3 text-sm">
              <div className="font-black truncate">{user.name || 'Admin'}</div>
              <div className="opacity-70 truncate" dir="ltr">
                {user.phone || ''}
              </div>
            </div>
          </div>
        )}

        <nav className="admin-sidebar__nav">
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
              title={link.label}
            >
              <div className="relative">
                <link.icon size={20} />
                {link.path === '/admin/orders' && pendingOrdersCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-lg shadow-rose-500/20">
                    {pendingOrdersCount}
                  </span>
                )}
              </div>
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          ))}

          <div className="mt-4 pt-4 border-t border-white/5 opacity-50 px-6 text-[10px] uppercase tracking-widest font-black">
            {!collapsed && 'المزيد'}
          </div>

          {moreLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
              title={link.label}
            >
              <link.icon size={18} />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <button
            onClick={handleLogout}
            className="admin-sidebar__link admin-sidebar__link--danger"
            title="تسجيل خروج"
          >
            <LogOut size={20} />
            {!collapsed && <span>تسجيل خروج</span>}
          </button>
        </div>
      </aside>

      <div className="admin-topbar">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-500 hover:text-primary-main p-1"
          >
            <Menu size={24} />
          </button>
          <span className="admin-topbar__title">🍔 Top Food Admin</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="admin-topbar__logout-btn">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button onClick={handleLogout} className="admin-topbar__logout-btn">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="admin-drawer-overlay"
              onClick={() => setSidebarOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="admin-drawer"
            >
              <div className="admin-drawer__header">
                <span className="text-xl font-black text-amber-400">🍔 Top Food</span>

                <div className="flex items-center gap-2">
                  <button onClick={toggleTheme}>
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                  </button>

                  <button onClick={() => setSidebarOpen(false)}>
                    <X size={24} />
                  </button>
                </div>
              </div>

              {user && (
                <div className="px-4 pb-4">
                  <div className="rounded-2xl bg-white/10 px-3 py-3 text-sm">
                    <div className="font-black truncate">{user.name || 'Admin'}</div>
                    <div className="opacity-70 truncate" dir="ltr">
                      {user.phone || ''}
                    </div>
                  </div>
                </div>
              )}

              <nav className="admin-drawer__nav">
                {[...sidebarLinks, ...moreLinks].map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `admin-drawer__link ${isActive ? 'admin-drawer__link--active' : ''}`
                    }
                  >
                    <div className="relative">
                      <link.icon size={22} />
                      {link.path === '/admin/orders' && pendingOrdersCount > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                          {pendingOrdersCount}
                        </span>
                      )}
                    </div>
                    <span>{link.label}</span>
                  </NavLink>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="admin-main">
        <div className="admin-main__viewport">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ✅ NEW: Persistent Live Orders Monitor */}
      <AnimatePresence>
        {pendingOrdersCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg"
          >
            <div
              onClick={() => navigate('/admin/orders')}
              className="bg-black/90 dark:bg-white/95 backdrop-blur-xl rounded-[28px] p-4 flex items-center justify-between shadow-2xl border border-white/10 dark:border-black/5 cursor-pointer group hover:scale-[1.02] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-main flex items-center justify-center text-black relative">
                  <ClipboardList size={24} className="animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-black">
                    {pendingOrdersCount}
                  </span>
                </div>
                <div>
                  <h4 className="text-white dark:text-black font-black text-sm">تنبيه: يوجد طلبات جديدة</h4>
                  <p className="text-white/60 dark:text-black/60 text-[10px] font-bold uppercase tracking-wider">اضغط هنا للمتابعة والتعيين</p>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 dark:bg-black/10 text-white dark:text-black group-hover:bg-primary-main group-hover:text-black transition-colors">
                <ChevronLeft size={20} className="rotate-180" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLayout;

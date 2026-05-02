import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

import MainLayout from './components/layout/MainLayout';
import { AuthModal } from './components/auth/AuthModal';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminProtectedRoute from './components/common/AdminProtectedRoute';
import DriverProtectedRoute from './components/common/DriverProtectedRoute';
import { useDarkMode } from './hooks/useDarkMode';
import { useOrderNotifications } from './hooks/useOrderNotifications';
import { initAuthListener } from './store/useAuthStore';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const HomePage = React.lazy(() => import('./pages/Home'));
const MenuPage = React.lazy(() => import('./pages/MenuPage'));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage'));
const ItemDetailPage = React.lazy(() => import('./pages/ItemDetailPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const AccountPage = React.lazy(() => import('./pages/AccountPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const OrderSuccessPage = React.lazy(() => import('./pages/OrderSuccessPage'));
const TrackOrderPage = React.lazy(() => import('./pages/TrackOrderPage'));
const MyOrdersPage = React.lazy(() => import('./pages/MyOrdersPage'));
const FavoritesPage = React.lazy(() => import('./pages/FavoritesPage'));

const AdminLoginPage = React.lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout'));
const DashboardPage = React.lazy(() => import('./pages/admin/DashboardPage'));
const ManageMenuPage = React.lazy(() => import('./pages/admin/ManageMenuPage'));
const ManageInventoryPage = React.lazy(() => import('./pages/admin/ManageInventoryPage'));
const ManageCategoriesPage = React.lazy(
  () => import('./pages/admin/ManageCategoriesPage')
);
const ManageOrdersPage = React.lazy(() => import('./pages/admin/ManageOrdersPage'));
const ManageReviewsPage = React.lazy(
  () => import('./pages/admin/ManageReviewsPage')
);
const AdminSettingsPage = React.lazy(() => import('./pages/admin/SettingsPage'));
const UserSettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const ManageDriversPage = React.lazy(
  () => import('./pages/admin/ManageDriversPage')
);
const ManageCustomersPage = React.lazy(
  () => import('./pages/admin/ManageCustomersPage')
);
const AccountingPage = React.lazy(() => import('./pages/admin/AccountingPage'));
const InvoicesPage = React.lazy(() => import('./pages/admin/InvoicesPage'));
const ManageHomePage = React.lazy(() => import('./pages/admin/ManageHomePage'));

const DriverLoginPage = React.lazy(() => import('./pages/driver/DriverLoginPage'));
const DriverDashboardPage = React.lazy(
  () => import('./pages/driver/DriverDashboardPage')
);
const DriverSettingsPage = React.lazy(
  () => import('./pages/driver/DriverSettingsPage')
);

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 30 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -30 }}
    transition={{ duration: 0.3, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
);

const PageLoader = () => (
  <div className="page-skeleton">
    <span className="sr-only">جارٍ التحميل...</span>
  </div>
);

const InstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);

      if (!localStorage.getItem('pwa-install-dismissed')) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="install-banner fixed bottom-4 left-4 right-4 z-50">
      <div className="mx-auto flex max-w-md items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-surface-dark">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-main text-2xl">
          📱
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold">نزّل التطبيق</h4>
          <p className="text-xs text-gray-500">أضف Top Food إلى الشاشة الرئيسية</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-xl bg-primary-main px-4 py-2 text-sm font-bold text-black transition hover:bg-primary-dark"
        >
          تثبيت
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-xl text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><HomePage /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/menu"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><MenuPage /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/menu/category/:categoryId"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><CategoryPage /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/menu/:itemId"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><ItemDetailPage /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/cart"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><CartPage /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <PageTransition><CheckoutPage /></PageTransition>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><ContactPage /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/order-success"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><OrderSuccessPage /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/track-order"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><TrackOrderPage /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <PageTransition><AccountPage /></PageTransition>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <PageTransition><NotificationsPage /></PageTransition>
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><UserSettingsPage /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/my-orders"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><MyOrdersPage /></PageTransition>
              </Suspense>
            }
          />
          <Route
            path="/favorites"
            element={
              <Suspense fallback={<PageLoader />}>
                <PageTransition><FavoritesPage /></PageTransition>
              </Suspense>
            }
          />
        </Route>

        {/* Admin Login - Public */}
        <Route
          path="/admin"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminLoginPage />
            </Suspense>
          }
        />

        {/* ✅ FIX: All admin routes wrapped with AdminProtectedRoute */}
        <Route
          element={
            <AdminProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <AdminLayout />
              </Suspense>
            </AdminProtectedRoute>
          }
        >
          <Route
            path="/admin/dashboard"
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/menu"
            element={
              <Suspense fallback={<PageLoader />}>
                <ManageMenuPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/inventory"
            element={
              <Suspense fallback={<PageLoader />}>
                <ManageInventoryPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <Suspense fallback={<PageLoader />}>
                <ManageCategoriesPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <Suspense fallback={<PageLoader />}>
                <ManageOrdersPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/drivers"
            element={
              <Suspense fallback={<PageLoader />}>
                <ManageDriversPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <Suspense fallback={<PageLoader />}>
                <ManageCustomersPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/home"
            element={
              <Suspense fallback={<PageLoader />}>
                <ManageHomePage />
              </Suspense>
            }
          />
          <Route
            path="/admin/accounting"
            element={
              <Suspense fallback={<PageLoader />}>
                <AccountingPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/invoices"
            element={
              <Suspense fallback={<PageLoader />}>
                <InvoicesPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <Suspense fallback={<PageLoader />}>
                <ManageReviewsPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminSettingsPage />
              </Suspense>
            }
          />
        </Route>

        {/* Driver Login - Public */}
        <Route
          path="/driver"
          element={
            <Suspense fallback={<PageLoader />}>
              <DriverLoginPage />
            </Suspense>
          }
        />

        {/* ✅ FIX: Driver routes wrapped with DriverProtectedRoute */}
        <Route
          path="/driver/dashboard"
          element={
            <DriverProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <DriverDashboardPage />
              </Suspense>
            </DriverProtectedRoute>
          }
        />
        <Route
          path="/driver/settings"
          element={
            <DriverProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <DriverSettingsPage />
              </Suspense>
            </DriverProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const { isDark } = useDarkMode();

  useEffect(() => {
    initAuthListener();
  }, []);

  useOrderNotifications();

  return (
    <BrowserRouter basename="/Top-Food">
      <AuthModal />
      <InstallBanner />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Cairo, sans-serif',
            borderRadius: '12px',
            background: isDark ? '#141821' : '#ffffff',
            color: isDark ? '#f5f7fb' : '#18181B',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: isDark
              ? '0 18px 40px rgba(0,0,0,0.35)'
              : '0 18px 40px rgba(15,23,42,0.12)',
          },
          duration: 3000,
        }}
      />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;

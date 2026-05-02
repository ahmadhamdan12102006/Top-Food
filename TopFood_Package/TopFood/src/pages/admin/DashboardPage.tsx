import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  DollarSign,
  Package,
  ShoppingBag,
  Star,
  TrendingUp,
} from 'lucide-react';

import { ORDER_STATUS_MAP } from '../../constants';
import type { DashboardStats } from '../../services/adminService';
import { formatCurrency } from '../../utils';

type DashboardData = DashboardStats;

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
  delay: number;
}> = ({ icon, label, value, accent, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
    className="admin-stat-card"
    style={{ ['--stat-accent' as string]: accent }}
  >
    <div className="admin-stat-card__icon">{icon}</div>
    <div className="admin-stat-card__content">
      <p className="admin-stat-card__label">{label}</p>
      <p className="admin-stat-card__value">{value}</p>
    </div>
  </motion.div>
);

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { getDashboardStats } = await import('../../services/adminService');
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const statsCards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        icon: <ShoppingBag size={22} />,
        label: 'طلبات اليوم',
        value: stats.todayOrders,
        accent: '#f59e0b',
      },
      {
        icon: <DollarSign size={22} />,
        label: 'إيرادات اليوم',
        value: formatCurrency(stats.todayRevenue),
        accent: '#10b981',
      },
      {
        icon: <Clock size={22} />,
        label: 'طلبات معلقة',
        value: stats.pendingOrders,
        accent: '#ef4444',
      },
      {
        icon: <Package size={22} />,
        label: 'أصناف المنيو',
        value: stats.totalMenuItems,
        accent: '#3b82f6',
      },
      {
        icon: <TrendingUp size={22} />,
        label: 'إجمالي الطلبات',
        value: stats.totalOrders,
        accent: '#8b5cf6',
      },
      {
        icon: <Star size={22} />,
        label: 'متوسط التقييم',
        value: `★ ${stats.avgRating}`,
        accent: '#f97316',
      },
    ];
  }, [stats]);

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'الآن';
    if (mins < 60) return `قبل ${mins} دقيقة`;

    const hours = Math.floor(mins / 60);
    return `قبل ${hours} ساعة`;
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading__spinner" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="admin-page admin-dashboard">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-dashboard__hero"
      >
        <div className="admin-dashboard__hero-copy">
          <span className="admin-dashboard__eyebrow">نظرة سريعة</span>
          <h1 className="admin-page__title">لوحة التحكم</h1>
          <p className="admin-page__subtitle">
            راقب حركة الطلبات والإيرادات وأحدث النشاطات من مكان واحد.
          </p>
        </div>

        <div className="admin-dashboard__hero-metrics">
          <div className="admin-dashboard__hero-pill">
            <span>إيراد اليوم</span>
            <strong>{formatCurrency(stats.todayRevenue)}</strong>
          </div>
          <div className="admin-dashboard__hero-pill">
            <span>طلبات بانتظار المتابعة</span>
            <strong>{stats.pendingOrders}</strong>
          </div>
        </div>
      </motion.section>

      <div className="admin-stats-grid admin-dashboard__stats">
        {statsCards.map((card, index) => (
          <StatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            accent={card.accent}
            delay={index * 0.05}
          />
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="admin-card admin-dashboard__table-card"
      >
        <div className="admin-dashboard__table-header">
          <div>
            <h2 className="admin-card__title">آخر الطلبات</h2>
            <p className="admin-page__subtitle">آخر الطلبات التي دخلت إلى المتجر الآن.</p>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الزبون</th>
                <th>المنطقة</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => {
                const statusInfo =
                  ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.pending;

                return (
                  <tr key={order.id}>
                    <td className="font-bold">{order.customerName || 'زبون'}</td>
                    <td>{order.deliveryArea || '-'}</td>
                    <td className="font-bold text-primary-dark">
                      {formatCurrency(order.total)}
                    </td>
                    <td>
                      <span
                        className="admin-badge"
                        style={{
                          background: statusInfo.bg,
                          color: statusInfo.color,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td>{getTimeAgo(typeof order.createdAt === 'number' ? order.createdAt : Date.now())}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  );
};

export default DashboardPage;

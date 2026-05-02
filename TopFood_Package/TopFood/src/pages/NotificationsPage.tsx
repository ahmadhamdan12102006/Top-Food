import React from 'react';
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  Clock3,
  Package,
  Star,
  Trash2,
  Truck,
} from 'lucide-react';
import { useNotificationStore, type Notification } from '../store/useNotificationStore';
import Button from '../components/common/Button';

const getNotificationIcon = (notification: Notification) => {
  switch (notification.icon || notification.type) {
    case 'clock':
    case 'reminder':
      return Clock3;
    case 'package':
      return Package;
    case 'truck':
    case 'order_update':
      return Truck;
    case 'star':
    case 'rating':
      return Star;
    case 'check':
      return CheckCircle2;
    default:
      return Bell;
  }
};

const NotificationsPage: React.FC = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearAll = useNotificationStore((state) => state.clearAll);

  return (
    <div className="page-shell space-y-6">
      <section className="premium-panel rounded-[30px] p-6 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-black">الإشعارات</h1>
            <p className="mt-2 text-sm text-text-muted dark:text-text-mutedDark">
              جميع تنبيهات الطلبات والتحديثات المهمة ستظهر هنا.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={markAllAsRead}>
              <CheckCheck size={18} />
              <span>تحديد الكل كمقروء</span>
            </Button>

            <Button variant="ghost" onClick={clearAll}>
              <Trash2 size={18} />
              <span>مسح الكل</span>
            </Button>
          </div>
        </div>
      </section>

      <section className="premium-panel rounded-[30px] p-6 sm:p-7">
        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-border-light bg-white/55 p-10 text-center dark:border-border-dark dark:bg-white/[0.03]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary-main/15 text-primary-dark dark:bg-primary-dark/20 dark:text-primary-light">
              <Bell size={26} />
            </div>
            <h2 className="text-2xl font-black">لا توجد إشعارات</h2>
            <p className="mt-3 text-sm text-text-muted dark:text-text-mutedDark">
              عندما تصل تحديثات جديدة ستظهر هنا بشكل مرتب وواضح.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification);

              return (
                <div
                  key={notification.id}
                  className={`rounded-[28px] border p-5 transition ${
                    notification.read
                      ? 'border-border-light bg-white/50 dark:border-border-dark dark:bg-white/[0.03]'
                      : 'border-primary-main/25 bg-primary-soft dark:border-primary-dark/25 dark:bg-primary-dark/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                          notification.read
                            ? 'bg-white/70 text-primary-dark dark:bg-white/[0.05] dark:text-primary-light'
                            : 'bg-primary-main text-black shadow-glow-primary'
                        }`}
                      >
                        <Icon size={19} />
                      </div>

                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black">{notification.title}</h3>
                          <span className="rounded-full bg-black/5 px-2 py-1 text-xs font-semibold dark:bg-white/[0.06]">
                            {notification.type === 'order_update'
                              ? 'تحديث طلب'
                              : notification.type === 'reminder'
                                ? 'تذكير'
                                : notification.type === 'rating'
                                  ? 'تقييم'
                                  : 'عام'}
                          </span>
                        </div>

                        <p className="text-sm leading-7 text-text-muted dark:text-text-mutedDark">
                          {notification.message}
                        </p>

                        {notification.createdAt && (
                          <p className="mt-3 text-xs font-semibold text-text-muted dark:text-text-mutedDark">
                            {new Date(notification.createdAt).toLocaleString('ar-PS')}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border-light bg-white/70 transition hover:bg-black/5 dark:border-border-dark dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
                      aria-label="حذف"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default NotificationsPage;

import { create } from 'zustand';

export type NotificationType =
  | 'order_update'
  | 'reminder'
  | 'rating'
  | 'general';

export type NotificationIcon =
  | 'bell'
  | 'clock'
  | 'package'
  | 'truck'
  | 'star'
  | 'check';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  icon?: NotificationIcon;
  orderId?: string;
  read: boolean;
  createdAt: number;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: () => number;
  addNotification: (
    notif: Omit<Notification, 'id' | 'read' | 'createdAt'> &
      Partial<Pick<Notification, 'type' | 'icon'>>
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  unreadCount: () => get().notifications.filter((notification) => !notification.read).length,

  addNotification: (notif) =>
    set((state) => ({
      notifications: [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: notif.type || 'general',
          icon: notif.icon,
          ...notif,
          read: false,
          createdAt: Date.now(),
        },
        ...state.notifications,
      ],
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      ),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),

  dismiss: (id) => get().removeNotification(id),

  clearAll: () => set({ notifications: [] }),
}));

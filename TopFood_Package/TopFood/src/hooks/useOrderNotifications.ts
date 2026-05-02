import { useEffect, useRef, useState } from 'react';

import { getOrdersByUser, isCompletedOrder, subscribeToOrderById } from '../services/orderService';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore, type NotificationIcon } from '../store/useNotificationStore';
import type { Order } from '../types';

const STORAGE_KEY = 'topfood-tracked-order-ids';
const STORAGE_EVENT = 'topfood-tracked-orders-updated';

const readTrackedOrderIds = (): string[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];
  } catch (error) {
    console.error('Failed to read tracked orders', error);
    return [];
  }
};

const writeTrackedOrderIds = (orderIds: string[]) => {
  if (typeof window === 'undefined') return;

  const nextIds = Array.from(new Set(orderIds.filter(Boolean)));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
};

export const rememberTrackedOrderId = (orderId: string) => {
  if (!orderId) return;
  writeTrackedOrderIds([...readTrackedOrderIds(), orderId]);
};

export const forgetTrackedOrderId = (orderId: string) => {
  if (!orderId) return;
  writeTrackedOrderIds(readTrackedOrderIds().filter((trackedId) => trackedId !== orderId));
};

const getOrderStatusMessage = (order: Order) => {
  switch (order.status) {
    case 'pending':
      return `تم استلام طلبك رقم ${order.orderNumber || order.id} وهو الآن بانتظار التأكيد.`;
    case 'preparing':
      return `طلبك رقم ${order.orderNumber || order.id} قيد التحضير الآن.`;
    case 'ready_for_pickup':
      return 'طلبك جاهز! توجه للمطعم لاستلامه.';
    case 'on_the_way':
      return 'طلبك في الطريق إليك الآن.';
    case 'delivered':
      return 'تم تسليم طلبك بنجاح. صحة وهنا.';
    case 'cancelled':
      return 'تم إلغاء طلبك. إذا احتجت مساعدة تواصل معنا.';
    default:
      return 'تم تحديث حالة طلبك.';
  }
};

const getOrderStatusIcon = (status: Order['status']): NotificationIcon => {
  switch (status) {
    case 'pending':
      return 'clock';
    case 'preparing':
    case 'ready_for_pickup':
      return 'package';
    case 'on_the_way':
      return 'truck';
    case 'delivered':
      return 'check';
    case 'cancelled':
    default:
      return 'bell';
  }
};

const isTrackableOrder = (order: Order) =>
  order.status !== 'cancelled' && !isCompletedOrder(order);

const isTerminalNotificationState = (order: Order) =>
  order.status === 'cancelled' ||
  order.status === 'delivered' ||
  (order.fulfillmentType === 'pickup' && order.status === 'ready_for_pickup');

export const useOrderNotifications = () => {
  const userId = useAuthStore((state) => state.user?.id);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [trackedOrderIds, setTrackedOrderIds] = useState<string[]>(() => readTrackedOrderIds());

  const subscriptionsRef = useRef<Record<string, () => void>>({});
  const previousStatusesRef = useRef<Record<string, Order['status']>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncTrackedOrders = () => {
      setTrackedOrderIds(readTrackedOrderIds());
    };

    window.addEventListener(STORAGE_EVENT, syncTrackedOrders);
    window.addEventListener('storage', syncTrackedOrders);

    return () => {
      window.removeEventListener(STORAGE_EVENT, syncTrackedOrders);
      window.removeEventListener('storage', syncTrackedOrders);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;

    getOrdersByUser(userId)
      .then((orders) => {
        if (!isMounted || !Array.isArray(orders)) {
          return;
        }

        const latestActiveOrder = [...orders]
          .filter(isTrackableOrder)
          .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))[0];

        if (latestActiveOrder) {
          rememberTrackedOrderId(latestActiveOrder.id);
        }
      })
      .catch((error) => {
        console.error('Failed to load active order notifications', error);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    const subscriptions = subscriptionsRef.current;
    const previousStatuses = previousStatusesRef.current;

    if (!userId) {
      Object.values(subscriptions).forEach((unsubscribe) => unsubscribe());
      subscriptionsRef.current = {};
      previousStatusesRef.current = {};
      return;
    }

    Object.keys(subscriptions).forEach((orderId) => {
      if (!trackedOrderIds.includes(orderId)) {
        subscriptions[orderId]?.();
        delete subscriptions[orderId];
        delete previousStatuses[orderId];
      }
    });

    trackedOrderIds.forEach((orderId) => {
      if (subscriptions[orderId]) {
        return;
      }

      subscriptions[orderId] = subscribeToOrderById(orderId, (order) => {
        if (!order) {
          forgetTrackedOrderId(orderId);
          return;
        }

        if (order.userId && order.userId !== userId) {
          return;
        }

        const previousStatus = previousStatuses[orderId];

        if (previousStatus && previousStatus !== order.status) {
          addNotification({
            title: 'تحديث على طلبك',
            message: getOrderStatusMessage(order),
            type: 'order_update',
            icon: getOrderStatusIcon(order.status),
            orderId: order.id,
          });
        }

        previousStatuses[orderId] = order.status;

        if (isTerminalNotificationState(order)) {
          forgetTrackedOrderId(orderId);
        }
      });
    });

    return () => {
      Object.values(subscriptionsRef.current).forEach((unsubscribe) => unsubscribe());
      subscriptionsRef.current = {};
      previousStatusesRef.current = {};
    };
  }, [addNotification, trackedOrderIds, userId]);
};

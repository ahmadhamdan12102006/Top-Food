import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Address, Order } from '../types';

export const calculateOrderLoyaltyPoints = (orderTotal: number) =>
  Math.max(1, Math.floor(Number(orderTotal || 0) / 10));

export const isCompletedOrder = (
  order: Pick<Order, 'status' | 'fulfillmentType'>
) =>
  order.status === 'delivered' ||
  (order.fulfillmentType === 'pickup' && order.status === 'ready_for_pickup');

export const calculateLoyaltyPointsFromOrders = (orders: Order[]) =>
  orders
    .filter(isCompletedOrder)
    .reduce((sum, order) => sum + calculateOrderLoyaltyPoints(order.total), 0);

type CreateOrderInput = {
  userId: string | null;
  customerName: string;
  customerPhone: string;
  fulfillmentType: Order['fulfillmentType'];
  driverNotes?: string;
  items: Order['items'];
  deliveryAddress: Address | null;
  deliveryArea?: string;
  deliveryFee: number;
  total: number;
  selectedDriverId?: string | null;
};

const generateOrderNumber = () => {
  const now = Date.now().toString().slice(-6);
  return `TF-${now}`;
};

// ✅ FIX: Use runTransaction to atomically create order + update driver status
export const createOrder = async (
  payload: CreateOrderInput
): Promise<string> => {
  try {
    const subtotal = payload.items.reduce(
      (sum, item) => sum + item.subtotal * item.quantity,
      0
    );

    const orderRef = doc(collection(db, 'orders'));
    const deliveryAddress =
      payload.fulfillmentType === 'delivery' ? payload.deliveryAddress : null;
    const deliveryArea =
      payload.fulfillmentType === 'pickup'
        ? 'pickup'
        : payload.deliveryArea || payload.deliveryAddress?.label || '';

    const orderData = {
      id: orderRef.id,
      orderNumber: generateOrderNumber(),
      userId: payload.userId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      fulfillmentType: payload.fulfillmentType,
      status: 'pending' as const,
      items: payload.items,
      subtotal,
      deliveryFee: payload.deliveryFee,
      total: payload.total,
      deliveryArea,
      deliveryAddress,
      driverNotes: payload.driverNotes || '',
      assignedDriverId: payload.selectedDriverId || null,
      selectedDriverId: payload.selectedDriverId || null,
      isGuest: !payload.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    };

    // ✅ Atomic: create order + update driver in one transaction
    await runTransaction(db, async (transaction) => {
      if (payload.selectedDriverId) {
        const driverRef = doc(db, 'drivers', payload.selectedDriverId);
        const driverSnapshot = await transaction.get(driverRef);

        if (!driverSnapshot.exists()) {
          throw new Error('السائق المحدد غير موجود');
        }

        const driverData = driverSnapshot.data() as {
          isActive?: boolean;
          currentOrderId?: string | null;
        };

        if (driverData.isActive === false) {
          throw new Error('هذا السائق خارج الخدمة حاليًا');
        }

        if (driverData.currentOrderId) {
          throw new Error('هذا السائق مشغول بطلب آخر');
        }

        transaction.update(driverRef, {
          currentOrderId: orderRef.id,
          updatedAt: Date.now(),
          updatedAtServer: serverTimestamp(),
        });
      }

      transaction.set(orderRef, orderData);
    });

    return orderRef.id;
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
};

export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const snapshot = await getDoc(orderRef);

    if (!snapshot.exists()) return null;

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as Order;
  } catch (error) {
    console.error('Get order by id error:', error);
    throw error;
  }
};

export const subscribeToOrderById = (
  orderId: string,
  callback: (order: Order | null) => void
) => {
  const orderRef = doc(db, 'orders', orderId);

  return onSnapshot(
    orderRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback({
        id: snapshot.id,
        ...snapshot.data(),
      } as Order);
    },
    (error) => {
      console.error('Subscribe to order error:', error);
      callback(null);
    }
  );
};

export const getOrderByOrderNumberAndPhone = async (
  orderNumber: string,
  phone: string
): Promise<Order | null> => {
  try {
    const orderQuery = query(
      collection(db, 'orders'),
      where('orderNumber', '==', orderNumber),
      where('customerPhone', '==', phone)
    );

    const snapshot = await getDocs(orderQuery);

    if (snapshot.empty) return null;

    const first = snapshot.docs[0];

    return {
      id: first.id,
      ...first.data(),
    } as Order;
  } catch (error) {
    console.error('Get order by order number and phone error:', error);
    throw error;
  }
};

export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', userId));

    const snapshot = await getDocs(ordersQuery);

    const orders = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as Order[];

    return orders.sort(
      (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)
    );
  } catch (error) {
    console.error('Get user orders error:', error);
    throw error;
  }
};

export const getOrdersByUser = getUserOrders;

export const getUserLoyaltyPoints = async (userId: string): Promise<number> => {
  const orders = await getUserOrders(userId);
  return calculateLoyaltyPointsFromOrders(orders);
};

export const cancelOrder = async (orderId: string, userId?: string | null) => {
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(orderRef);

    if (!snapshot.exists()) {
      throw new Error('الطلب غير موجود');
    }

    const order = snapshot.data() as Order;

    if (userId && order.userId && order.userId !== userId) {
      throw new Error('غير مصرح لك بإلغاء هذا الطلب');
    }

    if (order.status !== 'pending') {
      throw new Error('لا يمكن إلغاء الطلب بعد بدء التحضير');
    }

    transaction.update(orderRef, {
      status: 'cancelled',
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });

    if (order.assignedDriverId) {
      const driverRef = doc(db, 'drivers', order.assignedDriverId);
      const driverSnapshot = await transaction.get(driverRef);

      if (driverSnapshot.exists()) {
        const driver = driverSnapshot.data() as { currentOrderId?: string | null };

        if (!driver.currentOrderId || driver.currentOrderId === orderId) {
          transaction.update(driverRef, {
            currentOrderId: null,
            updatedAt: Date.now(),
            updatedAtServer: serverTimestamp(),
          });
        }
      }
    }
  });
};

export const getRecentOrders = async (limitCount: number = 20): Promise<Order[]> => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', 'not-in', ['cancelled', 'pending'])
    );

    const snapshot = await getDocs(ordersQuery);
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
    
    return orders
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, limitCount);
  } catch (error) {
    console.error('Get recent orders error:', error);
    return [];
  }
};

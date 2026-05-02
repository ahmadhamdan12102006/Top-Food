import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  runTransaction,
  serverTimestamp,
  getDoc,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  MenuItem,
  Order,
  OrderStatus,
  Review,
  Category,
  User,
} from '../types';
import { isCompletedOrder } from './orderService';
import { scheduleFeedbackRequest } from './feedbackService';

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalMenuItems: number;
  totalReviews: number;
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
  averageOrderValue: number;
  avgRating: number;
  recentOrders: Order[];
}

const calculateSubtotalFromItems = (order: Order): number => {
  return (order.items || []).reduce(
    (sum, item) => sum + Number(item.subtotal || 0) * Number(item.quantity || 0),
    0
  );
};

const normalizeOrder = (order: Order): Order => {
  const subtotal =
    typeof order.subtotal === 'number'
      ? order.subtotal
      : calculateSubtotalFromItems(order);

  return {
    ...order,
    userId: order.userId ?? null,
    orderNumber: order.orderNumber ?? `TF-${String(order.id).slice(-6).toUpperCase()}`,
    isGuest: order.isGuest ?? !order.userId,
    subtotal,
    deliveryFee: Number(order.deliveryFee || 0),
    total:
      typeof order.total === 'number'
        ? order.total
        : subtotal + Number(order.deliveryFee || 0),
    updatedAt: order.updatedAt ?? order.createdAt ?? Date.now(),
    assignedDriverId: order.assignedDriverId ?? null,
    customerName: order.customerName ?? '',
    customerPhone: order.customerPhone ?? '',
    deliveryArea: order.deliveryArea ?? '',
    driverNotes: order.driverNotes ?? '',
  };
};

const startOfToday = (): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

// ─── Menu Items ─────────────────────────────────────────

export const adminGetAllMenuItems = async (): Promise<MenuItem[]> => {
  try {
    const itemsRef = collection(db, 'menuItems');
    const q = query(itemsRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<MenuItem, 'id'>),
    }));
  } catch (error) {
    console.error('Admin: Error fetching all menu items:', error);
    throw error;
  }
};

export const adminAddMenuItem = async (
  item: Omit<MenuItem, 'id' | 'rating' | 'reviewCount'>
): Promise<string> => {
  try {
    const itemsRef = collection(db, 'menuItems');
    const newId = doc(itemsRef).id;

    const newItem: MenuItem = {
      id: newId,
      ...item,
      rating: 0,
      reviewCount: 0,
    };

    await setDoc(doc(db, 'menuItems', newId), newItem);
    return newId;
  } catch (error) {
    console.error('Admin: Error adding menu item:', error);
    throw error;
  }
};

export const adminUpdateMenuItem = async (
  id: string,
  data: Partial<MenuItem>
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'menuItems', id), data);
  } catch (error) {
    console.error('Admin: Error updating menu item:', error);
    throw error;
  }
};

export const adminDeleteMenuItem = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'menuItems', id));
  } catch (error) {
    console.error('Admin: Error deleting menu item:', error);
    throw error;
  }
};

// ─── Categories ─────────────────────────────────────────

export const adminGetAllCategories = async (): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<Category, 'id'>),
    }));
  } catch (error) {
    console.error('Admin: Error fetching categories:', error);
    throw error;
  }
};

export const adminAddCategory = async (
  category: Omit<Category, 'id'>
): Promise<string> => {
  try {
    const categoriesRef = collection(db, 'categories');
    const newId = doc(categoriesRef).id;

    await setDoc(doc(db, 'categories', newId), {
      id: newId,
      ...category,
    });

    return newId;
  } catch (error) {
    console.error('Admin: Error adding category:', error);
    throw error;
  }
};

export const adminUpdateCategory = async (
  id: string,
  data: Partial<Category>
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'categories', id), data);
  } catch (error) {
    console.error('Admin: Error updating category:', error);
    throw error;
  }
};

export const adminDeleteCategory = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    console.error('Admin: Error deleting category:', error);
    throw error;
  }
};

// ─── Orders ─────────────────────────────────────────────

export const adminGetAllOrders = async (): Promise<Order[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((document) =>
      normalizeOrder({
        id: document.id,
        ...(document.data() as Omit<Order, 'id'>),
      } as Order)
    );
  } catch (error) {
    console.error('Admin: Error fetching orders:', error);
    throw error;
  }
};

export const subscribeToAllOrders = (callback: (orders: Order[]) => void) => {
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((document) =>
      normalizeOrder({
        id: document.id,
        ...(document.data() as Omit<Order, 'id'>),
      } as Order)
    );

    callback(orders);
  });
};

// ✅ FIX: Deduct inventory when order moves to 'preparing'
const deductInventoryForOrder = async (
  transaction: Parameters<Parameters<typeof runTransaction>[1]>[0],
  order: Order
) => {
  // Each cart item may reference inventory slot items
  for (const cartItem of order.items || []) {
    const menuItemRef = doc(db, 'menuItems', cartItem.menuItem.id);
    const menuItemSnap = await transaction.get(menuItemRef);
    
    if (!menuItemSnap.exists()) continue;
    
    const menuItemData = menuItemSnap.data() as MenuItem;
    const qty = cartItem.quantity || 1;
    
    // Deduct each ingredient linked to inventory
    const ingredients = menuItemData.ingredients || [];
    for (const ingredientName of ingredients) {
      // Find inventory item by name
      const inventoryQuery = query(
        collection(db, 'inventory'),
        where('name', '==', ingredientName)
      );
      const inventorySnap = await getDocs(inventoryQuery);
      
      if (!inventorySnap.empty) {
        const invDoc = inventorySnap.docs[0];
        const invRef = doc(db, 'inventory', invDoc.id);
        const invData = invDoc.data();
        
        // Only deduct if item tracks quantity
        if (typeof invData.quantity === 'number') {
          transaction.update(invRef, {
            quantity: increment(-qty),
            updatedAt: Date.now(),
            updatedAtServer: serverTimestamp(),
          });
        }
      }
    }
  }
};

export const adminUpdateOrderStatus = async (
  id: string,
  status: OrderStatus,
  userId?: string | null
): Promise<void> => {
  try {
    let orderDataCopy: Order | null = null;
    let previousStatusCopy: OrderStatus | null = null;

    await runTransaction(db, async (transaction) => {
      // 1. ALL READS
      const orderRef = doc(db, 'orders', id);
      const orderSnapshot = await transaction.get(orderRef);

      if (!orderSnapshot.exists()) {
        throw new Error('الطلب غير موجود في قاعدة البيانات');
      }

      const orderData = orderSnapshot.data() as Order;
      const previousStatus = orderData.status;

      orderDataCopy = orderData;
      previousStatusCopy = previousStatus;

      let driverSnapshot = null;
      let driverRef = null;
      const driverId = orderData.assignedDriverId;
      if (driverId) {
        driverRef = doc(db, 'drivers', driverId);
        driverSnapshot = await transaction.get(driverRef);
      }

      // 2. ALL WRITES
      const newHistory = [...(orderData.statusHistory || []), {
        status,
        timestamp: Date.now(),
        by: 'admin',
      }];

      transaction.update(orderRef, {
        status,
        statusHistory: newHistory,
        updatedAt: Date.now(),
        updatedAtServer: serverTimestamp(),
      });

      if (isCompletedOrder({ status, fulfillmentType: orderData.fulfillmentType })) {
        const todayKey = new Date().toISOString().split('T')[0];
        const statsRef = doc(db, 'dailyStats', todayKey);
        transaction.set(
          statsRef,
          {
            date: todayKey,
            revenue: increment(orderData.total || 0),
            orderCount: increment(1),
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }

      if (driverSnapshot && driverSnapshot.exists() && driverRef) {
        const driverData = driverSnapshot.data();

        if (status === 'on_the_way') {
          transaction.update(driverRef, {
            currentOrderId: id,
            updatedAt: Date.now(),
            updatedAtServer: serverTimestamp(),
          });
        } else if (
          status === 'delivered' ||
          status === 'cancelled' ||
          (orderData.fulfillmentType === 'pickup' && status === 'ready_for_pickup')
        ) {
          if (!driverData.currentOrderId || driverData.currentOrderId === id) {
            transaction.update(driverRef, {
              currentOrderId: null,
              updatedAt: Date.now(),
              updatedAtServer: serverTimestamp(),
            });
          }
        }
      }
    });

    // Post-transaction logic
    if (status === 'preparing' && previousStatusCopy === 'pending' && orderDataCopy) {
      try {
        // Run this outside transaction to avoid complex nested read/write rules
        // since inventory updates are best-effort anyway.
        await runTransaction(db, async (invTransaction) => {
          await deductInventoryForOrder(invTransaction, orderDataCopy!);
        });
      } catch (invError) {
        console.warn('Inventory deduction warning:', invError);
      }
    }

    if (status === 'delivered' && userId) {
      try {
        await scheduleFeedbackRequest(id, userId);
      } catch (err) {
        console.error('Failed to schedule feedback:', err);
      }
    }
  } catch (error: unknown) {
    console.error('Admin: Error updating order status:', error);
    throw error;
  }
};

export const adminAssignDriver = async (
  orderId: string,
  driverId: string | null
): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. ALL READS
      const orderRef = doc(db, 'orders', orderId);
      const orderSnapshot = await transaction.get(orderRef);

      if (!orderSnapshot.exists()) {
        throw new Error('الطلب غير موجود');
      }

      const order = orderSnapshot.data() as Order;
      const previousDriverId = order.assignedDriverId || null;

      if (order.fulfillmentType === 'pickup' && driverId) {
        throw new Error('طلبات الاستلام لا تحتاج إلى سائق');
      }

      let previousDriverSnapshot = null;
      let previousDriverRef = null;
      if (previousDriverId && previousDriverId !== driverId) {
        previousDriverRef = doc(db, 'drivers', previousDriverId);
        previousDriverSnapshot = await transaction.get(previousDriverRef);
      }

      let nextDriverSnapshot = null;
      let nextDriverRef = null;
      if (driverId) {
        nextDriverRef = doc(db, 'drivers', driverId);
        nextDriverSnapshot = await transaction.get(nextDriverRef);
      }

      // Validations
      if (nextDriverSnapshot && nextDriverSnapshot.exists()) {
        const nextDriver = nextDriverSnapshot.data() as {
          isActive?: boolean;
          currentOrderId?: string | null;
        };

        if (nextDriver.isActive === false) {
          throw new Error('هذا السائق خارج الخدمة');
        }

        if (nextDriver.currentOrderId && nextDriver.currentOrderId !== orderId) {
          throw new Error('هذا السائق مشغول بطلب آخر');
        }
      }

      // 2. ALL WRITES
      if (previousDriverSnapshot && previousDriverSnapshot.exists() && previousDriverRef) {
        const previousDriver = previousDriverSnapshot.data() as {
          currentOrderId?: string | null;
        };
        if (!previousDriver.currentOrderId || previousDriver.currentOrderId === orderId) {
          transaction.update(previousDriverRef, {
            currentOrderId: null,
            updatedAt: Date.now(),
            updatedAtServer: serverTimestamp(),
          });
        }
      }

      if (nextDriverSnapshot && nextDriverSnapshot.exists() && nextDriverRef) {
        transaction.update(nextDriverRef, {
          currentOrderId: orderId,
          updatedAt: Date.now(),
          updatedAtServer: serverTimestamp(),
        });
      }

      transaction.update(orderRef, {
        assignedDriverId: driverId ?? null,
        updatedAt: Date.now(),
        updatedAtServer: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('Admin: Error assigning driver:', error);
    throw error;
  }
};

export const adminDeleteOrder = async (id: string): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. ALL READS
      const orderRef = doc(db, 'orders', id);
      const orderSnapshot = await transaction.get(orderRef);

      if (!orderSnapshot.exists()) {
        return;
      }

      const order = orderSnapshot.data() as Order;

      let driverSnapshot = null;
      let driverRef = null;
      if (order.assignedDriverId) {
        driverRef = doc(db, 'drivers', order.assignedDriverId);
        driverSnapshot = await transaction.get(driverRef);
      }

      // 2. ALL WRITES
      if (driverSnapshot && driverSnapshot.exists() && driverRef) {
        const driver = driverSnapshot.data() as { currentOrderId?: string | null };

        if (!driver.currentOrderId || driver.currentOrderId === id) {
          transaction.update(driverRef, {
            currentOrderId: null,
            updatedAt: Date.now(),
            updatedAtServer: serverTimestamp(),
          });
        }
      }

      transaction.delete(orderRef);
    });
  } catch (error) {
    console.error('Admin: Error deleting order:', error);
    throw error;
  }
};

export const adminDeleteAllOrders = async (): Promise<void> => {
  try {
    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    
    if (snapshot.empty) return;

    for (const d of snapshot.docs) {
      await adminDeleteOrder(d.id);
    }
  } catch (error) {
    console.error('Admin: Error deleting all orders:', error);
    throw error;
  }
};

// ─── Reviews ────────────────────────────────────────────

export const adminGetAllReviews = async (): Promise<Review[]> => {
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<Review, 'id'>),
    }));
  } catch (error) {
    console.error('Admin: Error fetching reviews:', error);
    throw error;
  }
};

export const adminDeleteReview = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'reviews', id));
  } catch (error) {
    console.error('Admin: Error deleting review:', error);
    throw error;
  }
};

// ─── Dashboard Stats ─────────────────────────────────────
// ✅ FIX: Optimized - use limit queries + dailyStats doc instead of fetching all orders

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const todayStart = startOfToday();
    const todayKey = new Date().toISOString().split('T')[0];

    const [
      usersSnapshot,
      menuSnapshot,
      reviewsSnapshot,
      recentOrdersSnapshot,
      pendingSnapshot,
      todayOrdersSnapshot,
      deliveredSnapshot,
      dailyStatsSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'menuItems')),
      getDocs(collection(db, 'reviews')),
      getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5))),
      // Count pending orders only
      getDocs(query(collection(db, 'orders'), where('status', '==', 'pending'))),
      // Today's orders only
      getDocs(query(
        collection(db, 'orders'),
        where('createdAt', '>=', todayStart),
        orderBy('createdAt', 'desc')
      )),
      // Delivered/completed count
      getDocs(query(collection(db, 'orders'), where('status', '==', 'delivered'), limit(500))),
      // Cached daily stats
      getDoc(doc(db, 'dailyStats', todayKey)),
    ]);

    const todayOrders = todayOrdersSnapshot.docs.map((d) =>
      normalizeOrder({ id: d.id, ...(d.data() as Omit<Order, 'id'>) } as Order)
    );

    // Use cached daily stats if available, otherwise calculate from today's orders
    let todayRevenue = 0;
    if (dailyStatsSnap.exists()) {
      todayRevenue = Number(dailyStatsSnap.data().revenue || 0);
    } else {
      todayRevenue = todayOrders
        .filter(isCompletedOrder)
        .reduce((sum, o) => sum + o.total, 0);
    }

    // Calculate average order value from a sample (recent 100 orders)
    const allOrdersSample = await getDocs(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100))
    );
    const sampleOrders = allOrdersSample.docs.map((d) =>
      normalizeOrder({ id: d.id, ...(d.data() as Omit<Order, 'id'>) } as Order)
    );

    const avgOrderValue =
      sampleOrders.length > 0
        ? sampleOrders.reduce((sum, o) => sum + o.total, 0) / sampleOrders.length
        : 0;

    const avgRating =
      menuSnapshot.size > 0
        ? menuSnapshot.docs.reduce(
            (sum, document) => sum + Number(document.data().rating || 0),
            0
          ) / menuSnapshot.size
        : 0;

    const recentOrders: Order[] = recentOrdersSnapshot.docs.map((document) =>
      normalizeOrder({
        id: document.id,
        ...(document.data() as Omit<Order, 'id'>),
      } as Order)
    );

    // Get total orders count efficiently

    // Approximate count using size from snapshot (for large datasets use count() API if available)
    const totalOrdersApprox = allOrdersSample.size; // approximation

    return {
      totalUsers: usersSnapshot.size,
      totalOrders: totalOrdersApprox,
      totalMenuItems: menuSnapshot.size,
      totalReviews: reviewsSnapshot.size,
      todayOrders: todayOrders.length,
      todayRevenue,
      pendingOrders: pendingSnapshot.size,
      deliveredOrders: deliveredSnapshot.size,
      averageOrderValue: Number(avgOrderValue.toFixed(2)),
      avgRating: Number(avgRating.toFixed(1)),
      recentOrders,
    };
  } catch (error) {
    console.error('Admin: Error computing dashboard stats:', error);
    throw error;
  }
};

export const getTodayOrders = async (): Promise<Order[]> => {
  try {
    const todayStart = startOfToday();

    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', todayStart),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((document) =>
      normalizeOrder({
        id: document.id,
        ...(document.data() as Omit<Order, 'id'>),
      } as Order)
    );
  } catch (error) {
    console.error("Admin: Error fetching today's orders:", error);
    throw error;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));

    return snapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as Omit<User, 'id'>),
    }));
  } catch (error) {
    console.error('Admin: Error fetching users:', error);
    throw error;
  }
};

export const getAllMenuItems = async (): Promise<MenuItem[]> => {
  return adminGetAllMenuItems();
};

export const getAllReviews = async (): Promise<Review[]> => {
  return adminGetAllReviews();
};

export const deleteReview = async (id: string): Promise<void> => {
  return adminDeleteReview(id);
};

// ─── Site Settings ──────────────────────────────────────

import { getSiteSettings, updateSiteSettings } from './settingsService';

export const adminGetSettings = getSiteSettings;
export const adminUpdateSettings = updateSiteSettings;

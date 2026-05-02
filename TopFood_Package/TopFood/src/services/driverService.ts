import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from './firebase';
import type { Driver, Order } from '../types';

const withDriverDefaults = (
  driverId: string,
  data?: Partial<Driver> | null
): Driver => ({
  id: driverId,
  name: data?.name || '',
  phone: data?.phone || '',
  pin: data?.pin || '',
  isActive: data?.isActive !== false,
  balance: Number(data?.balance || 0),
  currentOrderId: data?.currentOrderId ?? null,
  averageRating: Number(data?.averageRating || 0),
  totalRatings: Number(data?.totalRatings || 0),
  createdAt: data?.createdAt,
  updatedAt: data?.updatedAt,
});

export const subscribeToAvailableOrders = (
  callback: (orders: Order[]) => void
) => {
  const ordersRef = collection(db, 'orders');
  const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(ordersQuery, (snapshot) => {
    const orders = snapshot.docs
      .map((document) => ({
        id: document.id,
        ...document.data(),
      }) as Order)
      .filter(
        (order) =>
          order.fulfillmentType !== 'pickup' &&
          (order.status === 'pending' || order.status === 'preparing') &&
          !order.assignedDriverId
      ) as Order[];

    callback(orders);
  });
};

export const subscribeToMyOrders = (
  driverId: string,
  callback: (orders: Order[]) => void
) => {
  const ordersRef = collection(db, 'orders');
  // Removed where/orderBy to avoid index requirement during development
  const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(ordersQuery, (snapshot) => {
    const orders = snapshot.docs
      .map((document) => ({
        id: document.id,
        ...document.data(),
      }) as Order)
      .filter((order) => order.assignedDriverId === driverId) as Order[];

    callback(orders);
  });
};

export const acceptOrder = async (orderId: string, driverId: string) => {
  const orderRef = doc(db, 'orders', orderId);
  const driverRef = doc(db, 'drivers', driverId);

  await runTransaction(db, async (transaction) => {
    const [orderSnapshot, driverSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(driverRef),
    ]);

    if (!orderSnapshot.exists()) {
      throw new Error('الطلب غير موجود');
    }

    if (!driverSnapshot.exists()) {
      throw new Error('السائق غير موجود');
    }

    const order = orderSnapshot.data() as Order;
    const driver = withDriverDefaults(driverId, driverSnapshot.data() as Partial<Driver>);

    if (order.fulfillmentType === 'pickup') {
      throw new Error('طلبات الاستلام لا تظهر للسائق');
    }

    if (order.status === 'cancelled' || order.status === 'delivered') {
      throw new Error('لا يمكن قبول هذا الطلب بحالته الحالية');
    }

    if (order.assignedDriverId && order.assignedDriverId !== driverId) {
      throw new Error('تم أخذ الطلب من سائق آخر');
    }

    if (!driver.isActive) {
      throw new Error('السائق خارج الخدمة حاليًا');
    }

    if (driver.currentOrderId && driver.currentOrderId !== orderId) {
      throw new Error('السائق مشغول بطلب آخر');
    }

    transaction.update(orderRef, {
      assignedDriverId: driverId,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });

    transaction.update(driverRef, {
      currentOrderId: orderId,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });
  });
};

export const startDelivery = async (orderId: string): Promise<void> => {
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(orderRef);

    if (!snapshot.exists()) {
      throw new Error('الطلب غير موجود');
    }

    const order = snapshot.data() as Order;

    if (order.status === 'cancelled' || order.status === 'delivered') {
      throw new Error('لا يمكن بدء التوصيل لهذا الطلب');
    }

    if (!order.assignedDriverId) {
      throw new Error('يجب تعيين سائق أولًا');
    }

    if (order.status === 'on_the_way') {
      return;
    }

    const newHistory = [...(order.statusHistory || []), {
      status: 'on_the_way',
      timestamp: Date.now(),
      by: order.assignedDriverId,
    }];

    transaction.update(orderRef, {
      status: 'on_the_way',
      statusHistory: newHistory,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });

    const driverRef = doc(db, 'drivers', order.assignedDriverId);
    const driverSnapshot = await transaction.get(driverRef);

    if (driverSnapshot.exists()) {
      transaction.update(driverRef, {
        currentOrderId: orderId,
        updatedAt: Date.now(),
        updatedAtServer: serverTimestamp(),
      });
    }
  });
};

export const completeDelivery = async (orderId: string): Promise<void> => {
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);

    if (!orderSnapshot.exists()) {
      throw new Error('الطلب غير موجود');
    }

    const order = orderSnapshot.data() as Order;

    if (order.status !== 'on_the_way') {
      throw new Error('لا يمكن إكمال التوصيل قبل بدء التوصيل');
    }

    if (!order.assignedDriverId) {
      throw new Error('لا يوجد سائق مخصص لهذا الطلب');
    }

    const driverRef = doc(db, 'drivers', order.assignedDriverId);
    const driverSnapshot = await transaction.get(driverRef);

    if (!driverSnapshot.exists()) {
      throw new Error('السائق غير موجود');
    }

    const driver = withDriverDefaults(
      order.assignedDriverId,
      driverSnapshot.data() as Partial<Driver>
    );

    const newHistory = [...(order.statusHistory || []), {
      status: 'delivered',
      timestamp: Date.now(),
      by: order.assignedDriverId,
    }];

    transaction.update(orderRef, {
      status: 'delivered',
      statusHistory: newHistory,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });

    transaction.update(driverRef, {
      balance: Number(driver.balance || 0) + Number(order.deliveryFee || 0),
      currentOrderId: null,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });
  });
};

export const loginDriverWithPin = async (
  phone: string,
  pin: string
): Promise<{ id: string; name: string } | null> => {
  const driversRef = collection(db, 'drivers');
  const driversQuery = query(driversRef, where('phone', '==', phone));
  const snapshot = await getDocs(driversQuery);

  if (snapshot.empty) {
    return null;
  }

  const driverDoc = snapshot.docs[0];
  const driverData = withDriverDefaults(
    driverDoc.id,
    driverDoc.data() as Partial<Driver>
  );

  if (!driverData.isActive || driverData.pin !== pin) {
    return null;
  }

  return { id: driverDoc.id, name: driverData.name };
};

export const getAllDrivers = async (): Promise<Driver[]> => {
  const driversRef = collection(db, 'drivers');
  const driversQuery = query(driversRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(driversQuery);

  return snapshot.docs.map((document) =>
    withDriverDefaults(document.id, document.data() as Partial<Driver>)
  );
};

export const getAvailableDrivers = async (): Promise<Driver[]> => {
  return getAllDrivers();
};

export const saveDriver = async (driver: Partial<Driver>): Promise<Driver> => {
  if (!driver.name || !driver.phone || !driver.pin) {
    throw new Error('جميع الحقول الأساسية مطلوبة');
  }

  const driverId = driver.id || doc(collection(db, 'drivers')).id;
  const driverRef = doc(db, 'drivers', driverId);

  const payload: Driver = {
    id: driverId,
    name: driver.name.trim(),
    phone: driver.phone.trim(),
    pin: driver.pin.trim(),
    isActive: driver.isActive !== false,
    balance: Number(driver.balance || 0),
    currentOrderId: driver.currentOrderId ?? null,
    averageRating: Number(driver.averageRating || 0),
    totalRatings: Number(driver.totalRatings || 0),
    createdAt: driver.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(
    driverRef,
    {
      ...payload,
      updatedAtServer: serverTimestamp(),
      createdAtServer: serverTimestamp(),
    },
    { merge: true }
  );

  return payload;
};

export const deleteDriver = async (driverId: string) => {
  await deleteDoc(doc(db, 'drivers', driverId));
};

export const toggleDriverActive = async (
  driverId: string,
  nextState: boolean
) => {
  await updateDoc(doc(db, 'drivers', driverId), {
    isActive: nextState,
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  });
};

export const resetDriverBalance = async (driverId: string) => {
  await updateDoc(doc(db, 'drivers', driverId), {
    balance: 0,
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  });
};

export const setDriverBusy = async (driverId: string, orderId: string) => {
  const driverRef = doc(db, 'drivers', driverId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(driverRef);

    if (!snapshot.exists()) {
      throw new Error('السائق غير موجود');
    }

    const driver = withDriverDefaults(driverId, snapshot.data() as Partial<Driver>);

    if (!driver.isActive) {
      throw new Error('السائق خارج الخدمة');
    }

    if (driver.currentOrderId && driver.currentOrderId !== orderId) {
      throw new Error('السائق مشغول بطلب آخر');
    }

    transaction.update(driverRef, {
      currentOrderId: orderId,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });
  });
};

export const setDriverAvailable = async (driverId: string) => {
  await updateDoc(doc(db, 'drivers', driverId), {
    currentOrderId: null,
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  });
};

export const rateDriver = async (driverId: string, rating: number) => {
  const driverRef = doc(db, 'drivers', driverId);
  const snapshot = await getDoc(driverRef);

  if (!snapshot.exists()) return;

  const driver = withDriverDefaults(driverId, snapshot.data() as Partial<Driver>);
  const normalizedRating = Math.min(5, Math.max(1, Number(rating || 0)));

  const currentTotal = driver.totalRatings || 0;
  const currentAvg = driver.averageRating || 0;
  const newTotal = currentTotal + 1;
  const newAvg = Number(
    ((currentAvg * currentTotal + normalizedRating) / newTotal).toFixed(1)
  );

  await updateDoc(driverRef, {
    averageRating: newAvg,
    totalRatings: newTotal,
    updatedAt: Date.now(),
    updatedAtServer: serverTimestamp(),
  });
};

export const addDriverRating = async (params: {
  driverId: string;
  userId: string;
  rating: number;
  comment?: string;
  userName?: string | null;
}) => {
  const { driverId, userId, rating, comment, userName } = params;
  const ratingRef = doc(collection(db, 'driverRatings'));
  const driverRef = doc(db, 'drivers', driverId);

  await runTransaction(db, async (transaction) => {
    const driverSnap = await transaction.get(driverRef);
    if (!driverSnap.exists()) throw new Error('السائق غير موجود');

    const driver = withDriverDefaults(driverId, driverSnap.data() as Partial<Driver>);
    const normalizedRating = Math.min(5, Math.max(1, Number(rating || 0)));

    const currentTotal = driver.totalRatings || 0;
    const currentAvg = driver.averageRating || 0;
    const newTotal = currentTotal + 1;
    const newAvg = Number(
      ((currentAvg * currentTotal + normalizedRating) / newTotal).toFixed(1)
    );

    transaction.set(ratingRef, {
      id: ratingRef.id,
      driverId,
      userId,
      rating: normalizedRating,
      comment: comment || '',
      userName: userName || null, // null means anonymous
      createdAt: Date.now(),
      createdAtServer: serverTimestamp(),
    });

    transaction.update(driverRef, {
      averageRating: newAvg,
      totalRatings: newTotal,
      updatedAt: Date.now(),
      updatedAtServer: serverTimestamp(),
    });
  });
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  Receipt,
  Store,
  Truck,
  Star,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../components/common/Button';
import { cancelOrder, subscribeToOrderById } from '../services/orderService';
import { addDriverRating } from '../services/driverService';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency } from '../utils';
import type { Order } from '../types';
import MotorcyclePath from '../components/home/MotorcyclePath';

const deliveryStatusFlow: Order['status'][] = [
  'pending',
  'preparing',
  'on_the_way',
  'delivered',
];

const pickupStatusFlow: Order['status'][] = [
  'pending',
  'preparing',
  'ready_for_pickup',
  'delivered',
];

const deliverySteps = [
  { key: 'pending', label: 'استلام الطلب', icon: Clock },
  { key: 'preparing', label: 'جاري التحضير', icon: ChefHat },
  { key: 'on_the_way', label: 'في الطريق', icon: Truck },
  { key: 'delivered', label: 'تم التسليم', icon: CheckCircle2 },
] as const;

const pickupSteps = [
  { key: 'pending', label: 'استلام الطلب', icon: Clock },
  { key: 'preparing', label: 'جاري التحضير', icon: ChefHat },
  { key: 'ready_for_pickup', label: 'جاهز للاستلام', icon: Package },
  { key: 'delivered', label: 'تم الاستلام', icon: CheckCircle2 },
] as const;

const getStatusLabel = (status: Order['status']) => {
  switch (status) {
    case 'pending':
      return 'قيد الانتظار';
    case 'preparing':
      return 'قيد التحضير';
    case 'ready_for_pickup':
      return 'جاهز للاستلام';
    case 'on_the_way':
      return 'في الطريق';
    case 'delivered':
      return 'تم التسليم';
    case 'cancelled':
      return 'تم الإلغاء';
    default:
      return 'غير معروف';
  }
};

const getLiveMessage = (status: Order['status']) => {
  switch (status) {
    case 'pending':
      return 'تم استلام طلبك وهو الآن بانتظار التأكيد.';
    case 'preparing':
      return 'يتم تجهيز طلبك الآن داخل المطعم.';
    case 'ready_for_pickup':
      return 'طلبك جاهز للاستلام من المطعم الآن.';
    case 'on_the_way':
      return 'طلبك خرج للتوصيل وهو في الطريق إليك.';
    case 'delivered':
      return 'تم تسليم الطلب بنجاح. صحتين.';
    case 'cancelled':
      return 'تم إلغاء هذا الطلب.';
    default:
      return 'يتم تحديث حالة الطلب الآن.';
  }
};

const getStatusToastMessage = (status: Order['status']) => {
  switch (status) {
    case 'pending':
      return 'تم استلام طلبك';
    case 'preparing':
      return 'طلبك الآن قيد التحضير';
    case 'ready_for_pickup':
      return 'طلبك جاهز للاستلام من المطعم';
    case 'on_the_way':
      return 'طلبك الآن في الطريق';
    case 'delivered':
      return 'تم تسليم الطلب بنجاح';
    case 'cancelled':
      return 'تم إلغاء الطلب';
    default:
      return 'تم تحديث حالة الطلب';
  }
};

const triggerStatusFeedback = (status: Order['status']) => {
  const message = getStatusToastMessage(status);

  if (status === 'delivered') {
    toast.success(message, { duration: 4000 });
  } else if (status === 'cancelled') {
    toast.error(message, { duration: 4000 });
  } else {
    toast(message, { duration: 3500 });
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    if (status === 'delivered') {
      navigator.vibrate([120, 60, 160]);
    } else if (status === 'cancelled') {
      navigator.vibrate([220, 80, 220]);
    } else {
      navigator.vibrate(120);
    }
  }
};

const TrackOrderPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [params] = useSearchParams();
  const orderId = params.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const previousStatusRef = useRef<Order['status'] | null>(null);
  const hasInitializedRef = useRef(false);

  const [driverRating, setDriverRating] = useState(0);
  const [driverComment, setDriverComment] = useState('');
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [hasRatedDriver, setHasRatedDriver] = useState(false);

  const handleRateDriver = async () => {
    if (!order?.assignedDriverId || !user) return;
    if (driverRating === 0) {
      toast.error('يرجى اختيار تقييم أولاً');
      return;
    }

    setIsRatingSubmitting(true);
    try {
      await addDriverRating({
        driverId: order.assignedDriverId,
        userId: user.id,
        rating: driverRating,
        comment: driverComment.trim(),
        userName: user.anonymousDriverRatings ? null : user.name,
      });
      setHasRatedDriver(true);
      toast.success('شكرًا لتقييمك!');
    } catch (error) {
      console.error('Failed to rate driver:', error);
      toast.error('حدث خطأ أثناء إرسال التقييم');
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToOrderById(orderId, (liveOrder) => {
      setOrder((prevOrder) => {
        if (liveOrder && hasInitializedRef.current) {
          const previousStatus = prevOrder?.status ?? previousStatusRef.current;

          if (previousStatus && previousStatus !== liveOrder.status) {
            triggerStatusFeedback(liveOrder.status);
          }
        }

        if (liveOrder) {
          previousStatusRef.current = liveOrder.status;
          hasInitializedRef.current = true;
        }

        return liveOrder;
      });

      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  const currentFlow = order?.fulfillmentType === 'pickup' ? pickupStatusFlow : deliveryStatusFlow;
  const currentSteps = order?.fulfillmentType === 'pickup' ? pickupSteps : deliverySteps;

  const currentStepIndex = useMemo(() => {
    if (!order) return -1;
    return currentFlow.indexOf(order.status);
  }, [order, currentFlow]);

  // Estimate remaining time based on order creation. E.g. ~30 mins average delivery.
  const estimatedTimeRemaining = useMemo(() => {
    if (!order || order.status === 'delivered' || order.status === 'cancelled') return null;
    const createdAt = order.createdAt;
    const now = Date.now();
    const elapsedMins = Math.floor((now - createdAt) / 60000);
    const totalExpectedMins = order.fulfillmentType === 'pickup' ? 20 : 40;
    const remaining = Math.max(1, totalExpectedMins - elapsedMins);
    return remaining;
  }, [order]);

  if (!orderId) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-surface-dark">
          <h1 className="mb-3 text-2xl font-black">لا يوجد طلب</h1>
          <p className="text-gray-500">الرابط لا يحتوي على رقم طلب صالح.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-surface-dark">
          <Loader2
            size={44}
            className="mx-auto mb-4 animate-spin text-primary-main"
          />
          <h1 className="mb-2 text-2xl font-black">جاري تحميل الطلب...</h1>
          <p className="text-gray-500">نقوم بجلب آخر تحديثات الطلب</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-surface-dark">
          <h1 className="mb-3 text-2xl font-black">الطلب غير موجود</h1>
          <p className="text-gray-500">تعذر العثور على الطلب المطلوب.</p>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const isPickupOrder = order.fulfillmentType === 'pickup';
  const canCancel = order.status === 'pending';
  const pickupMessage =
    order.status === 'ready_for_pickup'
      ? 'طلبك جاهز! توجه للمطعم لاستلامه'
      : 'طلبك قيد التحضير في المطعم';

  const handleCancelOrder = async () => {
    if (!canCancel) return;

    try {
      setCancelling(true);
      await cancelOrder(order.id, user?.id ?? order.userId);
      toast.success('تم إلغاء الطلب بنجاح');
    } catch (error) {
      console.error('Cancel order error:', error);
      toast.error(
        error instanceof Error ? error.message : 'تعذر إلغاء الطلب الآن'
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="mb-3 text-3xl font-black sm:text-4xl">تتبع الطلب</h1>
        <p className="text-gray-500 dark:text-gray-400">
          هذه الصفحة تتحدث تلقائيًا بشكل مباشر
        </p>
      </div>

      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-surface-dark sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm text-gray-500">رقم الطلب</p>
            <h2 className="text-xl font-black sm:text-2xl">
              {order.orderNumber || order.id}
            </h2>
          </div>

          <div
            className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${
              order.status === 'delivered'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : order.status === 'cancelled'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-primary-main/15 text-primary-dark'
            }`}
          >
            {getStatusLabel(order.status)}
          </div>
        </div>

        {canCancel && (
          <div className="mb-5 flex justify-end">
            <Button
              onClick={handleCancelOrder}
              disabled={cancelling}
              variant="ghost"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-rose-600 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-300"
            >
              {cancelling ? 'جاري الإلغاء...' : 'إلغاء الطلب'}
            </Button>
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-black sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-main/15">
              {order.status === 'delivered' ? (
                <CheckCircle2 size={22} className="text-green-600" />
              ) : order.status === 'on_the_way' ? (
                <Truck size={22} className="text-primary-dark" />
              ) : order.status === 'ready_for_pickup' ? (
                <Package size={22} className="text-primary-dark" />
              ) : order.status === 'preparing' ? (
                <ChefHat size={22} className="text-primary-dark" />
              ) : (
                <Clock size={22} className="text-primary-dark" />
              )}
            </div>

            <div className="flex-1">
              <p className="mb-1 font-black">آخر تحديث</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 sm:text-base">
                {getLiveMessage(order.status)}
              </p>
            </div>
          </div>

        {order.status === 'on_the_way' && (
            <div className="mt-6">
              <MotorcyclePath progress={65} />
            </div>
          )}
        </div>
      </div>

      {order.status === 'delivered' && order.assignedDriverId && !isPickupOrder && (
        <div className="mb-6 rounded-3xl border border-primary-main/20 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-main/10 text-primary-dark">
              <Star size={24} className="fill-primary-main" />
            </div>
            <div>
              <h3 className="text-xl font-black">تقييم السائق</h3>
              <p className="text-sm text-gray-500">كيف كانت تجربة التوصيل؟</p>
            </div>
          </div>

          {hasRatedDriver ? (
            <div className="py-4 text-center">
              <div className="mb-2 flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={24}
                    className={i < driverRating ? 'fill-primary-main text-primary-main' : 'text-gray-200'}
                  />
                ))}
              </div>
              <p className="font-bold text-green-600">تم إرسال تقييمك بنجاح. شكراً لك!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center gap-3 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setDriverRating(star)}
                    className="transition-transform active:scale-90"
                  >
                    <Star
                      size={36}
                      className={star <= driverRating ? 'fill-primary-main text-primary-main' : 'text-gray-200 dark:text-gray-700'}
                    />
                  </button>
                ))}
              </div>

              <textarea
                value={driverComment}
                onChange={(e) => setDriverComment(e.target.value)}
                placeholder="اكتب ملاحظاتك عن السائق (اختياري)..."
                rows={3}
                className="w-full resize-none rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm focus:border-primary-main focus:outline-none dark:border-gray-800 dark:bg-black"
              />

              <Button
                onClick={handleRateDriver}
                loading={isRatingSubmitting}
                className="w-full rounded-2xl py-4 font-black"
              >
                إرسال التقييم
              </Button>
            </div>
          )}
        </div>
      )}

      {isPickupOrder && !isCancelled && (
        <div className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-900/10 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              <Store size={22} />
            </div>

            <div>
              <h3 className="mb-2 text-xl font-black">طلبات الاستلام</h3>
              <p className="leading-7 text-gray-700 dark:text-gray-200">
                {pickupMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isCancelled && !isPickupOrder && (
        <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-surface-dark sm:p-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black">مراحل الطلب</h3>
              {estimatedTimeRemaining && (
                <span className="text-sm font-bold text-primary-dark bg-primary-main/10 px-3 py-1 rounded-full">
                  متبقي تقريباً {estimatedTimeRemaining} دقيقة
                </span>
              )}
            </div>
            <div className="h-2 w-full sm:w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800 shrink-0">
              <div
                className="h-full rounded-full bg-primary-main transition-all"
                style={{
                  width: `${Math.max(
                    10,
                    ((currentStepIndex + 1) / currentSteps.length) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-5">
            {currentSteps.map((step, index) => {
              const Icon = step.icon;
              const isDone = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                        isDone
                          ? 'bg-primary-main text-black'
                          : 'bg-gray-200 text-gray-400 dark:bg-gray-800'
                      } ${isCurrent ? 'ring-4 ring-primary-main/20' : ''}`}
                    >
                      <Icon size={22} />
                    </div>

                    {index < currentSteps.length - 1 && (
                      <div
                        className={`mt-2 h-10 w-[3px] rounded-full ${
                          index < currentStepIndex
                            ? 'bg-primary-main'
                            : 'bg-gray-200 dark:bg-gray-800'
                        }`}
                      />
                    )}
                  </div>

                  <div className="pt-2">
                    <p
                      className={`font-black ${
                        isDone ? 'text-primary-dark' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {index < currentStepIndex
                        ? 'تم'
                        : isCurrent
                          ? 'الحالة الحالية'
                          : 'بانتظار الوصول لهذه المرحلة'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-surface-dark sm:p-6">
          <h3 className="mb-5 text-xl font-black">تفاصيل الطلب</h3>

          <div className="space-y-4">
            {(order.items || []).map((item, index) => (
              <div
                key={item.cartItemId || `${item.menuItem.id}-${index}`}
                className="flex items-center gap-3"
              >
                <img
                  src={item.menuItem.images?.[0] || '/favicon.svg'}
                  alt={item.menuItem.name}
                  className="h-14 w-14 rounded-xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{item.menuItem.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} × {formatCurrency(item.subtotal)}
                  </p>
                </div>

                <div className="text-sm font-black sm:text-base">
                  {formatCurrency(item.subtotal * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
              <span>المجموع الفرعي</span>
              <span className="font-semibold">
                {formatCurrency(order.subtotal || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
              <span>رسوم التوصيل</span>
              <span className="font-semibold">
                {formatCurrency(order.deliveryFee || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
              <span className="text-xl font-black">الإجمالي</span>
              <span className="text-2xl font-black text-primary-dark">
                {formatCurrency(order.total || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-surface-dark sm:p-6">
          <h3 className="mb-5 text-xl font-black">معلومات الطلب</h3>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Package className="mt-1 shrink-0 text-primary-dark" size={18} />
              <div>
                <p className="mb-1 text-sm text-gray-500">اسم العميل</p>
                <p className="font-bold">{order.customerName || 'غير متوفر'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="mt-1 shrink-0 text-primary-dark" size={18} />
              <div>
                <p className="mb-1 text-sm text-gray-500">رقم الهاتف</p>
                <p className="font-bold">{order.customerPhone || 'غير متوفر'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-1 shrink-0 text-primary-dark" size={18} />
              <div>
                <p className="mb-1 text-sm text-gray-500">العنوان</p>
                <p className="font-bold leading-7">
                  {order.deliveryAddress?.details || 'غير متوفر'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Receipt className="mt-1 shrink-0 text-primary-dark" size={18} />
              <div>
                <p className="mb-1 text-sm text-gray-500">نوع الطلب</p>
                <p className="font-bold">
                  {order.fulfillmentType === 'delivery'
                    ? 'توصيل'
                    : 'استلام من المطعم'}
                </p>
              </div>
            </div>

            {order.driverNotes && (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-black">
                <p className="mb-1 text-sm text-gray-500">ملاحظات</p>
                <p className="font-medium leading-7">{order.driverNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrderPage;

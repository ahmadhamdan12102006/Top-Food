import React, { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  MapPin,
  Phone,
  StickyNote,
  Store,
  User,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import LocationButton from '../components/common/LocationButton';
import { rememberTrackedOrderId } from '../hooks/useOrderNotifications';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { createOrder } from '../services/orderService';
import type { Address } from '../types';
import { formatCurrency } from '../utils';
import {
  findDuplicateAddress,
  toGoogleMapsUrl,
  type Coordinates,
} from '../utils/location';
import type { Driver } from '../types';
import { getAvailableDrivers } from '../services/driverService';

type DeliveryMode = 'pickup' | 'saved_address' | 'live_location' | 'manual_address';
type DriverAvailabilityStatus = 'available' | 'busy' | 'offline';

const normalizeAddress = (
  address: Partial<Address> | null | undefined,
  index: number
): Address | null => {
  if (!address) return null;

  const label =
    typeof address.label === 'string' && address.label.trim()
      ? address.label.trim()
      : `عنوان ${index + 1}`;

  const details =
    typeof address.details === 'string' && address.details.trim()
      ? address.details.trim()
      : typeof address.location === 'string' && address.location.trim()
        ? 'تم حفظ الموقع لهذا العنوان'
        : 'لا توجد تفاصيل إضافية';

  return {
    id: address.id || `address-${index}`,
    label,
    details,
    location: address.location,
    coords: address.coords,
    isDefault: address.isDefault,
    deliveryAreaId: address.deliveryAreaId,
  };
};

const getDriverAvailabilityStatus = (
  driver: Driver
): DriverAvailabilityStatus => {
  if (!driver.isActive) return 'offline';
  if (driver.currentOrderId) return 'busy';
  return 'available';
};

const getDriverStatusMeta = (status: DriverAvailabilityStatus) => {
  switch (status) {
    case 'available':
      return {
        label: 'متاح',
        dotClass: 'bg-green-500',
        textClass: 'text-green-600 dark:text-green-400',
      };
    case 'busy':
      return {
        label: 'مشغول بطلب آخر',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-600 dark:text-amber-400',
      };
    case 'offline':
      return {
        label: 'خارج الخدمة',
        dotClass: 'bg-red-500',
        textClass: 'text-red-600 dark:text-red-400',
      };
  }
};

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCartStore();
  const { user, isAuthenticated, setAuthModalOpen } = useAuthStore();
  const {
    deliveryAreas,
    fetchSettings,
  } = useSettingsStore(
    useShallow((state) => ({
      deliveryAreas: state.deliveryAreas,
      fetchSettings: state.fetchSettings,
    }))
  );

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('saved_address');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [liveLocation, setLiveLocation] = useState<Address | null>(null);
  const [manualAddressDetails, setManualAddressDetails] = useState('');
  const [sharingLocation, setSharingLocation] = useState(false);
  const [driverNotes, setDriverNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const userAddresses = useMemo(
    () =>
      Array.isArray(user?.addresses)
        ? user.addresses
            .map((address, index) => normalizeAddress(address, index))
            .filter((address): address is Address => !!address)
        : [],
    [user]
  );

  useEffect(() => {
    fetchSettings().catch((error) => {
      console.error('Failed to fetch checkout settings', error);
    });

    getAvailableDrivers()
      .then((loadedDrivers) => setDrivers(loadedDrivers))
      .catch(err => console.error('Failed to fetch drivers', err));
  }, [fetchSettings]);

  useEffect(() => {
    if (deliveryMode === 'pickup' && selectedDriverId) {
      setSelectedDriverId(null);
    }
  }, [deliveryMode, selectedDriverId]);

  useEffect(() => {
    if (items.length === 0) {
      const timer = setTimeout(() => {
        navigate('/cart', { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [items.length, navigate]);

  useEffect(() => {
    if (!user) return;

    const defaultAddress =
      userAddresses.find((address) => address.isDefault) || userAddresses[0];

    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
    } else {
      setDeliveryMode('manual_address');
    }

    if (user?.preferredDriverId) {
      setSelectedDriverId(user.preferredDriverId);
    }
  }, [user, userAddresses]);

  const selectedSavedAddress = useMemo(
    () =>
      userAddresses.find((address) => address.id === selectedAddressId) || null,
    [selectedAddressId, userAddresses]
  );

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId) || null,
    [drivers, selectedDriverId]
  );

  const activeDeliveryAddress = useMemo(() => {
    if (deliveryMode === 'saved_address') return selectedSavedAddress;
    if (deliveryMode === 'live_location') return liveLocation;
    if (deliveryMode === 'manual_address' && manualAddressDetails.trim().length > 0) {
      return {
        id: `manual-${Date.now()}`,
        label: 'مكتوب يدوياً',
        details: manualAddressDetails.trim(),
      } as Address;
    }
    return null;
  }, [deliveryMode, selectedSavedAddress, liveLocation, manualAddressDetails]);

  const matchedDeliveryArea = useMemo(() => {
    if (!activeDeliveryAddress || deliveryMode === 'pickup') return null;

    if (activeDeliveryAddress.deliveryAreaId) {
      const byId = deliveryAreas.find(
        (area) => area.id === activeDeliveryAddress.deliveryAreaId
      );
      if (byId) return byId;
    }

    return (
      deliveryAreas.find(
        (area) =>
          (activeDeliveryAddress.details || '').includes(area.name) ||
          (activeDeliveryAddress.label || '').includes(area.name)
      ) || null
    );
  }, [activeDeliveryAddress, deliveryAreas, deliveryMode]);

  const subtotal = total();
  const deliveryFee = deliveryMode === 'pickup' ? 0 : matchedDeliveryArea?.fee || 0;
  const grandTotal = subtotal + deliveryFee;

  const handleShareLocation = () => {
    if (!isAuthenticated || !user) {
      setAuthModalOpen(true);
      return;
    }

    if (!('geolocation' in navigator)) {
      toast.error('متصفحك لا يدعم تحديد الموقع، يرجى إدخال العنوان يدوياً');
      setDeliveryMode('manual_address');
      return;
    }

    setSharingLocation(true);
    toast('جاري تحديد موقعك...', { icon: '📡', duration: 2000 });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const existingMatch = findDuplicateAddress(userAddresses, coords);

        if (existingMatch) {
          setDeliveryMode('saved_address');
          setSelectedAddressId(existingMatch.id);
          setLiveLocation(null);
          toast(`هذا الموقع محفوظ باسم "${existingMatch.label}"`, {
            icon: '📍',
          });
          setSharingLocation(false);
          return;
        }

        setLiveLocation({
          id: 'live-location',
          label: 'موقعي الحالي',
          details: 'تم تحديد موقعك الحالي',
          location: toGoogleMapsUrl(coords),
          coords,
        });
        setDeliveryMode('live_location');
        toast.success('تم تحديد موقعك الحالي');
        setSharingLocation(false);
      },
      (error) => {
        console.error('Checkout geolocation error', error);
        let errorMessage = 'تعذر تحديد موقعك الحالي';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'يرجى السماح للتطبيق بالوصول إلى موقعك';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'معلومات الموقع غير متوفرة حالياً';
            break;
          case error.TIMEOUT:
            errorMessage = 'انتهى وقت طلب الموقع';
            break;
        }
        
        toast.error(`${errorMessage}، يرجى إدخال العنوان يدوياً`);
        setDeliveryMode('manual_address');
        setSharingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  };

  const canSubmit =
    items.length > 0 &&
    !!user?.name &&
    !!user?.phone &&
    (deliveryMode === 'pickup' || !!activeDeliveryAddress);

  const stepStatus = {
    customer: !!user?.name && !!user?.phone,
    fulfillment: deliveryMode === 'pickup' || !!activeDeliveryAddress,
    review: items.length > 0,
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated || !user) {
      setAuthModalOpen(true);
      toast.error('سجّل دخولك أولًا لإكمال الطلب');
      return;
    }

    if (items.length === 0) {
      toast.error('السلة فارغة');
      return;
    }

    if (deliveryMode !== 'pickup' && !activeDeliveryAddress) {
      toast.error('حدد عنوان التوصيل أولًا');
      return;
    }

    if (deliveryMode !== 'pickup' && selectedDriverId) {
      if (!selectedDriver) {
        toast.error('السائق المختار غير متاح الآن');
        return;
      }

      const driverStatus = getDriverAvailabilityStatus(selectedDriver);

      if (driverStatus !== 'available') {
        toast.error(
          driverStatus === 'busy'
            ? 'السائق المختار مشغول بطلب آخر'
            : 'السائق المختار خارج الخدمة'
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      const orderId = await createOrder({
        userId: user.id,
        customerName: user.name.trim(),
        customerPhone: user.phone,
        fulfillmentType: deliveryMode === 'pickup' ? 'pickup' : 'delivery',
        driverNotes: driverNotes.trim(),
        items,
        deliveryAddress: activeDeliveryAddress,
        selectedDriverId: deliveryMode === 'pickup' ? null : selectedDriverId,
        deliveryArea:
          deliveryMode === 'pickup'
            ? 'pickup'
            : matchedDeliveryArea?.name || activeDeliveryAddress?.label || '',
        deliveryFee,
        total: grandTotal,
      });

      rememberTrackedOrderId(orderId);
      clearCart();
      toast.success('تم إنشاء الطلب بنجاح');
      navigate(`/order-success?orderId=${encodeURIComponent(orderId)}`, {
        replace: true,
        state: {
          orderId,
          fulfillmentType: deliveryMode === 'pickup' ? 'pickup' : 'delivery',
        },
      });
    } catch (error) {
      console.error('Failed to place order:', error);
      toast.error('حدث خطأ أثناء إنشاء الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold mb-2">السلة فارغة</p>
          <p className="text-gray-500">جاري التحويل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="mb-6">
        <h1 className="mb-3 text-3xl font-black sm:text-4xl">إتمام الطلب</h1>
        <p className="text-gray-500 dark:text-gray-400">
          راجع بياناتك وحدد طريقة الاستلام المناسبة.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2 sm:mb-8 sm:gap-4">
        {[
          {
            key: 'customer',
            title: 'البيانات',
            subtitle: 'الاسم ورقم الهاتف',
            done: stepStatus.customer,
          },
          {
            key: 'fulfillment',
            title: 'الاستلام',
            subtitle: 'الطريقة والموقع',
            done: stepStatus.fulfillment,
          },
          {
            key: 'review',
            title: 'المراجعة',
            subtitle: 'ملخص الطلب',
            done: stepStatus.review,
          },
        ].map((step) => (
          <div
            key={step.key}
            className={`rounded-2xl border p-3 sm:p-4 ${
              step.done
                ? 'border-green-300 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-black'
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <CheckCircle2
                size={18}
                className={step.done ? 'text-green-600' : 'text-gray-400'}
              />
              <span className="text-sm font-black sm:text-base">{step.title}</span>
            </div>
            <p className="text-xs text-gray-500 sm:text-sm">{step.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:gap-8 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-surface-dark sm:p-6">
            <h2 className="mb-2 text-xl font-black">بيانات العميل</h2>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              تأكد من بياناتك المسجلة بالحساب قبل تأكيد الطلب.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 font-semibold">
                  <User size={17} />
                  الاسم
                </label>
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="w-full rounded-2xl border border-gray-300 bg-gray-100 px-4 py-4 text-gray-600 opacity-90 dark:border-gray-700 dark:bg-black"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 font-semibold">
                  <Phone size={17} />
                  رقم الهاتف
                </label>
                <input
                  type="text"
                  value={user?.phone || ''}
                  disabled
                  dir="ltr"
                  className="w-full rounded-2xl border border-gray-300 bg-gray-100 px-4 py-4 text-gray-600 opacity-90 dark:border-gray-700 dark:bg-black"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-surface-dark sm:p-6">
            <h2 className="mb-5 text-xl font-black">طريقة الاستلام</h2>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              <button
                type="button"
                onClick={() => setDeliveryMode('pickup')}
                className={`rounded-2xl border p-5 text-right transition ${
                  deliveryMode === 'pickup'
                    ? 'border-primary-main bg-primary-main/10'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-black'
                }`}
              >
                <div className="mb-2 flex items-center gap-3">
                  <Store className="text-primary-dark" size={20} />
                  <span className="font-black">استلام من المطعم</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  بدون رسوم توصيل
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    setAuthModalOpen(true);
                    return;
                  }
                  setDeliveryMode('saved_address');
                }}
                className={`rounded-2xl border p-5 text-right transition ${
                  deliveryMode === 'saved_address'
                    ? 'border-primary-main bg-primary-main/10'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-black'
                }`}
              >
                <div className="mb-2 flex items-center gap-3">
                  <MapPin className="text-primary-dark" size={20} />
                  <span className="font-black">عنوان محفوظ</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  اختر من عناوين حسابك
                </p>
              </button>

              <div className="md:col-span-2">
                <LocationButton
                  onClick={handleShareLocation}
                  loading={sharingLocation}
                  hasLocation={deliveryMode === 'live_location'}
                  label="مشاركة موقعي الحالي"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    setAuthModalOpen(true);
                    return;
                  }
                  setDeliveryMode('manual_address');
                }}
                className={`rounded-2xl border p-4 sm:p-5 text-right transition ${
                  deliveryMode === 'manual_address'
                    ? 'border-primary-main bg-primary-main/10'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-black'
                }`}
              >
                <div className="mb-2 flex items-center gap-2 sm:gap-3">
                  <StickyNote className="text-primary-dark" size={18} />
                  <span className="font-black text-sm sm:text-base">إدخال يدوي</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  كتابة تفاصيل العنوان
                </p>
              </button>
            </div>

            {deliveryMode === 'saved_address' && (
              <div className="mt-6 space-y-3">
                {userAddresses.length ? (
                  userAddresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        selectedAddressId === address.id
                          ? 'border-primary-main bg-primary-main/10'
                          : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-black'
                      }`}
                    >
                      <input
                        type="radio"
                        name="selectedAddress"
                        value={address.id}
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                        className="hidden"
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="mb-1 font-bold">{address.label}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {address.details}
                          </div>
                        </div>
                        {selectedAddressId === address.id && (
                          <CheckCircle2 className="shrink-0 text-green-600" size={20} />
                        )}
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/40 dark:bg-yellow-900/10">
                    لا توجد لديك عناوين محفوظة. أضف عنوانًا من صفحة الحساب أو استخدم
                    موقعك الحالي.
                  </div>
                )}
              </div>
            )}

            {deliveryMode === 'live_location' && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-900/10">
                <p className="font-bold text-green-700 dark:text-green-400">
                  ✅ تم تحديد موقعك الحالي
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  سنستخدم موقعك الحالي للتوصيل دون عرض الإحداثيات.
                </p>
              </div>
            )}

            {deliveryMode === 'manual_address' && (
              <div className="mt-6">
                <label className="mb-2 block font-semibold">تفاصيل العنوان</label>
                <textarea
                  value={manualAddressDetails}
                  onChange={(e) => setManualAddressDetails(e.target.value)}
                          placeholder=""
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-gray-300 bg-white px-4 py-4 focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main dark:border-gray-700 dark:bg-black"
                />
              </div>
            )}

            {deliveryMode === 'pickup' && (
              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
                سيتم تجهيز طلبك للاستلام من المطعم.
              </div>
            )}

            {deliveryMode !== 'pickup' && drivers.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-4 text-lg font-black">اختر سائق التوصيل (اختياري)</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition ${
                      selectedDriverId === null
                        ? 'border-primary-main bg-primary-main/10'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-black'
                    }`}
                  >
                    <span className="font-bold">أي سائق متاح</span>
                    <input
                      type="radio"
                      name="selectedDriver"
                      checked={selectedDriverId === null}
                      onChange={() => setSelectedDriverId(null)}
                      className="hidden"
                    />
                    {selectedDriverId === null && <CheckCircle2 className="text-primary-dark" size={20} />}
                  </label>
                  {drivers.map((driver) => {
                    const status = getDriverAvailabilityStatus(driver);
                    const statusMeta = getDriverStatusMeta(status);
                    const isSelectable = status === 'available';
                    const averageRating = Number(driver.averageRating || 0);
                    const totalRatings = Number(driver.totalRatings || 0);
                    const availabilityText =
                      status === 'available'
                        ? 'متاح للتوصيل'
                        : status === 'busy'
                          ? 'مشغول بطلب آخر'
                          : 'خارج الخدمة حالياً';
                    const isBusy = status !== 'available';
                    return (
                      <label
                        key={driver.id}
                        title={availabilityText}
                        className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                          isSelectable
                            ? 'cursor-pointer'
                            : 'cursor-not-allowed opacity-70'
                        } ${
                          selectedDriverId === driver.id
                            ? 'border-primary-main bg-primary-main/10'
                            : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-black'
                        }`}
                      >
                        <div>
                          <div className="mb-1 font-bold flex items-center gap-2">
                            {driver.name}
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold ${statusMeta.textClass}`}
                            >
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${statusMeta.dotClass}`}
                              />
                              {statusMeta.label}
                            </span>
                            {driver.id === user?.preferredDriverId && (
                              <span className="bg-primary-main/20 text-primary-dark text-[10px] px-2 py-0.5 rounded-full font-bold">
                                مفضل لديك ⭐
                              </span>
                            )}
                            {driver.averageRating ? (
                              <span className="flex items-center text-sm font-normal text-gray-500">
                                <Star size={14} className="fill-primary-main text-primary-main ml-1" />
                                {driver.averageRating}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {isBusy ? 'مشغول بطلب آخر' : 'متاح للتوصيل'}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={`${driver.id}-${index}`}
                                size={13}
                                className={
                                  index < Math.round(averageRating)
                                    ? 'fill-primary-main text-primary-main'
                                    : 'text-gray-300 dark:text-gray-600'
                                }
                              />
                            ))}
                            <span className="mr-2">
                              {totalRatings > 0
                                ? `${averageRating.toFixed(1)} (${totalRatings})`
                                : 'بدون تقييم بعد'}
                            </span>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="selectedDriver"
                          disabled={!isSelectable}
                          checked={selectedDriverId === driver.id}
                          onChange={() => isSelectable && setSelectedDriverId(driver.id)}
                          className="hidden"
                        />
                        {selectedDriverId === driver.id && <CheckCircle2 className="text-primary-dark" size={20} />}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6">
              <label className="mb-2 flex items-center gap-2 font-semibold">
                <StickyNote size={18} />
                ملاحظات إضافية
              </label>
              <textarea
                value={driverNotes}
                onChange={(e) => setDriverNotes(e.target.value)}
                    placeholder=""
                rows={4}
                className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-4 dark:border-gray-700 dark:bg-black"
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-surface-dark sm:p-6 xl:sticky xl:top-24">
            <h2 className="mb-5 text-xl font-black">ملخص الطلب</h2>

            <div className="mb-5 max-h-[320px] space-y-4 overflow-y-auto pr-1">
              {items.map((item, index) => (
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

            <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>المجموع الفرعي</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>رسوم التوصيل</span>
                <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
                <span className="text-xl font-black">الإجمالي</span>
                <span className="text-2xl font-black text-primary-dark">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-black">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">طريقة الاستلام</span>
                <span className="font-bold">
                  {deliveryMode === 'pickup' ? 'استلام' : 'توصيل'}
                </span>
              </div>

              {deliveryMode !== 'pickup' && activeDeliveryAddress && (
                <p className="text-sm leading-7 text-gray-500">
                  {activeDeliveryAddress.label}
                </p>
              )}
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={!canSubmit || submitting}
              className="mt-5 w-full rounded-2xl py-4 text-lg"
            >
              {submitting ? 'جارٍ إرسال الطلب...' : 'تأكيد الطلب'}
            </Button>

            {!canSubmit && (
              <p className="mt-3 text-center text-sm text-gray-500">
                أكمل البيانات المطلوبة لتفعيل زر الإرسال.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

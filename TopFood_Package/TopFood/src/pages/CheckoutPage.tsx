import React, { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  MapPin,
  Phone,
  StickyNote,
  Store,
  User,
  Star,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../components/common/Button';
import LocationButton from '../components/common/LocationButton';
import { rememberTrackedOrderId } from '../hooks/useOrderNotifications';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { createOrder } from '../services/orderService';

import { useFrequentOrdersStore } from '../store/useFrequentOrdersStore';
import { getAvailableDrivers } from '../services/driverService';
import type { Address, Driver } from '../types';
import { formatCurrency } from '../utils';
import {
  findDuplicateAddress,
  toGoogleMapsUrl,
  type Coordinates,
} from '../utils/location';

type DeliveryMode = 'pickup' | 'saved_address' | 'live_location';
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

const getDriverAvailabilityStatus = (driver: Driver): DriverAvailabilityStatus => {
  if (!driver.isActive) return 'offline';
  if (driver.currentOrderId) return 'busy';
  return 'available';
};

const getDriverStatusMeta = (status: DriverAvailabilityStatus) => {
  switch (status) {
    case 'available':
      return { label: 'متاح', dotClass: 'bg-green-500', textClass: 'text-green-600 dark:text-green-400' };
    case 'busy':
      return { label: 'مشغول', dotClass: 'bg-amber-500', textClass: 'text-amber-600 dark:text-amber-400' };
    case 'offline':
      return { label: 'خارج الخدمة', dotClass: 'bg-red-500', textClass: 'text-red-600 dark:text-red-400' };
  }
};

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCartStore();
  const { user, isAuthenticated, setAuthModalOpen } = useAuthStore();
  const { deliveryAreas, fetchSettings } = useSettingsStore(
    useShallow((state) => ({
      deliveryAreas: state.deliveryAreas,
      fetchSettings: state.fetchSettings,
    }))
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('saved_address');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [liveLocation, setLiveLocation] = useState<Address | null>(null);

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
    fetchSettings().catch(console.error);
    getAvailableDrivers()
      .then(setDrivers)
      .catch(console.error);
  }, [fetchSettings]);

  useEffect(() => {
    if (deliveryMode === 'pickup' && selectedDriverId) {
      setSelectedDriverId(null);
    }
  }, [deliveryMode, selectedDriverId]);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, navigate]);

  useEffect(() => {
    if (!user) return;
    const defaultAddress = userAddresses.find((a) => a.isDefault) || userAddresses[0];
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
    } else {
      setDeliveryMode('live_location');
    }
    if (user?.preferredDriverId) setSelectedDriverId(user.preferredDriverId);
  }, [user, userAddresses]);

  const selectedSavedAddress = useMemo(
    () => userAddresses.find((a) => a.id === selectedAddressId) || null,
    [selectedAddressId, userAddresses]
  );

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === selectedDriverId) || null,
    [drivers, selectedDriverId]
  );

  const activeDeliveryAddress = useMemo(() => {
    if (deliveryMode === 'saved_address') return selectedSavedAddress;
    if (deliveryMode === 'live_location') return liveLocation;
    return null;
  }, [deliveryMode, selectedSavedAddress, liveLocation]);

  const matchedDeliveryArea = useMemo(() => {
    if (!activeDeliveryAddress || deliveryMode === 'pickup') return null;
    if (activeDeliveryAddress.deliveryAreaId) {
      const byId = deliveryAreas.find((a) => a.id === activeDeliveryAddress.deliveryAreaId);
      if (byId) return byId;
    }
    return (
      deliveryAreas.find(
        (a) =>
          (activeDeliveryAddress.details || '').includes(a.name) ||
          (activeDeliveryAddress.label || '').includes(a.name)
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
      toast.error('متصفحك لا يدعم تحديد الموقع، يرجى حفظ عنوان في حسابك.');
      setDeliveryMode('saved_address');
      return;
    }

    setSharingLocation(true);
    toast('جاري تحديد موقعك...', { icon: '📡', duration: 2000 });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
        const existingMatch = findDuplicateAddress(userAddresses, coords);

        if (existingMatch) {
          setDeliveryMode('saved_address');
          setSelectedAddressId(existingMatch.id);
          setLiveLocation(null);
          toast(`هذا الموقع محفوظ باسم "${existingMatch.label}"`, { icon: '📍' });
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
        console.error('Geolocation error', error);
        toast.error('تعذر تحديد موقعك، يرجى اختيار عنوان محفوظ.');
        setDeliveryMode('saved_address');
        setSharingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!user?.name || !user?.phone) {
        toast.error('يرجى التأكد من بياناتك');
        return;
      }
    } else if (currentStep === 2) {
      if (deliveryMode !== 'pickup' && !activeDeliveryAddress) {
        toast.error('حدد عنوان التوصيل أولاً');
        return;
      }
      // If pickup, skip driver step
      if (deliveryMode === 'pickup') {
        setCurrentStep(4);
        return;
      }
    } else if (currentStep === 3) {
      if (selectedDriverId) {
        const dStatus = getDriverAvailabilityStatus(selectedDriver!);
        if (dStatus !== 'available') {
          toast.error('السائق المختار غير متاح الآن');
          return;
        }
      }
    }
    
    setCurrentStep(c => Math.min(c + 1, 4));
  };

  const prevStep = () => {
    if (currentStep === 4 && deliveryMode === 'pickup') {
      setCurrentStep(2);
    } else {
      setCurrentStep(c => Math.max(c - 1, 1));
    }
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated || !user) {
      setAuthModalOpen(true);
      return;
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
        deliveryArea: deliveryMode === 'pickup' ? 'pickup' : matchedDeliveryArea?.name || activeDeliveryAddress?.label || '',
        deliveryFee,
        total: grandTotal,
      });

      const addFrequentOrder = useFrequentOrdersStore.getState().addOrder;
      items.forEach(item => {
        addFrequentOrder(item.menuItem, item.customization);
      });

      rememberTrackedOrderId(orderId);
      clearCart();
      toast.success('تم إنشاء الطلب بنجاح');
      navigate(`/order-success?orderId=${encodeURIComponent(orderId)}`, {
        replace: true,
        state: { orderId, fulfillmentType: deliveryMode === 'pickup' ? 'pickup' : 'delivery' },
      });
    } catch (error: any) {
      console.error('Failed to place order:', error);
      toast.error(error.message || 'حدث خطأ أثناء إنشاء الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  const steps = [
    { id: 1, title: 'البيانات', icon: User },
    { id: 2, title: 'الموقع', icon: MapPin },
    { id: 3, title: 'السائق', icon: Store },
    { id: 4, title: 'التأكيد', icon: CheckCircle2 },
  ];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 pb-32">
      {/* ═══ Stepper Header ═══ */}
      <div className="mb-8">
        <h1 className="mb-6 text-3xl font-black text-center">إتمام الطلب</h1>
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 dark:bg-gray-800 -z-10 transform -translate-y-1/2" />
          <div 
            className="absolute right-0 top-1/2 h-1 bg-primary-main -z-10 transform -translate-y-1/2 transition-all duration-500" 
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />
          
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            // Disable driver step visually if pickup is selected
            const isDisabled = step.id === 3 && deliveryMode === 'pickup';

            return (
              <div key={step.id} className="flex flex-col items-center gap-2 relative">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${
                    isActive 
                      ? 'bg-primary-main border-primary-main text-black scale-110 shadow-lg shadow-primary-main/30' 
                      : isCompleted 
                        ? 'bg-primary-main border-primary-main text-black' 
                        : isDisabled
                          ? 'bg-gray-100 border-gray-200 text-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-600'
                          : 'bg-white border-gray-300 text-gray-400 dark:bg-black dark:border-gray-700'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={20} /> : <step.icon size={18} />}
                </div>
                <span className={`text-xs font-bold transition-colors ${
                  isActive ? 'text-primary-main' : isCompleted ? 'text-text-light dark:text-text-dark' : 'text-gray-400'
                } ${isDisabled ? 'opacity-30' : ''}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {/* ═══ STEP 1: Personal Info ═══ */}
            {currentStep === 1 && (
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1c1c22]">
                <h2 className="mb-6 text-xl font-black text-center">تأكيد البيانات</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block font-semibold text-sm">الاسم</label>
                    <input
                      type="text"
                      value={user?.name || ''}
                      disabled
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-700 opacity-90 dark:border-white/10 dark:bg-black/20 dark:text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-semibold text-sm">رقم الهاتف</label>
                    <input
                      type="text"
                      value={user?.phone || ''}
                      disabled
                      dir="ltr"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left text-gray-700 opacity-90 dark:border-white/10 dark:bg-black/20 dark:text-gray-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ STEP 2: Location ═══ */}
            {currentStep === 2 && (
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1c1c22]">
                <h2 className="mb-6 text-xl font-black text-center">طريقة الاستلام</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setDeliveryMode('pickup')}
                    className={`rounded-2xl border p-4 text-center transition-all ${
                      deliveryMode === 'pickup'
                        ? 'border-primary-main bg-primary-main/10 shadow-sm'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-black/20'
                    }`}
                  >
                    <Store className={`mx-auto mb-2 ${deliveryMode === 'pickup' ? 'text-primary-main' : 'text-gray-400'}`} size={28} />
                    <span className="font-bold block">من المطعم</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!isAuthenticated) return setAuthModalOpen(true);
                      setDeliveryMode('saved_address');
                    }}
                    className={`rounded-2xl border p-4 text-center transition-all ${
                      deliveryMode === 'saved_address' || deliveryMode === 'live_location'
                        ? 'border-primary-main bg-primary-main/10 shadow-sm'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-black/20'
                    }`}
                  >
                    <MapPin className={`mx-auto mb-2 ${deliveryMode !== 'pickup' ? 'text-primary-main' : 'text-gray-400'}`} size={28} />
                    <span className="font-bold block">توصيل</span>
                  </button>
                </div>

                {deliveryMode !== 'pickup' && (
                  <div className="space-y-4">
                    <LocationButton
                      onClick={handleShareLocation}
                      loading={sharingLocation}
                      hasLocation={deliveryMode === 'live_location'}
                      label="مشاركة موقعي الحالي"
                    />

                    {userAddresses.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <p className="font-bold text-sm text-gray-500 mb-3">أو اختر عنوان محفوظ:</p>
                        {userAddresses.map((address) => (
                          <label
                            key={address.id}
                            className={`flex items-center justify-between cursor-pointer rounded-2xl border p-4 transition ${
                              selectedAddressId === address.id && deliveryMode === 'saved_address'
                                ? 'border-primary-main bg-primary-main/5'
                                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-black/30'
                            }`}
                          >
                            <div>
                              <div className="font-bold">{address.label}</div>
                              <div className="text-sm text-gray-500">{address.details}</div>
                            </div>
                            <input
                              type="radio"
                              checked={selectedAddressId === address.id && deliveryMode === 'saved_address'}
                              onChange={() => {
                                setSelectedAddressId(address.id);
                                setDeliveryMode('saved_address');
                              }}
                              className="w-5 h-5 text-primary-main"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══ STEP 3: Driver Selection ═══ */}
            {currentStep === 3 && (
              <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1c1c22]">
                <h2 className="mb-2 text-xl font-black text-center">اختيار السائق</h2>
                <p className="text-center text-sm text-gray-500 mb-6">اختياري - يمكنك ترك التطبيق يختار أقرب سائق</p>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  <label
                    className={`flex items-center justify-between cursor-pointer rounded-2xl border p-4 transition ${
                      selectedDriverId === null
                        ? 'border-primary-main bg-primary-main/10 shadow-sm'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-black/30'
                    }`}
                  >
                    <div className="font-bold">أي سائق متاح (تلقائي)</div>
                    <input
                      type="radio"
                      checked={selectedDriverId === null}
                      onChange={() => setSelectedDriverId(null)}
                      className="w-5 h-5 text-primary-main"
                    />
                  </label>

                  {drivers.map((driver) => {
                    const status = getDriverAvailabilityStatus(driver);
                    const statusMeta = getDriverStatusMeta(status);
                    const isSelectable = status === 'available';
                    
                    return (
                      <label
                        key={driver.id}
                        className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                          !isSelectable ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-black/20' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-black/30'
                        } ${
                          selectedDriverId === driver.id
                            ? 'border-primary-main bg-primary-main/10 shadow-sm'
                            : 'border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {driver.name}
                            {driver.id === user?.preferredDriverId && (
                              <span className="bg-primary-main/20 text-primary-dark text-[10px] px-2 py-0.5 rounded-full font-bold">مفضل</span>
                            )}
                          </div>
                          <div className="text-sm mt-1 flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${statusMeta.dotClass}`} />
                            {statusMeta.label}
                          </div>
                        </div>
                        <input
                          type="radio"
                          disabled={!isSelectable}
                          checked={selectedDriverId === driver.id}
                          onChange={() => isSelectable && setSelectedDriverId(driver.id)}
                          className="w-5 h-5 text-primary-main"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══ STEP 4: Review & Confirm ═══ */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1c1c22]">
                  <h2 className="mb-4 text-xl font-black">ملخص الطلب</h2>
                  
                  <div className="mb-4 space-y-3 max-h-[250px] overflow-y-auto">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <img src={item.menuItem.images?.[0]} className="w-12 h-12 rounded-lg object-cover bg-gray-100" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{item.menuItem.name}</p>
                          <p className="text-xs text-gray-500">{item.quantity} × {formatCurrency(item.subtotal)}</p>
                        </div>
                        <div className="font-black">{formatCurrency(item.subtotal * item.quantity)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>رسوم التوصيل</span>
                      <span>{formatCurrency(deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-2 text-lg font-black text-black dark:text-white mt-2">
                      <span>الإجمالي</span>
                      <span className="text-primary-main">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1c1c22]">
                  <label className="block mb-2 font-bold text-sm">ملاحظات للمطعم / السائق</label>
                  <textarea
                    value={driverNotes}
                    onChange={(e) => setDriverNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية بخصوص الطلب أو التوصيل؟"
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 min-h-[100px] text-sm dark:border-gray-800 dark:bg-black/30"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ═══ Footer Navigation ═══ */}
      <div className="fixed bottom-[80px] left-0 right-0 p-4 bg-white/95 dark:bg-[#111317]/95 backdrop-blur-md border-t border-gray-100 dark:border-white/5 z-40">
        <div className="max-w-3xl mx-auto flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={prevStep}
              className="px-6 py-4 rounded-2xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition"
            >
              رجوع
            </button>
          )}
          
          {currentStep < 4 ? (
            <button
              onClick={nextStep}
              className="flex-1 py-4 rounded-2xl font-black bg-primary-main text-black hover:bg-primary-dark transition flex justify-center items-center gap-2"
            >
              متابعة
              <ChevronLeft size={20} />
            </button>
          ) : (
            <button
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="flex-1 py-4 rounded-2xl font-black bg-primary-main text-black hover:bg-primary-dark transition shadow-lg shadow-primary-main/20 flex justify-center items-center gap-2"
            >
              {submitting ? 'جاري التأكيد...' : 'تأكيد الطلب'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

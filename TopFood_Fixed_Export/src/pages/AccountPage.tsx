import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Coins,
  Edit3,
  LayoutList,
  Loader2,
  LogOut,
  MapPin,
  PackageOpen,
  Receipt,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import LocationButton from '../components/common/LocationButton';
import ImageCropperModal from '../components/common/ImageCropperModal';
import { storage } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import {
  calculateLoyaltyPointsFromOrders,
  getOrdersByUser,
} from '../services/orderService';
import {
  addAddress,
  deleteAccount,
  deleteAddress,
  updateUser,
} from '../services/userService';
import type { Order } from '../types';
import { formatCurrency } from '../utils';
import {
  findDuplicateAddress,
  toGoogleMapsUrl,
  type Coordinates,
} from '../utils/location';

type Tab = 'orders' | 'addresses' | 'settings';

const normalizeTimestamp = (timestamp: number | string | Date) => {
  if (typeof timestamp === 'number') return timestamp;
  const parsed = new Date(timestamp).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getStatusBadgeOptions = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        label: 'قيد الانتظار',
        colors: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      };
    case 'preparing':
      return {
        label: 'جاري التحضير',
        colors:
          'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400',
      };
    case 'ready_for_pickup':
      return {
        label: 'جاهز للاستلام',
        colors:
          'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      };
    case 'on_the_way':
      return {
        label: 'في الطريق',
        colors:
          'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      };
    case 'delivered':
      return {
        label: 'تم التوصيل',
        colors:
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      };
    case 'cancelled':
      return {
        label: 'ملغي',
        colors: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      };
    default:
      return {
        label: status,
        colors: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      };
  }
};

const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressDetails, setNewAddressDetails] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = user;
  const currentUserId = currentUser?.id;
  const currentLoyaltyPoints = currentUser?.loyaltyPoints || 0;

  useEffect(() => {
    if (currentUserId && activeTab === 'orders') {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
          const data = await getOrdersByUser(currentUserId);
          setOrders(Array.isArray(data) ? data : []);

          const loyaltyPoints = calculateLoyaltyPointsFromOrders(
            Array.isArray(data) ? data : []
          );

          if (currentUser && loyaltyPoints !== currentLoyaltyPoints) {
            await updateUser(currentUser.id, {
              loyaltyPoints,
            });

            setUser({
              ...currentUser,
              loyaltyPoints,
            });
          }
        } catch (error) {
          console.error(error);
          setOrders([]);
          toast.error('حدث خطأ أثناء جلب الطلبات');
        } finally {
          setLoadingOrders(false);
        }
      };

      fetchOrders();
    }
  }, [activeTab, currentLoyaltyPoints, currentUser, currentUserId, setUser]);

  if (!user) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setTempImage(reader.result as string);
    };
  };

  const handleCropComplete = async (croppedDataUrl: string) => {
    setUploadingImage(true);
    setTempImage(null);
    try {
      // Convert dataUrl to blob
      const res = await fetch(croppedDataUrl);
      const blob = await res.blob();

      const storageRef = ref(storage, `profiles/${user.id}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await updateUser(user.id, { profileImage: downloadURL });
      setUser({ ...user, profileImage: downloadURL });
      toast.success('تم تحديث الصورة بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('فشل رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) return;

    try {
      await updateUser(user.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        countryCode: user.countryCode,
      });

      setUser({
        ...user,
        name: editName.trim(),
        phone: editPhone.trim(),
      });

      setShowEditProfile(false);
      toast.success('تم تحديث بياناتك');
    } catch (error) {
      console.error(error);
      toast.error('فشل تحديث البيانات');
    }
  };

  const handleGeoLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('متصفحك لا يدعم تحديد الموقع');
      return;
    }

    setLoadingGeo(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const existingMatch = findDuplicateAddress(user.addresses || [], coords);

        if (existingMatch) {
          toast(`هذا الموقع مسجل باسم "${existingMatch.label}"`, {
            icon: '📍',
          });
          setSelectedCoords(null);
          setLoadingGeo(false);
          return;
        }

        setSelectedCoords(coords);
        toast.success('تم تحديد موقعك الحالي');
        setLoadingGeo(false);
      },
      (error) => {
        console.error('Error obtaining location', error);
        let msg = 'تعذر الوصول إلى الموقع الحالي';
        if (error.code === 1) msg = 'يرجى السماح بالوصول للموقع من إعدادات المتصفح';
        if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
          msg = 'يجب استخدام HTTPS أو localhost لاستخدام خاصية تحديد الموقع';
        }
        toast.error(msg);
        setLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAddressLabel.trim() || !newAddressDetails.trim()) {
      return;
    }

    const address: any = {
      id: Date.now().toString(),
      label: newAddressLabel.trim(),
      details: newAddressDetails.trim(),
      isDefault: (user.addresses || []).length === 0,
    };

    if (selectedCoords) {
      address.coords = selectedCoords;
      address.location = toGoogleMapsUrl(selectedCoords);
    }

    try {
      await addAddress(user.id, address);
      setUser({
        ...user,
        addresses: [...(user.addresses || []), address],
      });
      setShowAddAddress(false);
      setNewAddressLabel('');
      setNewAddressDetails('');
      setSelectedCoords(null);
      toast.success('تمت إضافة العنوان');
    } catch (error: any) {
      console.error('Failed to add address:', error);
      const errorMsg = error?.message || 'فشل إضافة العنوان';
      toast.error(`خطأ: ${errorMsg}`);
    }
  };

  const handleRemoveAddress = async (addressId: string) => {
    try {
      await deleteAddress(user.id, addressId);
      setUser({
        ...user,
        addresses: user.addresses.filter((address) => address.id !== addressId),
      });
      toast.success('تم حذف العنوان');
    } catch (error) {
      console.error(error);
      toast.error('فشل حذف العنوان');
    }
  };

  const handleDeleteAccount = async () => {
    const shouldDelete = window.confirm(
      'هل أنت متأكد من حذف الحساب نهائيًا؟ لا يمكن التراجع عن هذه الخطوة.'
    );

    if (!shouldDelete) return;

    try {
      await deleteAccount(user.id);
      toast.success('تم حذف الحساب');
      await logout();
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error('فشل حذف الحساب');
    }
  };

  return (
    <div className="container mx-auto min-h-[70vh] max-w-5xl px-4 py-8">
      <div className="mb-12 flex flex-col items-center gap-8 md:flex-row md:items-start">
        <div
          className="group relative cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-200 shadow-xl dark:border-surface-dark dark:bg-gray-800">
            {uploadingImage ? (
              <Loader2 size={32} className="animate-spin text-primary-dark" />
            ) : user.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-black text-gray-400 dark:text-gray-500">
                {user.name?.charAt(0) || user.phone?.slice(-2) || 'U'}
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={32} className="text-white" />
            </div>
          </div>
        </div>

        <div className="flex-1 text-center md:text-right">
          <div className="mb-2 flex items-center justify-center gap-3 md:justify-start">
            <h1 className="text-3xl font-black">{user.name}</h1>
            <button
              onClick={() => {
                setEditName(user.name);
                setEditPhone(user.phone);
                setShowEditProfile(true);
              }}
              className="text-gray-400 transition hover:text-primary-dark"
            >
              <Edit3 size={20} />
            </button>
          </div>
          <p
            className="text-lg font-bold text-gray-500 dark:text-gray-400"
            dir="ltr"
          >
            {user.phone}
          </p>
        </div>

        <div
          className="shimmer-card flex w-full flex-col justify-center rounded-3xl p-6 text-black shadow-lg md:w-80"
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-full bg-white/30 p-2 backdrop-blur-sm">
              <Coins size={28} className="text-yellow-900" />
            </div>
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-yellow-900">
              مكافآت
            </span>
          </div>

          <div className="mb-2 flex items-end gap-2">
            <span className="text-5xl font-black tracking-tight">
              {user.loyaltyPoints || 0}
            </span>
            <span className="mb-1 font-bold text-yellow-900">نقطة T</span>
          </div>

          <p className="text-sm font-semibold text-yellow-900/80">
            كل طلب يرجّع لك نقاطًا إضافية.
          </p>
        </div>
      </div>

      <div className="mb-8 flex gap-4 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
        {[
          { id: 'orders', label: 'طلباتي', icon: <PackageOpen size={18} /> },
          { id: 'addresses', label: 'عناويني', icon: <MapPin size={18} /> },
          { id: 'settings', label: 'الإعدادات', icon: <Settings size={18} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-4 px-4 pb-4 font-bold transition ${
              activeTab === tab.id
                ? 'border-primary-main text-primary-dark'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {loadingOrders ? (
              <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-primary-main" size={40} />
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-surface-dark">
                <LayoutList
                  size={64}
                  className="mx-auto mb-4 text-gray-300 dark:text-gray-600"
                />
                <h3 className="mb-2 text-xl font-bold">لا توجد طلبات سابقة</h3>
                <p className="text-gray-500">تصفح المنيو وابدأ أول طلب لك.</p>
              </div>
            ) : (
              orders.map((order) => {
                const badge = getStatusBadgeOptions(order.status);
                const createdAt = normalizeTimestamp(order.createdAt);
                const orderNumber =
                  order.orderNumber || order.id.slice(-6).toUpperCase();
                const fulfillmentType =
                  order.fulfillmentType === 'pickup'
                    ? 'استلام من المطعم'
                    : 'توصيل';

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="flex w-full flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-6 text-right shadow-sm transition hover:border-primary-main dark:border-gray-800 dark:bg-surface-dark sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <span className="text-lg font-black">طلب #{orderNumber}</span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${badge.colors}`}
                        >
                          {badge.label}
                        </span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          {fulfillmentType}
                        </span>
                      </div>

                      <div className="text-sm text-gray-500">
                        {createdAt
                          ? new Date(createdAt).toLocaleDateString('ar-PS')
                          : 'تاريخ غير معروف'}{' '}
                        - {Array.isArray(order.items) ? order.items.length : 0}{' '}
                        عناصر
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-2xl font-black text-primary-dark sm:text-left">
                      <span>{formatCurrency(order.total)}</span>
                      <Receipt size={20} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'addresses' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div
              onClick={() => setShowAddAddress(true)}
              className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-surface-dark dark:hover:bg-gray-800"
            >
              <MapPin size={32} className="mb-2 text-primary-dark" />
              <h3 className="font-bold">أضف عنوانًا جديدًا +</h3>
            </div>

            {user.addresses.map((address) => (
              <div
                key={address.id}
                className="relative rounded-2xl border border-gray-200 bg-white p-6 pt-10 shadow-sm dark:border-gray-800 dark:bg-surface-dark"
              >
                <button
                  onClick={() => handleRemoveAddress(address.id)}
                  className="absolute left-4 top-4 text-gray-400 transition hover:text-status-error"
                >
                  <Trash2 size={20} />
                </button>

                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg font-bold">{address.label}</span>
                  {address.isDefault && (
                    <span className="rounded-md bg-primary-main/20 px-2 py-1 text-xs font-bold tracking-wide text-primary-dark">
                      الافتراضي
                    </span>
                  )}
                </div>

                <p className="text-gray-500">{address.details}</p>
                {(address.coords || address.location) && (
                  <p className="mt-3 text-sm font-bold text-primary-dark">
                    ✅ تم حفظ موقع هذا العنوان
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-md space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
              <span className="font-bold">اللغة</span>
              <span className="cursor-not-allowed rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-500 dark:bg-black">
                العربية
              </span>
            </div>

            <Button
              variant="danger"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="w-full rounded-xl border border-gray-200 bg-gray-100 py-4 text-gray-700 hover:bg-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              <LogOut size={20} /> تسجيل خروج
            </Button>

            <div className="border-t border-gray-200 pt-8 dark:border-gray-800">
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                className="w-full rounded-xl border-none bg-status-error py-4 text-white shadow-md hover:bg-red-700"
              >
                حذف الحساب نهائيًا
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-surface-dark">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <X size={20} />
            </button>

            <div className="p-6 sm:p-8">
              <h2 className="mb-2 text-2xl font-black">
                تفاصيل الطلب #{selectedOrder.orderNumber || selectedOrder.id}
              </h2>

              <div className="mb-6 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeOptions(selectedOrder.status).colors}`}
                >
                  {getStatusBadgeOptions(selectedOrder.status).label}
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  {selectedOrder.fulfillmentType === 'pickup'
                    ? 'استلام من المطعم'
                    : 'توصيل'}
                </span>
              </div>

              <div className="space-y-4">
                {selectedOrder.items.map((item, index) => (
                  <button
                    key={item.cartItemId || `${item.menuItem.id}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedOrder(null);
                      navigate(`/menu/${item.menuItem.id}`);
                    }}
                    className="flex w-full items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-right transition hover:border-primary-main dark:border-gray-800 dark:bg-black"
                  >
                    <img
                      src={item.menuItem.images?.[0] || '/favicon.svg'}
                      alt={item.menuItem.name}
                      className="h-16 w-16 rounded-xl object-cover"
                    />

                    <div className="flex-1">
                      <h3 className="text-lg font-black">{item.menuItem.name}</h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                        {item.customization?.breadType ? (
                          <p>الخبز: {item.customization.breadType}</p>
                        ) : null}

                        {item.customization?.ingredients?.length ? (
                          <p>
                            المكونات المختارة:{' '}
                            {item.customization.ingredients.join('، ')}
                          </p>
                        ) : null}

                        {item.customization?.extras?.length ? (
                          <p>الإضافات: {item.customization.extras.join('، ')}</p>
                        ) : null}

                        {item.customization?.notes ? (
                          <p>ملاحظة: {item.customization.notes}</p>
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-500">الكمية: {item.quantity}</p>
                    </div>

                    <div className="font-black text-primary-dark">
                      {formatCurrency(item.subtotal * item.quantity)}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-black">
                <div className="flex justify-between">
                  <span className="text-gray-500">المجموع الفرعي</span>
                  <span className="font-bold">
                    {formatCurrency(selectedOrder.subtotal || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">رسوم التوصيل</span>
                  <span className="font-bold">
                    {formatCurrency(selectedOrder.deliveryFee || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-3 text-lg dark:border-gray-800">
                  <span className="font-black">الإجمالي</span>
                  <span className="font-black text-primary-dark">
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>
              </div>

              {selectedOrder.fulfillmentType !== 'pickup' &&
                selectedOrder.deliveryAddress && (
                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
                    <h3 className="mb-2 font-black">عنوان التوصيل</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedOrder.deliveryAddress.label} -{' '}
                      {selectedOrder.deliveryAddress.details}
                    </p>
                  </div>
                )}

              {selectedOrder.driverNotes && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-900/10">
                  <h3 className="mb-2 font-black">ملاحظات</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {selectedOrder.driverNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-surface-dark">
            <button
              onClick={() => setShowEditProfile(false)}
              className="absolute right-4 top-4 text-gray-500 transition hover:text-black dark:hover:text-white"
            >
              <X size={24} />
            </button>

            <h2 className="mt-2 mb-6 text-2xl font-black">تعديل البيانات</h2>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-600">
                  الاسم الكامل
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 p-4 outline-none focus:ring-primary-main dark:border-gray-700 dark:bg-black"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-600">
                  رقم الهاتف
                </label>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 p-4 text-right outline-none focus:ring-primary-main dark:border-gray-700 dark:bg-black"
                />
              </div>

              <Button type="submit" className="mt-4 h-14 w-full rounded-xl text-lg">
                حفظ التغييرات
              </Button>
            </form>
          </div>
        </div>
      )}

      {showAddAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-surface-dark">
            <button
              onClick={() => setShowAddAddress(false)}
              className="absolute right-4 top-4 text-gray-500 transition hover:text-black dark:hover:text-white"
            >
              <X size={24} />
            </button>

            <h2 className="mt-2 mb-6 text-2xl font-black">عنوان جديد</h2>

            <form onSubmit={handleAddAddress} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-600">
                  اسم العنوان
                </label>
                <input
                  value={newAddressLabel}
                  onChange={(e) => setNewAddressLabel(e.target.value)}
                  required
                        placeholder=""
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 p-4 outline-none focus:ring-primary-main dark:border-gray-700 dark:bg-black"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-bold text-gray-600">
                  تفاصيل العنوان (مثل: الشارع، رقم البناء، معلم مشهور)
                </label>

                <textarea
                  value={newAddressDetails}
                  onChange={(e) => setNewAddressDetails(e.target.value)}
                  required
                  placeholder="مثلاً: شارع النصر، مقابل بنك فلسطين، عمارة الأمل الطابق الثاني"
                  className="min-h-[100px] w-full rounded-xl border border-gray-300 bg-gray-50 p-4 outline-none focus:ring-2 focus:ring-primary-main/20 dark:border-gray-700 dark:bg-black transition-all"
                />

                <div className="mt-4">
                  <LocationButton
                    onClick={handleGeoLocation}
                    loading={loadingGeo}
                    hasLocation={!!selectedCoords}
                  />
                </div>
              </div>

              <Button type="submit" className="mt-4 h-14 w-full rounded-xl text-lg">
                إضافة العنوان
              </Button>
            </form>
          </div>
        </div>
      )}
      {tempImage && (
        <ImageCropperModal
          image={tempImage}
          onCropComplete={handleCropComplete}
          onClose={() => setTempImage(null)}
          circularCrop={true}
        />
      )}
    </div>
  );
};

export default AccountPage;

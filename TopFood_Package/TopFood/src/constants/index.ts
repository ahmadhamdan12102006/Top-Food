export const COLORS = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  surfaceLight: '#FFFFFF',
  surfaceDark: '#121214',
  bgLight: '#F9F9FB',
  bgDark: '#09090B',
  textLight: '#18181B',
  textDark: '#FAFAFA',
  success: '#10B981',
  error: '#EF4444',
} as const;

// Legacy constants - Now migrated to Firestore.
// Do not use these for UI, use adminService.adminGetSettings() instead.
export const DELIVERY_AREAS: any[] = [];
export const WORKING_HOURS: any = {};

// Admin & Driver Authentication
export const ADMIN_PIN = '1234';

export const DRIVERS = [
  { id: 'driver-1', name: 'أحمد', pin: '5678', isActive: true },
  { id: 'driver-2', name: 'محمد', pin: '9012', isActive: true },
];

export const ORDER_STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'قيد الانتظار', color: '#F59E0B', bg: '#FEF3C7' },
  preparing: { label: 'جاري التحضير', color: '#3B82F6', bg: '#DBEAFE' },
  ready_for_pickup: {
    label: 'جاهز للاستلام',
    color: '#0F766E',
    bg: '#CCFBF1',
  },
  on_the_way: { label: 'في الطريق', color: '#8B5CF6', bg: '#EDE9FE' },
  delivered: { label: 'تم التوصيل', color: '#10B981', bg: '#D1FAE5' },
  cancelled: { label: 'ملغي', color: '#EF4444', bg: '#FEE2E2' },
};

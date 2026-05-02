export type UserRole = 'customer' | 'admin' | 'driver';

export type FulfillmentType = 'delivery' | 'pickup';

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready_for_pickup'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export interface Address {
  id: string;
  label: string;
  details: string;
  location?: string;
  coords?: {
    lat: number;
    lng: number;
  };
  isDefault?: boolean;
  deliveryAreaId?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  countryCode: string;
  role: UserRole;
  profileImage: string | null;
  loyaltyPoints: number;
  addresses: Address[];
  isVip?: boolean;
  anonymousDriverRatings?: boolean;
  preferredDriverId?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  pin: string;
  isActive: boolean;
  balance: number;
  currentOrderId?: string | null;
  averageRating?: number;
  totalRatings?: number;
  profileImage?: string | null;
  liveLocation?: {
    lat: number;
    lng: number;
    updatedAt: number;
  } | null;
  isLocationSharingEnabled?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  order?: number;
  isActive?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  image?: string;
  price?: number;
  isAvailable: boolean;
  isRequired?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  categoryId: string;
  categoryName?: string;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  ingredients?: string[];
  customizationOptions?: {
    breadTypes?: { name: string; price: number }[];
    isBreadRequired?: boolean;
    sauces?: { name: string; price: number }[];
    isSaucesRequired?: boolean;
    extras?: { name: string; price: number }[];
    isExtrasRequired?: boolean;
    removals?: string[];
  };
  createdAt?: number;
  updatedAt?: number;
  category?: Category;
}

export interface CartItem {
  cartItemId?: string;
  menuItem: MenuItem;
  quantity: number;
  subtotal: number;
  customization?: {
    size?: string;
    breadType?: string;
    ingredients?: string[];
    sauces?: string[];
    extras?: string[];
    without?: string[];
    removals?: string[];
    notes?: string;
  };
}

export interface Order {
  id: string;
  orderNumber?: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryArea?: string;
  deliveryAddress: Address | null;
  driverNotes?: string;
  assignedDriverId?: string | null;
  selectedDriverId?: string | null;
  isGuest?: boolean;
  statusHistory?: Array<{
    status: OrderStatus;
    timestamp: number;
    by?: string;
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface Review {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface DriverRating {
  id: string;
  driverId: string;
  userId: string;
  userName: string | null;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface DeliveryArea {
  id: string;
  name: string;
  fee: number;
}

export interface SocialLinks {
  whatsapp?: string;
  instagram?: string;
  snapchat?: string;
  tiktok?: string;
}

export interface SiteSettings {
  workingHoursOpen: string;
  workingHoursClose: string;
  workingDays: string;
  fridayOpen?: string;
  fridayClose?: string;
  isFridayActive?: boolean;
  welcomeMessage?: string;
  contactPhone: string;
  deliveryAreas?: DeliveryArea[];
  socialLinks?: SocialLinks;
  storeLocation?: {
    lat: number;
    lng: number;
  };
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: number;
  createdBy: string;
  createdAt: number;
}

export interface Loan {
  id: string;
  personName: string;
  amount: number;
  type: 'given' | 'received';
  date: number;
  notes: string;
  createdAt: number;
}

export interface DailyReport {
  id: string;
  date: number;
  totalRevenue: number;
  totalExpenses: number;
  totalLoansGiven: number;
  totalLoansReceived: number;
  cancelledTotal: number;
  netProfit: number;
  orderCount: number;
  cancelledCount: number;
  closedBy: string;
  closedAt: number;
}

export interface InvoiceRow {
  id: string;
  [key: string]: string | number | null | undefined;
}

export interface InvoiceColumn {
  key: string;
  title: string;
  type: 'text' | 'number' | 'currency';
}

export interface Invoice {
  id: string;
  title: string;
  columns: InvoiceColumn[];
  rows: InvoiceRow[];
  totals: Record<string, number>;
  date: number;
  createdBy: string;
  createdAt: number;
}
export interface HomeBanner {
  id: string;
  image: string;
  title: string;
  description?: string;
  link?: string;
  order: number;
  isActive: boolean;
}

export interface HomeSettings {
  banners: HomeBanner[];
  featuredItemIds: string[];
  popularItemIds: string[];
  sections: {
    id: string;
    title: string;
    type: 'category' | 'promotion' | 'items';
    value: string; // categoryId or custom promotion text
    order: number;
    isActive: boolean;
  }[];
  updatedAt: number;
}

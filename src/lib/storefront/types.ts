export type StoreIndustry = "hotel" | "salon" | "restaurant" | "golf" | "clinic";

export type StorefrontTemplateKey =
  | "hotel_standard"
  | "salon_standard"
  | "restaurant_standard"
  | "golf_standard"
  | "clinic_standard";

export type StorefrontLayoutKey =
  | "hotel_standard"
  | "salon_standard"
  | "restaurant_standard"
  | "golf_standard"
  | "clinic_standard";

export type ReserveFlowKey =
  | "hotel_step"
  | "salon_step"
  | "restaurant_step"
  | "golf_step"
  | "clinic_step";

export type StoreTheme = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  logoUrl?: string;
  heroImage?: string;
  borderRadius: "sm" | "md" | "lg";
  fontFamily: string;
  buttonStyle: "solid" | "soft" | "outline";
};

export type StoreModules = {
  showCoupons: boolean;
  showCalendar: boolean;
  showStaffSelect: boolean;
  showRoomSelect: boolean;
  showSeatType: boolean;
  showGuestCount: boolean;
  showNotes: boolean;
  showQuestionnaire: boolean;
  showMemberCard: boolean;
};

export type StoreTemplateConfig = {
  storefront: StorefrontLayoutKey;
  reserve: ReserveFlowKey;
  customTemplateKey?: string;
};

export type BusinessHours = {
  label: string;
  days: string;
  hours: string;
  note?: string;
};

export type ReservationSettings = {
  minLeadHours: number;
  slotIntervalMinutes: number;
  maxGuests: number;
  completionMessage: string;
};

export type LineSettings = {
  liffId: string;
  loginChannelId?: string;
  officialAccountUrl: string;
  friendUrl: string;
};

export type Store = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  industry: StoreIndustry;
  template: StorefrontTemplateKey;
  layout: StoreTemplateConfig;
  theme: StoreTheme;
  modules: StoreModules;
  address: string;
  access: string;
  businessHours: BusinessHours[];
  reservationSettings: ReservationSettings;
  lineSettings: LineSettings;
  description: string;
  phone: string;
};

export type Menu = {
  id: string;
  storeId: string;
  bookingTemplate?: string;
  name: string;
  description: string;
  priceLabel: string;
  price?: number;
  durationMinutes: number;
  imageUrl?: string;
  category: string;
  enabled?: boolean;
  sortOrder?: number;
};

export type Coupon = {
  id: string;
  title: string;
  description: string;
  expiresAt: string;
};

export type Staff = {
  id: string;
  name: string;
  role: string;
  profile: string;
  imageUrl?: string;
  enabled?: boolean;
  sortOrder?: number;
};

export type Question = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  required: boolean;
  options?: string[];
};

export type Customer = {
  id: string;
  storeId: string;
  lineUserId: string;
  displayName: string;
  phone?: string;
};

export type Reservation = {
  id: string;
  storeId: string;
  customerId: string;
  lineUserId: string;
  lineDisplayName: string;
  menuId: string;
  staffId?: string;
  guestCount?: number;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled" | "visited";
  answers: Record<string, string>;
  notes?: string;
  createdAt: string;
};

export type AvailableSlot = {
  date: string;
  time: string;
  capacity?: number;
  booked?: number;
  remaining: number;
  available?: boolean;
};

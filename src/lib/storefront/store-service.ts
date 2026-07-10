import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  mockCoupons,
  mockMenus,
  mockQuestions,
  mockStaff,
  mockStores,
} from "./mock-data";
import type { AvailableSlot, Coupon, Menu, Question, Staff, Store } from "./types";

export type StoreResolutionResult =
  | { ok: true; store: Store }
  | { ok: false; response: NextResponse<{ error: string }> };

type StoreDocument = {
  name?: string;
  heroImageUrl?: string;
  themeColor?: string;
  reservationEnabled?: boolean;
  industry?: string;
  template?: string;
  storefrontTemplate?: string;
  reserveFlow?: string;
  description?: string;
  displayText?: {
    description?: string;
    completionMessage?: string;
  };
  address?: string;
  access?: string;
  phone?: string;
  logoUrl?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  businessHours?: BusinessHoursDocument[];
  reservationSettings?: Partial<Store["reservationSettings"]>;
  lineSettings?: Partial<Store["lineSettings"]>;
  modules?: Partial<Store["modules"]>;
};

type BusinessHoursDocument = {
  label?: string;
  days?: string;
  hours?: string;
  note?: string;
};

type MenuDocument = {
  bookingTemplate?: string;
  name?: string;
  description?: string;
  price?: number | string;
  priceLabel?: string;
  durationMinutes?: number | string;
  imageUrl?: string;
  enabled?: boolean;
  sortOrder?: number;
  category?: string;
};

type StaffDocument = {
  name?: string;
  role?: string;
  profile?: string;
  imageUrl?: string;
  enabled?: boolean;
  sortOrder?: number;
};

type AvailabilityDocument = {
  slots?: Array<{
    time?: string;
    available?: boolean;
    capacity?: number;
    booked?: number;
    remaining?: number;
  }>;
};

const defaultStoreId = "default";
const defaultStoreSlug = "booking";

export async function getStore(): Promise<Store> {
  const mockStore = mockStores[0];
  const storeDoc = await getStoreDocument();
  const reservationEnabled = storeDoc?.reservationEnabled ?? mockStore.status === "active";
  const industry = toStoreIndustry(storeDoc?.industry) ?? mockStore.industry;
  const storefrontTemplate = toStorefrontLayoutKey(storeDoc?.storefrontTemplate ?? storeDoc?.template) ?? mockStore.layout.storefront;
  const reserveFlow = toReserveFlowKey(storeDoc?.reserveFlow) ?? mockStore.layout.reserve;

  return {
    ...mockStore,
    id: defaultStoreId,
    name: storeDoc?.name?.trim() || mockStore.name,
    slug: defaultStoreSlug,
    status: reservationEnabled ? "active" : "inactive",
    industry,
    template: toStorefrontTemplateKey(storeDoc?.template) ?? mockStore.template,
    layout: {
      ...mockStore.layout,
      storefront: storefrontTemplate,
      reserve: reserveFlow,
    },
    theme: {
      ...mockStore.theme,
      primaryColor: storeDoc?.themeColor || mockStore.theme.primaryColor,
      secondaryColor: storeDoc?.secondaryColor || mockStore.theme.secondaryColor,
      backgroundColor: storeDoc?.backgroundColor || mockStore.theme.backgroundColor,
      surfaceColor: storeDoc?.surfaceColor || mockStore.theme.surfaceColor,
      textColor: storeDoc?.textColor || mockStore.theme.textColor,
      mutedTextColor: storeDoc?.mutedTextColor || mockStore.theme.mutedTextColor,
      heroImage: storeDoc?.heroImageUrl || mockStore.theme.heroImage,
      logoUrl: storeDoc?.logoUrl || mockStore.theme.logoUrl,
    },
    modules: {
      ...mockStore.modules,
      ...storeDoc?.modules,
    },
    address: storeDoc?.address ?? mockStore.address,
    access: storeDoc?.access ?? mockStore.access,
    businessHours: buildBusinessHours(storeDoc?.businessHours, mockStore.businessHours),
    reservationSettings: {
      ...mockStore.reservationSettings,
      ...storeDoc?.reservationSettings,
      completionMessage:
        storeDoc?.displayText?.completionMessage ??
        storeDoc?.reservationSettings?.completionMessage ??
        mockStore.reservationSettings.completionMessage,
    },
    lineSettings: {
      ...mockStore.lineSettings,
      ...storeDoc?.lineSettings,
    },
    description: storeDoc?.displayText?.description ?? storeDoc?.description ?? mockStore.description,
    phone: storeDoc?.phone ?? mockStore.phone,
  };
}

export async function requireStore(): Promise<Store> {
  const store = await getStore();

  if (!store) {
    notFound();
  }

  return store;
}

export async function resolveActiveStoreForApi(): Promise<StoreResolutionResult> {
  let store: Store;

  try {
    store = await getStore();
  } catch (cause) {
    console.error("店舗情報の取得に失敗しました", cause);
    return {
      ok: false,
      response: NextResponse.json({ error: "店舗情報の取得に失敗しました。" }, { status: 500 }),
    };
  }

  if (store.status !== "active") {
    return {
      ok: false,
      response: NextResponse.json({ error: "現在予約を受け付けていません。" }, { status: 403 }),
    };
  }

  return { ok: true, store };
}

export async function getMenus(options?: { bookingTemplate?: string }): Promise<Menu[]> {
  try {
    const snapshot = await getAdminDb().collection("menus").get();
    const menus = snapshot.docs
      .map((doc) => buildMenuFromDocument(doc.id, doc.data() as MenuDocument))
      .filter((menu) => menu.enabled !== false)
      .filter((menu) => matchesBookingTemplate(menu, options?.bookingTemplate))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return menus.length ? menus : getMockMenus(options?.bookingTemplate);
  } catch (cause) {
    console.warn("Firestoreのmenus取得に失敗したためモックにフォールバックします", cause);
    return getMockMenus(options?.bookingTemplate);
  }
}

export async function getCoupons(): Promise<Coupon[]> {
  return mockCoupons[mockStores[0].id] ?? [];
}

export async function getStaff(): Promise<Staff[]> {
  try {
    const snapshot = await getAdminDb().collection("staff").get();
    const staff = snapshot.docs
      .map((doc) => buildStaffFromDocument(doc.id, doc.data() as StaffDocument))
      .filter((member) => member.enabled !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return staff.length ? staff : mockStaff[mockStores[0].id] ?? [];
  } catch (cause) {
    console.warn("Firestoreのstaff取得に失敗したためモックにフォールバックします", cause);
    return mockStaff[mockStores[0].id] ?? [];
  }
}

export async function getQuestions(options?: { bookingTemplate?: string }): Promise<Question[]> {
  if (isStandaloneBookingTemplate(options?.bookingTemplate)) {
    return [];
  }

  return mockQuestions[mockStores[0].id] ?? [];
}

export async function getAvailableSlots(): Promise<AvailableSlot[]> {
  try {
    const snapshot = await getAdminDb().collection("availability").orderBy("__name__", "asc").limit(60).get();
    const slots = snapshot.docs.flatMap((doc) => buildAvailableSlotsFromDocument(doc.id, doc.data() as AvailabilityDocument));

    return slots;
  } catch (cause) {
    console.warn("Firestoreのavailability取得に失敗しました", cause);
    return [];
  }
}

async function getStoreDocument(): Promise<StoreDocument | null> {
  try {
    const snapshot = await getAdminDb().collection("settings").doc("site").get();

    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() as StoreDocument;
  } catch (cause) {
    console.warn("settings/siteの取得に失敗したためモック店舗情報を使用します", cause);
    return null;
  }
}

function buildMenuFromDocument(id: string, data: MenuDocument): Menu {
  const price = typeof data.price === "number" ? data.price : Number(data.price);
  const priceLabel = data.priceLabel?.trim() || (Number.isFinite(price) ? `${price.toLocaleString("ja-JP")}円` : "");
  const durationMinutes = Number(data.durationMinutes);

  return {
    id,
    storeId: defaultStoreId,
    bookingTemplate: data.bookingTemplate?.trim() || undefined,
    name: data.name?.trim() || "名称未設定メニュー",
    description: data.description?.trim() || "",
    price: Number.isFinite(price) ? price : undefined,
    priceLabel,
    durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 60,
    imageUrl: data.imageUrl?.trim() || undefined,
    category: data.category?.trim() || "menu",
    enabled: data.enabled ?? true,
    sortOrder: data.sortOrder ?? 0,
  };
}

function getMockMenus(bookingTemplate?: string): Menu[] {
  return mockMenus
    .map((menu) => ({ ...menu, storeId: defaultStoreId }))
    .filter((menu) => matchesBookingTemplate(menu, bookingTemplate));
}

function matchesBookingTemplate(menu: Menu, bookingTemplate?: string) {
  if (!bookingTemplate) {
    return true;
  }

  if (menu.bookingTemplate) {
    return menu.bookingTemplate === bookingTemplate;
  }

  const category = menu.category.toLowerCase();

  if (bookingTemplate === "hotel-search") {
    return ["room", "hotel", "stay"].includes(category);
  }

  if (bookingTemplate === "calendar") {
    return ["hair", "care", "salon", "beauty"].includes(category);
  }

  if (bookingTemplate === "golf-start") {
    return ["golf", "course", "plan"].includes(category);
  }

  return true;
}

function isStandaloneBookingTemplate(bookingTemplate?: string) {
  return bookingTemplate === "hotel-search" || bookingTemplate === "calendar" || bookingTemplate === "golf-start";
}

function buildStaffFromDocument(id: string, data: StaffDocument): Staff {
  return {
    id,
    name: data.name?.trim() || "スタッフ未設定",
    role: data.role?.trim() || "Staff",
    profile: data.profile?.trim() || "",
    imageUrl: data.imageUrl?.trim() || undefined,
    enabled: data.enabled ?? true,
    sortOrder: data.sortOrder ?? 0,
  };
}

function buildAvailableSlotsFromDocument(date: string, data: AvailabilityDocument): AvailableSlot[] {
  return (data.slots ?? [])
    .map((slot) => {
      const capacity = Number(slot.capacity);
      const booked = Number(slot.booked);
      const remaining =
        typeof slot.remaining === "number"
          ? slot.remaining
          : Number.isFinite(capacity)
            ? Math.max(capacity - (Number.isFinite(booked) ? booked : 0), 0)
            : 1;

      return {
        date,
        time: slot.time?.trim() ?? "",
        capacity: Number.isFinite(capacity) ? capacity : undefined,
        booked: Number.isFinite(booked) ? booked : undefined,
        remaining,
        available: slot.available ?? true,
      };
    })
    .filter((slot) => slot.available !== false && Boolean(slot.time) && slot.remaining > 0)
    .map((slot) => ({
      date: slot.date,
      time: slot.time,
      capacity: slot.capacity,
      booked: slot.booked,
      remaining: slot.remaining,
      available: slot.available,
    }));
}

function buildBusinessHours(businessHours: BusinessHoursDocument[] | undefined, fallback: Store["businessHours"]) {
  if (!businessHours?.length) {
    return fallback;
  }

  return businessHours.map((item) => ({
    label: item.label ?? "",
    days: item.days ?? "",
    hours: item.hours ?? "",
    note: item.note,
  }));
}

function toStoreIndustry(value: string | undefined): Store["industry"] | null {
  if (value === "hotel" || value === "salon" || value === "restaurant" || value === "golf" || value === "clinic") {
    return value;
  }

  return null;
}

function toStorefrontTemplateKey(value: string | undefined): Store["template"] | null {
  if (
    value === "hotel_standard" ||
    value === "salon_standard" ||
    value === "restaurant_standard" ||
    value === "golf_standard" ||
    value === "clinic_standard"
  ) {
    return value;
  }

  return null;
}

function toStorefrontLayoutKey(value: string | undefined): Store["layout"]["storefront"] | null {
  return toStorefrontTemplateKey(value);
}

function toReserveFlowKey(value: string | undefined): Store["layout"]["reserve"] | null {
  if (
    value === "hotel_step" ||
    value === "salon_step" ||
    value === "restaurant_step" ||
    value === "golf_step" ||
    value === "clinic_step"
  ) {
    return value;
  }

  return null;
}

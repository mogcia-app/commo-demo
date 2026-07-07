import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  mockAvailableSlots,
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

type StorefrontDocument = {
  storeId?: string;
  companyId?: string;
  published?: boolean;
  reservationEnabled?: boolean;
};

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
    remaining?: number;
  }>;
};

export async function getStoreBySlug(storeSlug: string): Promise<Store | null> {
  const normalizedSlug = storeSlug.trim().toLowerCase();
  const storefront = await getStorefrontBySlug(normalizedSlug).catch((cause) => {
    console.warn("storefrontの取得に失敗したためモック店舗にフォールバックします", cause);
    return null;
  });

  if (storefront) {
    return buildStoreFromStorefront(normalizedSlug, storefront);
  }

  return mockStores.find((store) => store.slug === normalizedSlug) ?? null;
}

export async function requireStoreBySlug(storeSlug: string): Promise<Store> {
  const store = await getStoreBySlug(storeSlug);

  if (!store) {
    notFound();
  }

  return store;
}

export async function resolveActiveStoreForApi(storeSlug: string): Promise<StoreResolutionResult> {
  let storefront: StorefrontDocument | null = null;
  const normalizedSlug = storeSlug.trim().toLowerCase();

  try {
    storefront = await getStorefrontBySlug(normalizedSlug);
  } catch (cause) {
    console.error("storefrontの解決に失敗しました", cause);
    return {
      ok: false,
      response: NextResponse.json({ error: "店舗情報の取得に失敗しました。" }, { status: 500 }),
    };
  }

  if (!storefront?.storeId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "店舗が見つかりません。" }, { status: 404 }),
    };
  }

  const store = await buildStoreFromStorefront(normalizedSlug, storefront);

  if (storefront.published === false || store.status !== "active") {
    return {
      ok: false,
      response: NextResponse.json({ error: "この店舗は現在予約を受け付けていません。" }, { status: 403 }),
    };
  }

  return { ok: true, store };
}

export async function getMenusForStore(storeId: string): Promise<Menu[]> {
  try {
    const snapshot = await getAdminDb().collection("stores").doc(storeId).collection("menus").get();
    const menus = snapshot.docs
      .map((doc) => buildMenuFromDocument(storeId, doc.id, doc.data() as MenuDocument))
      .filter((menu) => menu.enabled !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return menus.length ? menus : getFallbackMenusForStore(storeId);
  } catch (cause) {
    console.warn("Firestoreのmenus取得に失敗したためモックにフォールバックします", cause);
    return getFallbackMenusForStore(storeId);
  }
}

export async function getCouponsForStore(storeId: string): Promise<Coupon[]> {
  return mockCoupons[storeId] ?? [];
}

export async function getStaffForStore(storeId: string): Promise<Staff[]> {
  try {
    const snapshot = await getAdminDb().collection("stores").doc(storeId).collection("staff").get();
    const staff = snapshot.docs
      .map((doc) => buildStaffFromDocument(doc.id, doc.data() as StaffDocument))
      .filter((member) => member.enabled !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return staff;
  } catch (cause) {
    console.warn("Firestoreのstaff取得に失敗したためモックにフォールバックします", cause);
    return mockStaff[storeId] ?? [];
  }
}

export async function getQuestionsForStore(storeId: string): Promise<Question[]> {
  return mockQuestions[storeId] ?? [];
}

export async function getAvailableSlotsForStore(storeId: string): Promise<AvailableSlot[]> {
  try {
    const snapshot = await getAdminDb()
      .collection("stores")
      .doc(storeId)
      .collection("availability")
      .orderBy("__name__", "asc")
      .limit(60)
      .get();
    const slots = snapshot.docs.flatMap((doc) => buildAvailableSlotsFromDocument(doc.id, doc.data() as AvailabilityDocument));

    return slots;
  } catch (cause) {
    console.warn("Firestoreのavailability取得に失敗したためモックにフォールバックします", cause);
    return mockAvailableSlots;
  }
}

async function getStorefrontBySlug(storeSlug: string): Promise<StorefrontDocument | null> {
  const snapshot = await getAdminDb().collection("storefronts").doc(storeSlug).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as StorefrontDocument;
}

async function buildStoreFromStorefront(storeSlug: string, storefront: StorefrontDocument): Promise<Store> {
  const mockStore =
    mockStores.find((store) => store.id === storefront.storeId) ??
    mockStores.find((store) => store.slug === storeSlug) ??
    mockStores[0];
  const storeDoc = storefront.storeId ? await getStoreDocument(storefront.storeId) : null;
  const reservationEnabled = storeDoc?.reservationEnabled ?? storefront.reservationEnabled ?? mockStore.status === "active";
  const industry = toStoreIndustry(storeDoc?.industry) ?? mockStore.industry;
  const storefrontTemplate = toStorefrontLayoutKey(storeDoc?.storefrontTemplate ?? storeDoc?.template) ?? mockStore.layout.storefront;
  const reserveFlow = toReserveFlowKey(storeDoc?.reserveFlow) ?? mockStore.layout.reserve;

  return {
    ...mockStore,
    id: storefront.storeId ?? mockStore.id,
    name: storeDoc?.name?.trim() || mockStore.name,
    slug: storeSlug,
    status: storefront.published === false || !reservationEnabled ? "inactive" : "active",
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

async function getStoreDocument(storeId: string): Promise<StoreDocument | null> {
  try {
    const snapshot = await getAdminDb().collection("stores").doc(storeId).get();

    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() as StoreDocument;
  } catch (cause) {
    console.warn("storesドキュメントの取得に失敗したためモック店舗情報を使用します", cause);
    return null;
  }
}

function buildMenuFromDocument(storeId: string, id: string, data: MenuDocument): Menu {
  const price = typeof data.price === "number" ? data.price : Number(data.price);
  const priceLabel = data.priceLabel?.trim() || (Number.isFinite(price) ? `${price.toLocaleString("ja-JP")}円` : "");
  const durationMinutes = Number(data.durationMinutes);

  return {
    id,
    storeId,
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

function getFallbackMenusForStore(storeId: string): Menu[] {
  const mockStoreMenus = mockMenus.filter((menu) => menu.storeId === storeId);

  if (mockStoreMenus.length) {
    return mockStoreMenus;
  }

  return [
    {
      id: "default_reservation",
      storeId,
      name: "予約メニュー",
      description: "店舗別メニューが未設定のため、デフォルトの予約メニューを使用します。",
      priceLabel: "",
      durationMinutes: 60,
      category: "reservation",
      enabled: true,
      sortOrder: 0,
    },
  ];
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
    .filter((slot) => slot.available !== false && Boolean(slot.time?.trim()))
    .map((slot) => ({
      date,
      time: slot.time?.trim() ?? "",
      remaining: slot.remaining ?? 1,
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

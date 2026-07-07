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

  if (!storefront.published || !storefront.reservationEnabled) {
    return {
      ok: false,
      response: NextResponse.json({ error: "この店舗は現在予約を受け付けていません。" }, { status: 403 }),
    };
  }

  return { ok: true, store: buildStoreFromStorefront(normalizedSlug, storefront) };
}

export async function getMenusForStore(storeId: string): Promise<Menu[]> {
  return mockMenus.filter((menu) => menu.storeId === storeId);
}

export async function getCouponsForStore(storeId: string): Promise<Coupon[]> {
  return mockCoupons[storeId] ?? [];
}

export async function getStaffForStore(storeId: string): Promise<Staff[]> {
  return mockStaff[storeId] ?? [];
}

export async function getQuestionsForStore(storeId: string): Promise<Question[]> {
  return mockQuestions[storeId] ?? [];
}

export async function getAvailableSlotsForStore(storeId: string): Promise<AvailableSlot[]> {
  void storeId;
  return mockAvailableSlots;
}

async function getStorefrontBySlug(storeSlug: string): Promise<StorefrontDocument | null> {
  const snapshot = await getAdminDb().collection("storefronts").doc(storeSlug).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as StorefrontDocument;
}

function buildStoreFromStorefront(storeSlug: string, storefront: StorefrontDocument): Store {
  const mockStore =
    mockStores.find((store) => store.id === storefront.storeId) ??
    mockStores.find((store) => store.slug === storeSlug) ??
    mockStores[0];

  return {
    ...mockStore,
    id: storefront.storeId ?? mockStore.id,
    slug: storeSlug,
    status: storefront.published && storefront.reservationEnabled ? "active" : "inactive",
  };
}

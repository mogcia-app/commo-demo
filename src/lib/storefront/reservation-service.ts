import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Menu, Reservation, Store } from "./types";

type CreateReservationInput = {
  store: Store;
  menu: Menu;
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl?: string;
  displayName: string;
  phone: string;
  email?: string;
  menuId: string;
  staffId?: string;
  guestCount?: number;
  date: string;
  time: string;
  answers: Record<string, string>;
  notes?: string;
  source?: "liff" | "line" | "web";
  campaignId?: string;
  couponId?: string;
};

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const db = getAdminDb();
  const storeRef = db.collection("stores").doc(input.store.id);
  const customerId = `line_${toSafeDocId(input.lineUserId)}`;
  const customerRef = storeRef.collection("customers").doc(customerId);
  const lineUserRef = storeRef.collection("lineUsers").doc(toSafeDocId(input.lineUserId));
  const reservationRef = storeRef.collection("reservations").doc();
  const analyticsEventRef = storeRef.collection("analyticsEvents").doc();
  const startDate = parseStoreDateTime(input.date, input.time);
  const endDate = new Date(startDate.getTime() + input.menu.durationMinutes * 60 * 1000);
  const startAt = Timestamp.fromDate(startDate);
  const endAt = Timestamp.fromDate(endDate);
  const now = FieldValue.serverTimestamp();
  const source = input.source ?? "liff";

  await db.runTransaction(async (transaction) => {
    const existingCustomer = await transaction.get(customerRef);
    const existingLineUser = await transaction.get(lineUserRef);

    transaction.set(
      customerRef,
      {
        name: input.displayName,
        phone: input.phone,
        email: input.email ?? "",
        lineUserId: input.lineUserId,
        lineLinked: true,
        visits: FieldValue.increment(1),
        lastVisitAt: startAt,
        tags: existingCustomer.exists ? existingCustomer.data()?.tags ?? [] : [],
        createdAt: existingCustomer.exists ? existingCustomer.data()?.createdAt ?? now : now,
        updatedAt: now,
      },
      { merge: true },
    );

    transaction.set(
      lineUserRef,
      {
        customerId,
        displayName: input.lineDisplayName || input.displayName,
        pictureUrl: input.linePictureUrl ?? "",
        followStatus: "following",
        lastMessageAt: null,
        linkedAt: existingLineUser.exists ? existingLineUser.data()?.linkedAt ?? now : now,
      },
      { merge: true },
    );

    transaction.set(reservationRef, {
      storeId: input.store.id,
      storeSlug: input.store.slug,
      customerId,
      lineUserId: input.lineUserId,
      menu: input.menu.name,
      menuSnapshot: {
        id: input.menu.id,
        name: input.menu.name,
        priceLabel: input.menu.priceLabel,
        category: input.menu.category,
        durationMinutes: input.menu.durationMinutes,
      },
      menuId: input.menuId,
      staffId: input.staffId ?? "",
      guestCount: input.guestCount ?? null,
      startAt,
      endAt,
      status: "confirmed",
      source,
      campaignId: input.campaignId ?? "",
      couponId: input.couponId ?? "",
      customerSnapshot: {
        name: input.displayName,
        phone: input.phone,
        email: input.email ?? "",
      },
      answers: input.answers,
      notes: input.notes ?? "",
      notifications: {
        completedSentAt: null,
        reminderSentAt: null,
        cancelSentAt: null,
      },
      createdAt: now,
      updatedAt: now,
    });

    transaction.set(analyticsEventRef, {
      storeId: input.store.id,
      storeSlug: input.store.slug,
      eventType: "reservation_complete",
      source,
      lineUserId: input.lineUserId,
      customerId,
      campaignId: input.campaignId ?? "",
      couponId: input.couponId ?? "",
      reservationId: reservationRef.id,
      metadata: {
        menuId: input.menuId,
        menuName: input.menu.name,
        startAt: startAt.toDate().toISOString(),
      },
      createdAt: now,
    });
  });

  return {
    id: reservationRef.id,
    storeId: input.store.id,
    customerId,
    lineUserId: input.lineUserId,
    lineDisplayName: input.lineDisplayName,
    menuId: input.menuId,
    staffId: input.staffId,
    guestCount: input.guestCount,
    date: input.date,
    time: input.time,
    status: "confirmed",
    answers: input.answers,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
}

export type AnalyticsEventType =
  | "line_link_click"
  | "reservation_page_view"
  | "reservation_start"
  | "reservation_complete"
  | "coupon_open"
  | "coupon_used"
  | "mypage_view"
  | "inquiry_start";

export async function createAnalyticsEvent(input: {
  store: Store;
  eventType: AnalyticsEventType;
  source?: "line" | "liff" | "web";
  lineUserId?: string;
  customerId?: string;
  campaignId?: string;
  couponId?: string;
  reservationId?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getAdminDb();
  const eventRef = db.collection("stores").doc(input.store.id).collection("analyticsEvents").doc();

  await eventRef.set({
    storeId: input.store.id,
    storeSlug: input.store.slug,
    eventType: input.eventType,
    source: input.source ?? "web",
    lineUserId: input.lineUserId ?? "",
    customerId: input.customerId ?? "",
    campaignId: input.campaignId ?? "",
    couponId: input.couponId ?? "",
    reservationId: input.reservationId ?? "",
    metadata: input.metadata ?? {},
    createdAt: FieldValue.serverTimestamp(),
  });

  return { id: eventRef.id };
}

function parseStoreDateTime(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00+09:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("日時の形式が不正です。");
  }

  return parsed;
}

function toSafeDocId(value: string) {
  return value.trim().replace(/\//g, "_");
}

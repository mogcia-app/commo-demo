import { NextResponse } from "next/server";
import { createAnalyticsEvent, type AnalyticsEventType } from "@/lib/storefront/reservation-service";
import { resolveActiveStoreForApi } from "@/lib/storefront/store-service";

const analyticsEventTypes: AnalyticsEventType[] = [
  "line_link_click",
  "reservation_page_view",
  "reservation_start",
  "reservation_complete",
  "coupon_open",
  "coupon_used",
  "mypage_view",
  "inquiry_start",
];

type AnalyticsEventRequest = {
  eventType?: AnalyticsEventType;
  source?: "line" | "liff" | "web";
  lineUserId?: string;
  customerId?: string;
  campaignId?: string;
  couponId?: string;
  reservationId?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const resolvedStore = await resolveActiveStoreForApi();

  if (!resolvedStore.ok) {
    return resolvedStore.response;
  }

  const body = (await request.json()) as AnalyticsEventRequest;

  if (!body.eventType || !analyticsEventTypes.includes(body.eventType)) {
    return NextResponse.json({ error: "eventTypeが不正です。" }, { status: 400 });
  }

  const event = await createAnalyticsEvent({
    store: resolvedStore.store,
    eventType: body.eventType,
    source: body.source,
    lineUserId: body.lineUserId?.trim(),
    customerId: body.customerId?.trim(),
    campaignId: body.campaignId?.trim(),
    couponId: body.couponId?.trim(),
    reservationId: body.reservationId?.trim(),
    metadata: body.metadata,
  });

  return NextResponse.json({ event });
}

"use client";

import { useEffect, useRef } from "react";
import { useLineProfile } from "@/hooks/use-line-profile";

type AnalyticsEventLoggerProps = {
  storeSlug: string;
  eventType:
    | "line_link_click"
    | "reservation_page_view"
    | "reservation_start"
    | "reservation_complete"
    | "coupon_open"
    | "coupon_used"
    | "mypage_view"
    | "inquiry_start";
  source?: "line" | "liff" | "web";
  campaignId?: string;
  couponId?: string;
  reservationId?: string;
  metadata?: Record<string, unknown>;
};

export function AnalyticsEventLogger({
  storeSlug,
  eventType,
  source = "liff",
  campaignId,
  couponId,
  reservationId,
  metadata,
}: AnalyticsEventLoggerProps) {
  const { profile } = useLineProfile();
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!profile || loggedRef.current) {
      return;
    }

    loggedRef.current = true;
    void fetch(`/api/stores/${storeSlug}/analytics-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        source,
        lineUserId: profile.userId,
        campaignId,
        couponId,
        reservationId,
        metadata,
      }),
    });
  }, [campaignId, couponId, eventType, metadata, profile, reservationId, source, storeSlug]);

  return null;
}

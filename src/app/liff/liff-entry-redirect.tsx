"use client";

import { useEffect, useState } from "react";

const defaultBookingPath = "/booking/hotel-search";
const passThroughKeys = ["campaignId", "couponId"];

export function LiffEntryRedirect() {
  const [message] = useState("LINEから予約ページへ移動しています");

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const statePath = currentUrl.searchParams.get("liff.state");
    const stateParams = getStateParams(statePath);
    const stateDestination = getStateDestination(statePath);

    if (stateDestination) {
      window.location.replace(stateDestination);
      return;
    }

    const destination = new URL(defaultBookingPath, window.location.origin);

    for (const key of passThroughKeys) {
      const value = currentUrl.searchParams.get(key) ?? stateParams.get(key);

      if (value) {
        destination.searchParams.set(key, value);
      }
    }

    window.location.replace(destination.toString());
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <p className="text-sm font-semibold text-slate-600">{message}</p>
    </main>
  );
}

function getStateDestination(statePath: string | null) {
  if (!statePath?.startsWith("/")) {
    return null;
  }

  if (statePath === "/" || statePath.startsWith("/liff")) {
    return null;
  }

  if (!statePath.startsWith("/booking")) {
    return null;
  }

  return new URL(statePath, window.location.origin).toString();
}

function getStateParams(statePath: string | null) {
  if (!statePath) {
    return new URLSearchParams();
  }

  const queryIndex = statePath.indexOf("?");

  if (queryIndex === -1) {
    return new URLSearchParams();
  }

  return new URLSearchParams(statePath.slice(queryIndex + 1));
}

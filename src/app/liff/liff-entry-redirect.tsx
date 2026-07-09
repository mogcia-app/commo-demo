"use client";

import { useEffect, useState } from "react";

const defaultBookingPath = "/hotel-search";
const passThroughKeys = ["campaignId", "couponId"];
const bookingPaths = ["/calendar", "/hotel-search", "/golf-start"];

export function LiffEntryRedirect() {
  const [message] = useState("LINEから予約ページへ移動しています");

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const statePath = currentUrl.searchParams.get("liff.state");
    const stateParams = getStateParams(statePath);
    const directPath = getDirectLiffPath(currentUrl.pathname, currentUrl.search);
    const requestedPath = currentUrl.searchParams.get("path") ?? stateParams.get("path");
    const stateDestination = buildBookingDestination(statePath, currentUrl, stateParams);
    const directDestination = buildBookingDestination(directPath, currentUrl, stateParams);
    const requestedDestination = buildBookingDestination(requestedPath, currentUrl, stateParams);

    if (stateDestination || directDestination || requestedDestination) {
      window.location.replace(stateDestination ?? directDestination ?? requestedDestination ?? defaultBookingPath);
      return;
    }

    window.location.replace(createBookingUrl(defaultBookingPath, currentUrl, stateParams));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <p className="text-sm font-semibold text-slate-600">{message}</p>
    </main>
  );
}

function buildBookingDestination(path: string | null, currentUrl: URL, stateParams: URLSearchParams) {
  if (!path?.startsWith("/")) {
    return null;
  }

  if (path === "/" || path.startsWith("/liff")) {
    return null;
  }

  if (!bookingPaths.some((bookingPath) => path === bookingPath || path.startsWith(`${bookingPath}?`))) {
    return null;
  }

  return createBookingUrl(path, currentUrl, stateParams);
}

function createBookingUrl(path: string, currentUrl: URL, stateParams: URLSearchParams) {
  const destination = new URL(path, window.location.origin);

  for (const key of passThroughKeys) {
    const value = currentUrl.searchParams.get(key) ?? stateParams.get(key);

    if (value) {
      destination.searchParams.set(key, value);
    }
  }

  return destination.toString();
}

function getDirectLiffPath(pathname: string, search: string) {
  const prefix = "/liff";

  if (pathname === prefix || !pathname.startsWith(`${prefix}/`)) {
    return null;
  }

  return `${pathname.slice(prefix.length)}${search}`;
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

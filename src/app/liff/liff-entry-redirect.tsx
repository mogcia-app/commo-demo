"use client";

import { useEffect, useState } from "react";
import { CalendarReservationSite } from "@/components/booking/calendar-reservation-site";
import { GolfStartReservationSite } from "@/components/booking/golf-start-reservation-site";
import { HotelSearchReservationSite } from "@/components/booking/hotel-search-reservation-site";
import { bookingSites, type BookingSiteSlug } from "@/lib/booking-sites";

const defaultBookingPath = "/hotel-search";
const bookingPaths = ["/calendar", "/hotel-search", "/golf-start"];
const liffPathPrefix = "/liff";

export function LiffEntryRedirect() {
  const [siteSlug, setSiteSlug] = useState<BookingSiteSlug>("hotel-search");

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const statePath = currentUrl.searchParams.get("liff.state");
    const directPath = getDirectLiffPath(currentUrl.pathname, currentUrl.search);
    const stateParams = getStateParams(statePath);
    const requestedPath = currentUrl.searchParams.get("path") ?? stateParams.get("path");
    const bookingPath = getBookingPath(statePath) ?? getBookingPath(directPath) ?? getBookingPath(requestedPath) ?? defaultBookingPath;

    setSiteSlug(getSiteSlug(bookingPath));
  }, []);

  return renderBookingSite(siteSlug);
}

function getBookingPath(path: string | null) {
  if (!path?.startsWith("/")) {
    return null;
  }

  if (path === "/" || path.startsWith("/liff")) {
    return null;
  }

  const pathname = path.split("?")[0];

  if (!bookingPaths.includes(pathname)) {
    return null;
  }

  return pathname;
}

function getDirectLiffPath(pathname: string, search: string) {
  if (pathname === liffPathPrefix || !pathname.startsWith(`${liffPathPrefix}/`)) {
    return null;
  }

  return `${pathname.slice(liffPathPrefix.length)}${search}`;
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

function getSiteSlug(path: string): BookingSiteSlug {
  const slug = path.slice(1) as BookingSiteSlug;

  if (slug === "calendar" || slug === "hotel-search" || slug === "golf-start") {
    return slug;
  }

  return "hotel-search";
}

function renderBookingSite(siteSlug: BookingSiteSlug) {
  if (siteSlug === "calendar") {
    return <CalendarReservationSite site={bookingSites.calendar} />;
  }

  if (siteSlug === "golf-start") {
    return <GolfStartReservationSite site={bookingSites["golf-start"]} />;
  }

  return <HotelSearchReservationSite site={bookingSites["hotel-search"]} />;
}

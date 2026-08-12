"use client";

import { useEffect, useState } from "react";
import { CalendarReservationSite } from "@/components/booking/calendar-reservation-site";
import { HotelSearchReservationSite } from "@/components/booking/hotel-search-reservation-site";
import { SurveyForm } from "@/app/demo/survey-form";
import { bookingSites, type BookingSiteSlug } from "@/lib/booking-sites";

const defaultBookingPath = "/hotel-search";
const liffContentPaths = ["/calendar", "/hotel-search", "/demo"];
const liffPathPrefix = "/liff";

export function LiffEntryRedirect() {
  const [contentPath, setContentPath] = useState(defaultBookingPath);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const statePath = currentUrl.searchParams.get("liff.state");
    const directPath = getDirectLiffPath(currentUrl.pathname, currentUrl.search);
    const stateParams = getStateParams(statePath);
    const requestedPath = currentUrl.searchParams.get("path") ?? stateParams.get("path");
    const nextContentPath = getLiffContentPath(statePath) ?? getLiffContentPath(directPath) ?? getLiffContentPath(requestedPath) ?? defaultBookingPath;

    setContentPath(nextContentPath);
  }, []);

  return renderLiffContent(contentPath);
}

function getLiffContentPath(path: string | null) {
  if (!path?.startsWith("/")) {
    return null;
  }

  if (path === "/" || path.startsWith("/liff")) {
    return null;
  }

  const pathname = path.split("?")[0];

  if (!liffContentPaths.includes(pathname)) {
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

  if (slug === "calendar" || slug === "hotel-search") {
    return slug;
  }

  return "hotel-search";
}

function renderLiffContent(path: string) {
  if (path === "/demo") {
    return (
      <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-commo-ink sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <SurveyForm />
        </div>
      </main>
    );
  }

  const siteSlug = getSiteSlug(path);

  if (siteSlug === "calendar") {
    return <CalendarReservationSite site={bookingSites.calendar} />;
  }

  return <HotelSearchReservationSite site={bookingSites["hotel-search"]} />;
}

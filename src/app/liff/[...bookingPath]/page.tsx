import { Suspense } from "react";
import { CalendarReservationSite } from "@/components/booking/calendar-reservation-site";
import { GolfStartReservationSite } from "@/components/booking/golf-start-reservation-site";
import { HotelSearchReservationSite } from "@/components/booking/hotel-search-reservation-site";
import { bookingSites, type BookingSiteSlug } from "@/lib/booking-sites";

const liffBookingSites = new Set<BookingSiteSlug>(["calendar", "hotel-search", "golf-start"]);

export default async function LiffBookingPathPage({ params }: { params: Promise<{ bookingPath?: string[] }> }) {
  const { bookingPath } = await params;
  const siteSlug = getSiteSlug(bookingPath);

  return <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>{renderBookingSite(siteSlug)}</Suspense>;
}

function getSiteSlug(bookingPath?: string[]): BookingSiteSlug {
  const requestedSlug = bookingPath?.[0] as BookingSiteSlug | undefined;

  return requestedSlug && liffBookingSites.has(requestedSlug) ? requestedSlug : "hotel-search";
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

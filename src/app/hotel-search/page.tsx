import { Suspense } from "react";
import { HotelSearchReservationSite } from "@/components/booking/hotel-search-reservation-site";
import { bookingSites } from "@/lib/booking-sites";

export default function HotelSearchPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <HotelSearchReservationSite site={bookingSites["hotel-search"]} />
    </Suspense>
  );
}

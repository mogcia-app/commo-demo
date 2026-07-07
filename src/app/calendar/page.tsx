import { Suspense } from "react";
import { CalendarReservationSite } from "@/components/booking/calendar-reservation-site";
import { bookingSites } from "@/lib/booking-sites";

export default function CalendarPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <CalendarReservationSite site={bookingSites.calendar} />
    </Suspense>
  );
}

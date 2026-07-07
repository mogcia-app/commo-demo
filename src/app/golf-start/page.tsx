import { Suspense } from "react";
import { GolfStartReservationSite } from "@/components/booking/golf-start-reservation-site";
import { bookingSites } from "@/lib/booking-sites";

export default function GolfStartPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <GolfStartReservationSite site={bookingSites["golf-start"]} />
    </Suspense>
  );
}

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BookingReservationSite } from "@/components/demo/demo-reservation-site";
import { bookingSites, getBookingSiteBySlug } from "@/lib/booking-sites";

export function generateStaticParams() {
  return bookingSites.map((site) => ({ bookingSlug: site.slug }));
}

export default async function BookingReservationPage({
  params,
}: {
  params: Promise<{ bookingSlug: string }>;
}) {
  const { bookingSlug } = await params;
  const site = getBookingSiteBySlug(bookingSlug);

  if (!site) {
    notFound();
  }

  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <BookingReservationSite site={site} />
    </Suspense>
  );
}

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DemoReservationSite } from "@/components/demo/demo-reservation-site";
import { demoSites, getDemoSiteBySlug } from "@/lib/demo-sites";

export function generateStaticParams() {
  return demoSites.map((site) => ({ demoSiteSlug: site.slug }));
}

export default async function DemoReservationPage({
  params,
}: {
  params: Promise<{ demoSiteSlug: string }>;
}) {
  const { demoSiteSlug } = await params;
  const site = getDemoSiteBySlug(demoSiteSlug);

  if (!site) {
    notFound();
  }

  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <DemoReservationSite site={site} />
    </Suspense>
  );
}

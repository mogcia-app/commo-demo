import { redirect } from "next/navigation";
import { getBookingSiteBySlug } from "@/lib/booking-sites";

const defaultBookingSlug = "hotel-search";
const templateKeys = ["template", "templateType", "pattern"];

type BookingPageSearchParams = Record<string, string | string[] | undefined>;

export default async function BookingPage({
  searchParams,
}: {
  searchParams?: Promise<BookingPageSearchParams>;
}) {
  const currentParams = await searchParams;
  const statePath = getFirstValue(currentParams?.["liff.state"]);
  const stateDestination = getStateDestination(statePath);

  if (stateDestination) {
    redirect(stateDestination);
  }

  const stateParams = getStateParams(statePath);
  const requestedSlug =
    getFirstParam(currentParams, templateKeys) ?? getFirstParamFromUrlSearchParams(stateParams, templateKeys) ?? defaultBookingSlug;
  const site = getBookingSiteBySlug(requestedSlug) ?? getBookingSiteBySlug(defaultBookingSlug);

  redirect(`/booking/${site?.slug ?? defaultBookingSlug}`);
}

function getFirstParam(searchParams: BookingPageSearchParams | undefined, keys: string[]) {
  for (const key of keys) {
    const value = getFirstValue(searchParams?.[key])?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function getFirstParamFromUrlSearchParams(searchParams: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key)?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getStateDestination(statePath: string | undefined) {
  if (!statePath?.startsWith("/booking/")) {
    return null;
  }

  return statePath.split("?")[0];
}

function getStateParams(statePath: string | undefined) {
  if (!statePath) {
    return new URLSearchParams();
  }

  const queryIndex = statePath.indexOf("?");

  if (queryIndex === -1) {
    return new URLSearchParams(statePath.startsWith("/") ? "" : statePath);
  }

  return new URLSearchParams(statePath.slice(queryIndex + 1));
}

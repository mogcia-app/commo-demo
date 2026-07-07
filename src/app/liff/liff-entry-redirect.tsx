"use client";

import { useEffect, useState } from "react";
import { getDefaultDemoSite, getDemoSiteBySlug } from "@/lib/demo-sites";

const defaultStoreSlug = "company-a";
const siteKeys = ["site", "demoSite", "demoSiteSlug", "template", "templateType", "pattern"];
const storeSlugKeys = ["storeSlug", "slug", "store"];
const passThroughKeys = ["storeSlug", "campaignId", "couponId"];

export function LiffEntryRedirect() {
  const [message] = useState("LINEから予約デモへ移動しています");

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const statePath = currentUrl.searchParams.get("liff.state");
    const stateParams = getStateParams(statePath);
    const stateDestination = getStateDestination(statePath);

    if (stateDestination) {
      window.location.replace(stateDestination);
      return;
    }

    const site = getDemoSite(currentUrl.searchParams, stateParams);
    const storeSlug = getFirstParam(currentUrl.searchParams, storeSlugKeys) ?? getFirstParam(stateParams, storeSlugKeys) ?? defaultStoreSlug;
    const destination = new URL(`/demo/${site.slug}`, window.location.origin);

    destination.searchParams.set("storeSlug", storeSlug);
    destination.searchParams.set("saveMode", "live");

    for (const key of passThroughKeys) {
      const value = currentUrl.searchParams.get(key) ?? stateParams.get(key);

      if (value) {
        destination.searchParams.set(key, value);
      }
    }

    window.location.replace(destination.toString());
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <p className="text-sm font-semibold text-slate-600">{message}</p>
    </main>
  );
}

function getDemoSite(currentParams: URLSearchParams, stateParams: URLSearchParams) {
  const value = getFirstParam(currentParams, siteKeys) ?? getFirstParam(stateParams, siteKeys);

  return value ? getDemoSiteBySlug(value) ?? getDefaultDemoSite() : getDefaultDemoSite();
}

function getFirstParam(searchParams: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key)?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function getStateDestination(statePath: string | null) {
  if (!statePath?.startsWith("/")) {
    return null;
  }

  if (statePath === "/" || statePath.startsWith("/liff")) {
    return null;
  }

  if (statePath.startsWith("/demo/")) {
    const destination = new URL(statePath, window.location.origin);

    if (!destination.searchParams.get("storeSlug")) {
      destination.searchParams.set("storeSlug", defaultStoreSlug);
    }

    destination.searchParams.set("saveMode", "live");

    return destination.toString();
  }

  return null;
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

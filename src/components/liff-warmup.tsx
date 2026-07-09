"use client";

import { useLineProfile } from "@/hooks/use-line-profile";

export function LiffWarmup() {
  useLineProfile({ loginRedirectPath: "/liff/hotel-search" });

  return null;
}

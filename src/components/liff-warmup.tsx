"use client";

import { useLineProfile } from "@/hooks/use-line-profile";

export function LiffWarmup() {
  useLineProfile({ loginRedirectPath: "/hotel-search" });

  return null;
}

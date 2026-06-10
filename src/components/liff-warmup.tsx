"use client";

import { useLineProfile } from "@/hooks/use-line-profile";

export function LiffWarmup() {
  useLineProfile({ loginRedirectPath: "/demo" });

  return null;
}

import { Suspense } from "react";
import { LiffEntryRedirect } from "./liff-entry-redirect";

export default function LiffEntryPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <LiffEntryRedirect />
    </Suspense>
  );
}

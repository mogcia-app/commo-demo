import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb, requireAdminUser } from "@/lib/firebase/admin";
import type { IndustryType, OrganizationLineSettings } from "@/lib/types";

const defaultLineSettings: OrganizationLineSettings = {
  industryType: "hotel",
  enabledModules: {
    surveys: true,
    segments: true,
    broadcasts: true,
    stepMessages: true,
    analytics: true,
    aiSuggestions: true,
  },
};

const industryTypes = new Set<IndustryType>(["hotel", "restaurant", "beauty_salon", "other"]);

export async function GET(request: Request) {
  await requireAdminUser(request);

  const doc = await getOrganizationRef().get();
  const data = doc.exists ? doc.data() : null;

  return NextResponse.json({ lineSettings: normalizeLineSettings(data?.lineSettings) });
}

export async function PUT(request: Request) {
  await requireAdminUser(request);

  const body = (await request.json().catch(() => ({}))) as { lineSettings?: Partial<OrganizationLineSettings> };
  const lineSettings = normalizeLineSettings(body.lineSettings);

  await getOrganizationRef().set(
    {
      lineSettings,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return NextResponse.json({ lineSettings });
}

function getOrganizationRef() {
  return getAdminDb().collection("organizations").doc("default");
}

function normalizeLineSettings(input: unknown): OrganizationLineSettings {
  const source = typeof input === "object" && input !== null ? (input as Partial<OrganizationLineSettings>) : {};
  const enabledModules =
    typeof source.enabledModules === "object" && source.enabledModules !== null
      ? (source.enabledModules as Partial<OrganizationLineSettings["enabledModules"]>)
      : {};
  const industryType = typeof source.industryType === "string" && industryTypes.has(source.industryType as IndustryType) ? source.industryType : defaultLineSettings.industryType;

  return {
    industryType,
    enabledModules: {
      surveys: enabledModules.surveys ?? defaultLineSettings.enabledModules.surveys,
      segments: enabledModules.segments ?? defaultLineSettings.enabledModules.segments,
      broadcasts: enabledModules.broadcasts ?? defaultLineSettings.enabledModules.broadcasts,
      stepMessages: enabledModules.stepMessages ?? defaultLineSettings.enabledModules.stepMessages,
      analytics: enabledModules.analytics ?? defaultLineSettings.enabledModules.analytics,
      aiSuggestions: enabledModules.aiSuggestions ?? defaultLineSettings.enabledModules.aiSuggestions,
    },
  };
}

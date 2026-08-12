import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

type SurveyOpenRequest = {
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  source?: "liff" | "line" | "web";
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SurveyOpenRequest;
  const lineUserId = body.lineUserId?.trim() ?? "";

  if (!lineUserId) {
    return NextResponse.json({ tracked: false });
  }

  const now = FieldValue.serverTimestamp();
  const db = getAdminDb();
  const lineUserRef = db.collection("lineUsers").doc(toSafeDocId(lineUserId));
  const eventRef = db.collection("analyticsEvents").doc();

  await Promise.all([
    lineUserRef.set(
      {
        lineUserId,
        displayName: body.lineDisplayName?.trim() ?? "",
        pictureUrl: body.linePictureUrl?.trim() ?? "",
        surveyOpenedAt: now,
        latestSurveyStatus: "opened",
        lastActionAt: now,
        lastActionLabel: "アンケートページを開封",
        reactionCount: FieldValue.increment(1),
        updatedAt: now,
      },
      { merge: true },
    ),
    eventRef.set({
      eventType: "survey_open",
      source: body.source ?? "liff",
      lineUserId,
      customerId: `line_${toSafeDocId(lineUserId)}`,
      metadata: {},
      createdAt: now,
    }),
  ]);

  return NextResponse.json({ tracked: true });
}

function toSafeDocId(value: string) {
  return value.replaceAll("/", "_");
}

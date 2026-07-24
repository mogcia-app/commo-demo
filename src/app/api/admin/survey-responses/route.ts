import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb, requireAdminUser } from "@/lib/firebase/admin";

type SurveyAnswers = {
  purpose?: string;
  area?: string;
  interests?: string[];
  usageCount?: string;
  weekdayNeeds?: string;
  comment?: string;
};

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);

    const snapshot = await getAdminDb().collection("surveyResponses").orderBy("createdAt", "desc").limit(500).get();
    const responses = snapshot.docs.map((doc) => normalizeSurveyResponse(doc.id, doc.data()));
    const lineUserIds = [...new Set(responses.map((response) => response.lineUserId).filter(Boolean))];

    return NextResponse.json({
      responses,
      segments: buildSegments(responses),
      recipientCount: lineUserIds.length,
    });
  } catch (cause) {
    console.error(cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "アンケート回答の取得に失敗しました。" },
      { status: 500 },
    );
  }
}

function normalizeSurveyResponse(id: string, data: FirebaseFirestore.DocumentData) {
  const answers = isRecord(data.answers) ? (data.answers as SurveyAnswers) : {};

  return {
    id,
    lineUserId: getString(data.lineUserId),
    lineDisplayName: getString(data.lineDisplayName),
    name: getString(data.name),
    answers: {
      purpose: getString(answers.purpose),
      area: getString(answers.area),
      interests: Array.isArray(answers.interests) ? answers.interests.filter((item): item is string => typeof item === "string") : [],
      usageCount: getString(answers.usageCount),
      weekdayNeeds: getString(answers.weekdayNeeds),
      comment: getString(answers.comment),
    },
    createdAt: toIsoString(data.createdAt),
  };
}

function buildSegments(responses: ReturnType<typeof normalizeSurveyResponse>[]) {
  const uniqueByUser = new Map<string, ReturnType<typeof normalizeSurveyResponse>>();

  responses.forEach((response) => {
    if (response.lineUserId && !uniqueByUser.has(response.lineUserId)) {
      uniqueByUser.set(response.lineUserId, response);
    }
  });

  const latestResponses = [...uniqueByUser.values()];

  return {
    purposes: countBy(latestResponses.map((response) => response.answers.purpose)),
    areas: countBy(latestResponses.map((response) => response.answers.area)),
    interests: countBy(latestResponses.flatMap((response) => response.answers.interests)),
    usageCounts: countBy(latestResponses.map((response) => response.answers.usageCount)),
    weekdayNeeds: countBy(latestResponses.map((response) => response.answers.weekdayNeeds)),
  };
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();

  values.filter(Boolean).forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toIsoString(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === "string" ? value : "";
}

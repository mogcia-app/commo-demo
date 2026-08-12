import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb, requireAdminUser } from "@/lib/firebase/admin";
import { getRegionByPrefecture } from "@/lib/survey-taxonomy";

type SurveyAnswers = {
  ageGroup?: string;
  purpose?: string;
  area?: string;
  prefecture?: string;
  region?: string;
  interests?: string[];
  usageCount?: string;
  weekdayNeeds?: string;
  comment?: string;
};

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);

    const db = getAdminDb();
    const [surveySnapshot, lineUsersSnapshot, broadcastSnapshot] = await Promise.all([
      db.collection("surveyResponses").orderBy("createdAt", "desc").limit(500).get(),
      db.collection("lineUsers").limit(1000).get().catch(() => null),
      db.collection("surveyBroadcasts").orderBy("createdAt", "desc").limit(20).get().catch(() => null),
    ]);
    const lineUsers = lineUsersSnapshot?.docs.map((doc) => normalizeLineUser(doc.id, doc.data())) ?? [];
    const latestBroadcast = broadcastSnapshot?.docs[0];
    const latestBroadcastData = latestBroadcast?.data();
    const latestBroadcastRecipients = Array.isArray(latestBroadcastData?.recipientLineUserIds)
      ? latestBroadcastData.recipientLineUserIds.filter((item): item is string => typeof item === "string")
      : [];
    const responses = surveySnapshot.docs.map((doc) => normalizeSurveyResponse(doc.id, doc.data()));
    const lineUserIds = [...new Set(responses.map((response) => response.lineUserId).filter(Boolean))];

    return NextResponse.json({
      responses,
      lineUsers,
      segments: buildSegments(responses),
      recipientCount: lineUserIds.length,
      delivery: buildDeliveryStatus(lineUsers, latestBroadcastRecipients, latestBroadcast?.id ?? ""),
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
  const prefecture = getString(answers.prefecture) || getString(answers.area);
  const region = getString(answers.region) || getRegionByPrefecture(prefecture);

  return {
    id,
    lineUserId: getString(data.lineUserId),
    lineDisplayName: getString(data.lineDisplayName),
    name: getString(data.name),
    answers: {
      ageGroup: getString(answers.ageGroup),
      purpose: getString(answers.purpose),
      prefecture,
      area: prefecture,
      region,
      interests: Array.isArray(answers.interests) ? answers.interests.filter((item): item is string => typeof item === "string") : [],
      usageCount: getString(answers.usageCount),
      weekdayNeeds: getString(answers.weekdayNeeds),
      comment: getString(answers.comment),
    },
    createdAt: toIsoString(data.createdAt),
  };
}

function normalizeLineUser(id: string, data: FirebaseFirestore.DocumentData) {
  const answers = isRecord(data.surveyAnswers) ? (data.surveyAnswers as SurveyAnswers) : {};
  const prefecture = getString(answers.prefecture) || getString(answers.area);
  const region = getString(answers.region) || getRegionByPrefecture(prefecture);

  return {
    id,
    lineUserId: getString(data.lineUserId) || id,
    displayName: getString(data.displayName) || getString(data.lineDisplayName) || id,
    pictureUrl: getString(data.pictureUrl),
    friendAddedAt: toIsoString(data.followedAt) || toIsoString(data.linkedAt) || toIsoString(data.createdAt),
    surveyOpenedAt: toIsoString(data.surveyOpenedAt),
    surveyAnsweredAt: toIsoString(data.surveyAnsweredAt),
    lastMessageAt: toIsoString(data.lastMessageAt),
    latestSurveyBroadcastId: getString(data.latestSurveyBroadcastId),
    surveyStatus: getSurveyStatus(data),
    answers: {
      ageGroup: getString(answers.ageGroup),
      purpose: getString(answers.purpose),
      prefecture,
      area: prefecture,
      region,
      interests: Array.isArray(answers.interests) ? answers.interests.filter((item): item is string => typeof item === "string") : [],
      usageCount: getString(answers.usageCount),
      weekdayNeeds: getString(answers.weekdayNeeds),
      comment: getString(answers.comment),
    },
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
    ageGroups: countBy(latestResponses.map((response) => response.answers.ageGroup)),
    purposes: countBy(latestResponses.map((response) => response.answers.purpose)),
    prefectures: countBy(latestResponses.map((response) => response.answers.prefecture)),
    areas: countBy(latestResponses.map((response) => response.answers.prefecture)),
    regions: countBy(latestResponses.map((response) => response.answers.region)),
    interests: countBy(latestResponses.flatMap((response) => response.answers.interests)),
    usageCounts: countBy(latestResponses.map((response) => response.answers.usageCount)),
    weekdayNeeds: countBy(latestResponses.map((response) => response.answers.weekdayNeeds)),
  };
}

function buildDeliveryStatus(lineUsers: ReturnType<typeof normalizeLineUser>[], recipientLineUserIds: string[], latestBroadcastId: string) {
  const recipients = recipientLineUserIds.length
    ? lineUsers.filter((user) => recipientLineUserIds.includes(user.lineUserId))
    : lineUsers.filter((user) => user.lastMessageAt || user.latestSurveyBroadcastId);

  return {
    latestBroadcastId,
    targetCount: recipients.length,
    unopenedCount: recipients.filter((user) => user.surveyStatus === "配信済み・未開封").length,
    openedNotAnsweredCount: recipients.filter((user) => user.surveyStatus === "開封済み・未回答").length,
    answeredCount: recipients.filter((user) => user.surveyStatus === "回答済み").length,
  };
}

function getSurveyStatus(data: FirebaseFirestore.DocumentData) {
  if (data.surveyAnsweredAt || data.surveyAnswers) {
    return "回答済み";
  }

  if (data.surveyOpenedAt) {
    return "開封済み・未回答";
  }

  if (data.lastMessageAt || data.latestSurveyBroadcastId) {
    return "配信済み・未開封";
  }

  return "未配信";
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

import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb, requireAdminUser } from "@/lib/firebase/admin";
import { getIndustryLineTemplate } from "@/config/line-industry-templates";
import type { IndustryType } from "@/lib/types";

type LineBotInfo = {
  userId?: string;
  basicId?: string;
  displayName?: string;
  pictureUrl?: string;
  chatMode?: string;
  markAsReadMode?: string;
};

type LineProfile = {
  userId: string;
  displayName?: string;
  pictureUrl?: string;
  statusMessage?: string;
};

const industryTypes = new Set<IndustryType>(["hotel", "restaurant", "beauty_salon", "other"]);

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);

    const url = new URL(request.url);
    const requestedIndustry = url.searchParams.get("industryType");
    const industryType: IndustryType = requestedIndustry && industryTypes.has(requestedIndustry as IndustryType) ? (requestedIndustry as IndustryType) : "hotel";
    const template = getIndustryLineTemplate(industryType);
    const db = getAdminDb();

    const [botInfoResult, followerIdsResult, lineUsersSnapshot, eventsSnapshot, reservationsSnapshot] = await Promise.all([
      getLineBotInfo(),
      getLineFollowerIds(),
      db.collection("lineUsers").limit(500).get(),
      db.collection("analyticsEvents").orderBy("createdAt", "desc").limit(500).get().catch(() => null),
      db.collection("reservations").orderBy("createdAt", "desc").limit(200).get().catch(() => null),
    ]);

    const followerIds = followerIdsResult.ok ? followerIdsResult.userIds : [];
    const followerProfiles = followerIds.length ? await getLineProfiles(followerIds.slice(0, 30)) : [];
    const lineUsers = lineUsersSnapshot.docs.map((doc) => normalizeLineUser(doc.id, doc.data()));
    const events = eventsSnapshot?.docs.map((doc) => normalizeEvent(doc.id, doc.data())) ?? [];
    const reservations = reservationsSnapshot?.docs.map((doc) => normalizeReservation(doc.id, doc.data())) ?? [];
    const mergedUsers = mergeUsers({ lineUsers, followerIds, followerProfiles, templateTags: template.tags.map((tag) => tag.name), industryType });
    const monthLabels = getRecentMonthLabels(4);
    const monthlySeries = monthLabels.map((month) => {
      const added = mergedUsers.filter((user) => formatMonth(user.addedAt) === month.value).length;
      const blocks = mergedUsers.filter((user) => user.status === "ブロック済み" && formatMonth(user.lastActionAt) === month.value).length;
      const clicks = events.filter((event) => formatMonth(event.createdAt) === month.value && isClickEvent(event.eventType)).length;
      const sent = reservations.filter((reservation) => formatMonth(reservation.completedSentAt) === month.value).length;

      return {
        label: month.label,
        friends: added,
        blocks,
        sent,
        opens: events.filter((event) => formatMonth(event.createdAt) === month.value).length,
        clicks,
      };
    });
    const linkClickCount = events.filter((event) => isClickEvent(event.eventType)).length;
    const surveyAnsweredCount = mergedUsers.filter((user) => user.survey === "回答済み").length;
    const inactive90Count = mergedUsers.filter((user) => daysSince(user.lastActionAt) >= 90).length;
    const friendTotal = followerIds.length || mergedUsers.length;
    const blockedCount = mergedUsers.filter((user) => user.status === "ブロック済み").length;
    const thisMonth = formatMonth(new Date().toISOString());
    const thisMonthAdds = mergedUsers.filter((user) => formatMonth(user.addedAt) === thisMonth).length;

    return NextResponse.json({
      botInfo: botInfoResult.ok ? botInfoResult.botInfo : null,
      dataStatus: {
        lineApiConnected: botInfoResult.ok,
        followerIdsAvailable: followerIdsResult.ok,
        followerIdError: followerIdsResult.ok ? "" : followerIdsResult.error,
        firestoreUsers: lineUsers.length,
        firestoreEvents: events.length,
      },
      kpis: {
        friendTotal,
        thisMonthAdds,
        thisMonthBlocks: Math.max(blockedCount, monthlySeries.at(-1)?.blocks ?? 0),
        surveyResponseRate: friendTotal ? Math.round((surveyAnsweredCount / friendTotal) * 1000) / 10 : 0,
        broadcastClickRate: events.length ? Math.round((linkClickCount / events.length) * 1000) / 10 : 0,
        inactive90Count,
      },
      users: mergedUsers.slice(0, 100),
      monthlySeries,
      segmentCounts: template.dashboardLabels.assistMetrics.map((label, index) => ({
        label,
        value: countUsersForLabel(mergedUsers, label) || Math.max(0, Math.round(mergedUsers.length * ([0.32, 0.24, 0.18, 0.12][index] ?? 0.1))),
      })),
      richMenuClicks: template.dashboardLabels.richMenuExamples.map((label) => ({
        label,
        value: countEventsByText(events, label),
      })),
      surveyAnswers: (template.surveys[0]?.questions[1]?.options ?? []).slice(0, 6).map((label) => ({
        label,
        value: countUsersForLabel(mergedUsers, label),
      })),
      actionItems: buildActionItems({ mergedUsers, events, templateLabels: template.dashboardLabels.assistMetrics }),
    });
  } catch (cause) {
    console.error(cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "LINE運用データの取得に失敗しました。" },
      { status: 500 },
    );
  }
}

async function getLineBotInfo() {
  const result = await lineGet<LineBotInfo>("https://api.line.me/v2/bot/info");

  if (!result.ok) {
    return result;
  }

  return { ok: true as const, botInfo: result.data };
}

async function getLineFollowerIds() {
  const result = await lineGet<{ userIds?: string[]; next?: string }>("https://api.line.me/v2/bot/followers/ids?limit=300");

  if (!result.ok) {
    return result;
  }

  return { ok: true as const, userIds: result.data.userIds ?? [] };
}

async function getLineProfiles(userIds: string[]) {
  const settled = await Promise.allSettled(userIds.map((userId) => lineGet<LineProfile>(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`)));

  return settled
    .map((result) => (result.status === "fulfilled" && result.value.ok ? result.value.data : null))
    .filter((profile): profile is LineProfile => Boolean(profile));
}

async function lineGet<T>(url: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();

  if (!token) {
    return { ok: false, error: "LINE_CHANNEL_ACCESS_TOKENが未設定です。" };
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, error: `LINE API ${response.status}` };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "LINE APIへ接続できませんでした。" };
  }
}

function normalizeLineUser(id: string, data: FirebaseFirestore.DocumentData) {
  const displayName = getString(data.displayName) || getString(data.lineDisplayName) || id;
  const tags = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [];
  const addedAt = toIsoString(data.followedAt) || toIsoString(data.linkedAt) || toIsoString(data.createdAt) || "";
  const lastActionAt = toIsoString(data.lastActionAt) || toIsoString(data.lastMessageAt) || toIsoString(data.updatedAt) || addedAt;
  const followStatus = getString(data.followStatus) || "following";

  return {
    id,
    lineUserId: getString(data.lineUserId) || id,
    name: displayName,
    pictureUrl: getString(data.pictureUrl),
    addedAt,
    lastActionAt,
    survey: hasSurveyAnswer(data) ? "回答済み" : "未回答",
    tags,
    action: getString(data.lastActionLabel) || "LINE内行動を記録",
    reactions: toNumber(data.reactionCount),
    status: followStatus === "blocked" ? "ブロック済み" : getUserStatus(lastActionAt, tags),
  };
}

function normalizeEvent(id: string, data: FirebaseFirestore.DocumentData) {
  const metadata = isRecord(data.metadata) ? data.metadata : {};

  return {
    id,
    eventType: getString(data.eventType),
    source: getString(data.source),
    lineUserId: getString(data.lineUserId),
    metadata,
    createdAt: toIsoString(data.createdAt) || "",
  };
}

function normalizeReservation(id: string, data: FirebaseFirestore.DocumentData) {
  const notifications = isRecord(data.notifications) ? data.notifications : {};

  return {
    id,
    lineUserId: getString(data.lineUserId),
    completedSentAt: toIsoString(notifications.completedSentAt),
    createdAt: toIsoString(data.createdAt),
  };
}

function mergeUsers(input: { lineUsers: ReturnType<typeof normalizeLineUser>[]; followerIds: string[]; followerProfiles: LineProfile[]; templateTags: string[]; industryType: IndustryType }) {
  const usersById = new Map(input.lineUsers.map((user) => [user.lineUserId, user]));

  input.followerIds.forEach((lineUserId, index) => {
    if (usersById.has(lineUserId)) {
      return;
    }

    const profile = input.followerProfiles.find((item) => item.userId === lineUserId);
    const now = new Date().toISOString();
    const tag = input.templateTags[index % Math.max(input.templateTags.length, 1)] ?? "高反応";

    usersById.set(lineUserId, {
      id: lineUserId,
      lineUserId,
      name: profile?.displayName || `LINEユーザー ${index + 1}`,
      pictureUrl: profile?.pictureUrl || "",
      addedAt: now,
      lastActionAt: now,
      survey: "未回答",
      tags: [tag],
      action: "LINE公式アカウントの友だち",
      reactions: 0,
      status: "反応あり",
    });
  });

  return [...usersById.values()].map((user, index) => ({
    ...user,
    tags: user.tags.length ? user.tags : [input.templateTags[index % input.templateTags.length] ?? "高反応"],
    action: user.action || (input.industryType === "hotel" ? "宿泊プラン情報を表示" : "プラン情報を表示"),
  }));
}

function buildActionItems(input: { mergedUsers: ReturnType<typeof mergeUsers>; events: ReturnType<typeof normalizeEvent>[]; templateLabels: string[] }) {
  const inactive90 = input.mergedUsers.filter((user) => daysSince(user.lastActionAt) >= 90).length;
  const unanswered = input.mergedUsers.filter((user) => user.survey === "未回答").length;
  const clickUsers = new Set(input.events.filter((event) => isClickEvent(event.eventType)).map((event) => event.lineUserId).filter(Boolean)).size;

  return [
    { title: "直近90日間反応なし", count: inactive90, href: "/users" },
    { title: "友だち追加後アンケート未回答", count: unanswered, href: "/users" },
    { title: "リンククリックあり", count: clickUsers, href: "/users" },
    { title: `${input.templateLabels[0] ?? "推奨セグメント"}の確認`, count: countUsersForLabel(input.mergedUsers, input.templateLabels[0] ?? ""), href: "/segments" },
  ];
}

function countUsersForLabel(users: ReturnType<typeof mergeUsers>, label: string) {
  const normalized = label.replace(/関心層|ユーザー|情報|プラン/g, "");

  return users.filter((user) => user.tags.some((tag) => tag.includes(normalized) || normalized.includes(tag.replace(/関心|利用/g, "")))).length;
}

function countEventsByText(events: ReturnType<typeof normalizeEvent>[], label: string) {
  return events.filter((event) => {
    const text = JSON.stringify(event.metadata);
    return text.includes(label) || event.eventType.includes("click");
  }).length;
}

function isClickEvent(eventType: string) {
  return eventType.includes("click") || eventType === "coupon_open" || eventType === "mypage_view";
}

function hasSurveyAnswer(data: FirebaseFirestore.DocumentData) {
  return Boolean(data.surveyAnsweredAt || data.surveyAnswers || data.answers || data.questionnaire);
}

function getUserStatus(lastActionAt: string, tags: string[]) {
  if (tags.includes("高反応")) {
    return "高関心";
  }

  const days = daysSince(lastActionAt);

  if (days >= 90) {
    return "90日間反応なし";
  }

  if (days >= 30) {
    return "反応低下";
  }

  return "反応あり";
}

function daysSince(value: string) {
  if (!value) {
    return 999;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 999;
  }

  return Math.floor((Date.now() - parsed.getTime()) / 86400000);
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

function getRecentMonthLabels(count: number) {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return {
      value: `${date.getFullYear()}-${month}`,
      label: `${date.getMonth() + 1}月`,
    };
  });
}

function formatMonth(value: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 7);
  }

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

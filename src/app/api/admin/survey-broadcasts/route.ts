import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb, requireAdminUser } from "@/lib/firebase/admin";
import { pushLineMessage } from "@/lib/line";

type SurveyBroadcastRequest = {
  message?: string;
  filters?: {
    purpose?: string;
    area?: string;
    interest?: string;
    usageCount?: string;
    weekdayNeeds?: string;
  };
};

export async function POST(request: Request) {
  try {
    await requireAdminUser(request);

    const body = (await request.json().catch(() => ({}))) as SurveyBroadcastRequest;
    const message = body.message?.trim() ?? "";
    const filters = normalizeFilters(body.filters);

    if (!message) {
      return NextResponse.json({ error: "配信メッセージを入力してください。" }, { status: 400 });
    }

    const recipients = await getSurveyRecipients(filters);

    if (!recipients.length) {
      return NextResponse.json({ error: "配信対象のアンケート回答者がいません。" }, { status: 400 });
    }

    const broadcastRef = getAdminDb().collection("surveyBroadcasts").doc();
    const now = FieldValue.serverTimestamp();
    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        pushLineMessage({
          to: recipient.lineUserId,
          text: renderMessage(message, recipient),
        }),
      ),
    );
    const sentCount = results.filter((result) => result.status === "fulfilled").length;
    const failed = results
      .map((result, index) => ({ result, recipient: recipients[index] }))
      .filter((item): item is { result: PromiseRejectedResult; recipient: (typeof recipients)[number] } => item.result.status === "rejected")
      .map((item) => ({
        lineUserId: item.recipient.lineUserId,
        error: item.result.reason instanceof Error ? item.result.reason.message : "LINE配信に失敗しました。",
      }));

    await broadcastRef.set({
      message,
      filters,
      targetCount: recipients.length,
      sentCount,
      failedCount: failed.length,
      failed,
      recipientLineUserIds: recipients.map((recipient) => recipient.lineUserId),
      createdAt: now,
      updatedAt: now,
    });

    await Promise.all(
      recipients.map((recipient) =>
        getAdminDb().collection("lineUsers").doc(toSafeDocId(recipient.lineUserId)).set(
          {
            lastMessageAt: now,
            lastActionLabel: "アンケート回答者向け配信",
            updatedAt: now,
          },
          { merge: true },
        ),
      ),
    );

    return NextResponse.json({
      broadcast: {
        id: broadcastRef.id,
        targetCount: recipients.length,
        sentCount,
        failedCount: failed.length,
      },
    });
  } catch (cause) {
    console.error(cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "アンケート回答者向け配信に失敗しました。" },
      { status: 500 },
    );
  }
}

async function getSurveyRecipients(filters: Required<SurveyBroadcastRequest>["filters"]) {
  const snapshot = await getAdminDb().collection("surveyResponses").orderBy("createdAt", "desc").limit(1000).get();
  const recipients = new Map<string, { lineUserId: string; name: string; lineDisplayName: string; answers: Record<string, unknown> }>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const lineUserId = typeof data.lineUserId === "string" ? data.lineUserId.trim() : "";
    const answers = isRecord(data.answers) ? data.answers : {};

    if (!lineUserId || recipients.has(lineUserId) || !matchesFilters(answers, filters)) {
      return;
    }

    recipients.set(lineUserId, {
      lineUserId,
      name: typeof data.name === "string" ? data.name : "",
      lineDisplayName: typeof data.lineDisplayName === "string" ? data.lineDisplayName : "",
      answers,
    });
  });

  return [...recipients.values()];
}

function matchesFilters(answers: Record<string, unknown>, filters: Required<SurveyBroadcastRequest>["filters"]) {
  if (filters.purpose && answers.purpose !== filters.purpose) {
    return false;
  }

  if (filters.area && answers.area !== filters.area) {
    return false;
  }

  if (filters.usageCount && answers.usageCount !== filters.usageCount) {
    return false;
  }

  if (filters.weekdayNeeds && answers.weekdayNeeds !== filters.weekdayNeeds) {
    return false;
  }

  if (filters.interest) {
    const interests = Array.isArray(answers.interests) ? answers.interests : [];
    return interests.includes(filters.interest);
  }

  return true;
}

function normalizeFilters(filters: SurveyBroadcastRequest["filters"]) {
  return {
    purpose: filters?.purpose?.trim() ?? "",
    area: filters?.area?.trim() ?? "",
    interest: filters?.interest?.trim() ?? "",
    usageCount: filters?.usageCount?.trim() ?? "",
    weekdayNeeds: filters?.weekdayNeeds?.trim() ?? "",
  };
}

function renderMessage(template: string, recipient: { name: string; lineDisplayName: string }) {
  const name = recipient.name || recipient.lineDisplayName || "お客様";

  return template.replace(/\{name\}/g, name);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toSafeDocId(value: string) {
  return value.trim().replace(/\//g, "_");
}

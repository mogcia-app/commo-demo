import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const events: unknown[] = isRecord(body) && Array.isArray(body.events) ? body.events : [];

  if (events.length) {
    const db = getAdminDb();
    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    events.forEach((event, index) => {
      if (!isRecord(event)) {
        return;
      }

      const source = isRecord(event.source) ? event.source : {};
      const lineUserId = typeof source.userId === "string" ? source.userId : "";
      const eventType = typeof event.type === "string" ? event.type : "unknown";
      const eventRef = db.collection("lineWebhookEvents").doc();

      batch.set(eventRef, {
        eventType,
        lineUserId,
        rawEvent: event,
        receivedAt: now,
        sortIndex: index,
      });

      if (!lineUserId) {
        return;
      }

      const lineUserRef = db.collection("lineUsers").doc(toSafeDocId(lineUserId));
      const lineUserUpdate: Record<string, unknown> = {
        lineUserId,
        updatedAt: now,
        lastActionAt: now,
        lastActionLabel: getActionLabel(event),
        reactionCount: FieldValue.increment(eventType === "unfollow" ? 0 : 1),
      };

      if (eventType === "follow") {
        lineUserUpdate.followStatus = "following";
        lineUserUpdate.followedAt = now;
      }

      if (eventType === "unfollow") {
        lineUserUpdate.followStatus = "blocked";
        lineUserUpdate.blockedAt = now;
      }

      batch.set(lineUserRef, lineUserUpdate, { merge: true });
    });

    await batch.commit();
  }

  return NextResponse.json({
    received: true,
    mode: "stored",
    events: events.length,
  });
}

function getActionLabel(event: Record<string, unknown>) {
  const eventType = typeof event.type === "string" ? event.type : "unknown";

  if (eventType === "follow") {
    return "友だち追加";
  }

  if (eventType === "unfollow") {
    return "ブロックまたは友だち解除";
  }

  if (eventType === "message") {
    return "メッセージ送信";
  }

  if (eventType === "postback") {
    return "リッチメニューまたはボタンを選択";
  }

  return `LINEイベント: ${eventType}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toSafeDocId(value: string) {
  return value.trim().replace(/\//g, "_");
}

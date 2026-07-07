import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb, requireAdminUser } from "@/lib/firebase/admin";

function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, serialize(child)]));
  }

  return value;
}

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);
    const db = getAdminDb();
    const snapshot = await db.collection("reservations").get();

    const reservations = snapshot.docs
      .map((doc): Record<string, unknown> & { id: string } => normalizeReservation(doc.id, serialize(doc.data()) as Record<string, unknown>))
      .sort((a, b) => {
        const left = `${String(a["date"])} ${String(a["time"])}`;
        const right = `${String(b["date"])} ${String(b["time"])}`;
        return right.localeCompare(left);
      })
      .slice(0, 100);

    return NextResponse.json({ reservations });
  } catch (cause) {
    console.error(cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "予約一覧の取得に失敗しました。" },
      { status: 500 },
    );
  }
}

function normalizeReservation(id: string, data: Record<string, unknown>): Record<string, unknown> & { id: string } {
  const menuSnapshot = isRecord(data["menuSnapshot"]) ? data["menuSnapshot"] : {};
  const customerSnapshot = isRecord(data["customerSnapshot"]) ? data["customerSnapshot"] : {};
  const answers = isRecord(data["answers"]) ? data["answers"] : isRecord(data["reservationDetails"]) ? data["reservationDetails"] : {};

  return {
    id,
    ...data,
    industryType: getString(data["industryType"]),
    industryLabel: getString(data["industryLabel"]),
    templateType: getString(data["templateType"]) || null,
    templateLabel: getString(data["templateLabel"]) || null,
    menuName:
      getString(data["menuName"]) ||
      getString(data["menu"]) ||
      getString(menuSnapshot["name"]) ||
      getString(answers["selectedPlan"]) ||
      getString(answers["selectedMenu"]) ||
      "予約メニュー",
    date: getString(data["date"]),
    time: getString(data["time"]),
    name: getString(data["name"]) || getString(customerSnapshot["name"]),
    phone: getString(data["phone"]) || getString(customerSnapshot["phone"]),
    fields: isRecord(data["fields"]) ? data["fields"] : answers,
    reservationDetails: isRecord(data["reservationDetails"]) ? data["reservationDetails"] : answers,
    status: getString(data["status"]) || "confirmed",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

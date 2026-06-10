import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { SHOP_ID } from "@/lib/constants";
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
    const snapshot = await db
      .collection("reservations")
      .where("shopId", "==", SHOP_ID)
      .get();

    const reservations = snapshot.docs
      .map((doc): Record<string, unknown> & { id: string } => ({
        id: doc.id,
        ...(serialize(doc.data()) as Record<string, unknown>),
      }))
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

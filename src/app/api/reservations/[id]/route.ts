import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { STATUS_LABELS, type ReservationStatus } from "@/lib/constants";
import { getAdminDb, requireAdminUser } from "@/lib/firebase/admin";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    await requireAdminUser(request);
    const { id } = await params;
    const body = (await request.json()) as { status?: ReservationStatus };

    if (!body.status || !Object.keys(STATUS_LABELS).includes(body.status)) {
      return NextResponse.json({ error: "ステータスが不正です。" }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection("reservations").doc(id).update({
      status: body.status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id, status: body.status });
  } catch (cause) {
    console.error(cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "ステータス更新に失敗しました。" },
      { status: 500 },
    );
  }
}

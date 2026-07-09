import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb, requireAdminUser } from "@/lib/firebase/admin";

type AvailabilitySlotRequest = {
  time?: string;
  capacity?: number;
  booked?: number;
  available?: boolean;
};

type AvailabilityRequest = {
  date?: string;
  startDate?: string;
  days?: number;
  slots?: AvailabilitySlotRequest[];
  mode?: "single" | "range";
};

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);
    const url = new URL(request.url);
    const date = url.searchParams.get("date")?.trim();

    if (!date || !isDateValue(date)) {
      return NextResponse.json({ error: "dateが不正です。" }, { status: 400 });
    }

    const snapshot = await getAdminDb().collection("availability").doc(date).get();
    const data = snapshot.exists ? snapshot.data() : {};

    return NextResponse.json({
      date,
      slots: normalizeSlots(data?.slots),
    });
  } catch (cause) {
    console.error(cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "空き枠の取得に失敗しました。" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminUser(request);
    const body = (await request.json()) as AvailabilityRequest;

    if (body.mode === "range") {
      return saveAvailabilityRange(body);
    }

    const date = body.date?.trim();

    if (!date || !isDateValue(date)) {
      return NextResponse.json({ error: "dateが不正です。" }, { status: 400 });
    }

    const slots = normalizeSlots(body.slots);

    await getAdminDb().collection("availability").doc(date).set(
      {
        slots,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ date, slots });
  } catch (cause) {
    console.error(cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "空き枠の保存に失敗しました。" },
      { status: 500 },
    );
  }
}

async function saveAvailabilityRange(body: AvailabilityRequest) {
  const startDate = body.startDate?.trim() || body.date?.trim();
  const days = Math.min(Math.max(toNonNegativeNumber(body.days, 7), 1), 31);

  if (!startDate || !isDateValue(startDate)) {
    return NextResponse.json({ error: "startDateが不正です。" }, { status: 400 });
  }

  const slots = normalizeSlots(body.slots);

  if (!slots.length) {
    return NextResponse.json({ error: "保存する空き枠がありません。" }, { status: 400 });
  }

  const db = getAdminDb();
  const batch = db.batch();
  const dates = buildDateRange(startDate, days);

  dates.forEach((date) => {
    batch.set(
      db.collection("availability").doc(date),
      {
        slots: slots.map((slot) => ({
          ...slot,
          booked: 0,
          remaining: slot.capacity,
        })),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  await batch.commit();

  return NextResponse.json({ startDate, days, dates, slots });
}

function normalizeSlots(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((slot) => {
      if (!slot || typeof slot !== "object" || Array.isArray(slot)) {
        return null;
      }

      const data = slot as AvailabilitySlotRequest;
      const time = data.time?.trim();

      if (!time || !isTimeValue(time)) {
        return null;
      }

      const capacity = toNonNegativeNumber(data.capacity, 1);
      const booked = toNonNegativeNumber(data.booked, 0);
      const remaining = Math.max(capacity - booked, 0);

      return {
        time,
        capacity,
        booked,
        remaining,
        available: data.available !== false,
      };
    })
    .filter((slot): slot is { time: string; capacity: number; booked: number; remaining: number; available: boolean } =>
      Boolean(slot),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

function isDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeValue(value: string) {
  return /^\d{1,2}:\d{2}$/.test(value);
}

function toNonNegativeNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return fallback;
  }

  return Math.floor(numberValue);
}

function buildDateRange(startDate: string, days: number) {
  const start = new Date(`${startDate}T00:00:00+09:00`);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  });
}

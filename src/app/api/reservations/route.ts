import { NextResponse } from "next/server";
import { sendReservationCompleteLineMessage } from "@/lib/storefront/line-message-service";
import { createReservation } from "@/lib/storefront/reservation-service";
import { getMenus, getQuestions, resolveActiveStoreForApi } from "@/lib/storefront/store-service";

type ReservationRequest = {
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  displayName?: string;
  phone?: string;
  email?: string;
  menuId?: string;
  staffId?: string;
  guestCount?: number;
  date?: string;
  time?: string;
  answers?: Record<string, string>;
  notes?: string;
  source?: "liff" | "line" | "web";
  campaignId?: string;
  couponId?: string;
};

export async function POST(request: Request) {
  const resolvedStore = await resolveActiveStoreForApi();

  if (!resolvedStore.ok) {
    return resolvedStore.response;
  }

  const { store } = resolvedStore;
  const body = (await request.json()) as ReservationRequest;
  const answers = body.answers ?? {};
  const bookingTemplate = answers.bookingTemplate?.trim();
  const menus = await getMenus({ bookingTemplate });
  const questions = await getQuestions({ bookingTemplate });

  if (!body.lineUserId?.trim()) {
    return NextResponse.json({ error: "LINE userIdが不足しています。" }, { status: 400 });
  }

  const selectedMenu = menus.find((menu) => menu.id === body.menuId) ?? menus[0];

  if (!body.menuId || !selectedMenu) {
    return NextResponse.json({ error: "メニューが不正です。" }, { status: 400 });
  }

  if (!body.displayName?.trim() || !body.phone?.trim()) {
    return NextResponse.json({ error: "お名前と電話番号を入力してください。" }, { status: 400 });
  }

  if (!body.date || !body.time) {
    return NextResponse.json({ error: "日時を選択してください。" }, { status: 400 });
  }

  const missingQuestion = questions.find((question) => question.required && !answers[question.id]?.trim());

  if (missingQuestion) {
    return NextResponse.json({ error: `${missingQuestion.label}を入力してください。` }, { status: 400 });
  }

  const reservation = await createReservation({
    store,
    menu: selectedMenu,
    lineUserId: body.lineUserId.trim(),
    lineDisplayName: body.lineDisplayName?.trim() || body.displayName.trim(),
    linePictureUrl: body.linePictureUrl?.trim(),
    displayName: body.displayName.trim(),
    phone: body.phone.trim(),
    email: body.email?.trim(),
    menuId: selectedMenu.id,
    staffId: body.staffId,
    guestCount: body.guestCount,
    date: body.date,
    time: body.time,
    answers,
    notes: body.notes,
    source: body.source,
    campaignId: body.campaignId?.trim(),
    couponId: body.couponId?.trim(),
  });
  const lineNotification = await sendReservationCompleteLineMessage({
    store,
    reservation,
    menu: selectedMenu,
    lineUserId: body.lineUserId.trim(),
    customerName: body.displayName.trim(),
    phone: body.phone.trim(),
    email: body.email?.trim(),
    staffName: answers.staffName,
    paymentMethod: answers.paymentMethod,
  });

  return NextResponse.json({
    reservation,
    lineNotification,
  });
}

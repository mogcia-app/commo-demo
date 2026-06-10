import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { SHOP_ID } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase/admin";
import { pushLineMessage } from "@/lib/line";
import {
  getReservationDemoConfig,
  getReservationSummary,
  isIndustryType,
  type IndustryType,
} from "@/lib/reservation-demos";
import { getReservationTemplateConfig, isTemplateType, type TemplateType } from "@/lib/reservation-templates";

type ReservationRequest = {
  industryType?: IndustryType;
  templateType?: TemplateType;
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  fields?: Record<string, string>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReservationRequest;
    const lineUserId = body.lineUserId?.trim();
    const lineDisplayName = body.lineDisplayName?.trim() ?? "";
    const linePictureUrl = body.linePictureUrl?.trim() ?? "";
    const fields = sanitizeFields(body.fields);
    const requestedTemplateType = body.templateType?.trim();
    const requestedIndustryType = body.industryType?.trim() ?? "salon";

    if (!lineUserId) {
      return NextResponse.json({ error: "LINE userIdが不足しています。" }, { status: 400 });
    }

    if (requestedTemplateType && !isTemplateType(requestedTemplateType)) {
      return NextResponse.json({ error: "テンプレートタイプが不正です。" }, { status: 400 });
    }

    if (!requestedTemplateType && !isIndustryType(requestedIndustryType)) {
      return NextResponse.json({ error: "業種タイプが不正です。" }, { status: 400 });
    }

    const config =
      requestedTemplateType && isTemplateType(requestedTemplateType)
        ? getReservationTemplateConfig(requestedTemplateType)
        : getReservationDemoConfig(isIndustryType(requestedIndustryType) ? requestedIndustryType : "salon");
    const missingField = config.fields.find((field) => field.required && !fields[field.key]?.trim());

    if (missingField) {
      return NextResponse.json({ error: `${missingField.label}を入力してください。` }, { status: 400 });
    }

    const invalidField = config.fields.find((field) => {
      if (field.type !== "select" || !field.options) {
        return false;
      }

      return !field.options.includes(fields[field.key]);
    });

    if (invalidField) {
      return NextResponse.json({ error: `${invalidField.label}の値が不正です。` }, { status: 400 });
    }

    const summary = getReservationSummary(config, fields);

    const db = getAdminDb();
    const now = FieldValue.serverTimestamp();
    const customerRef = db.collection("customers").doc(`${SHOP_ID}_${lineUserId}`);
    const reservationRef = db.collection("reservations").doc();

    await db.runTransaction(async (transaction) => {
      const existingCustomer = await transaction.get(customerRef);

      transaction.set(
        customerRef,
        {
          shopId: SHOP_ID,
          lineUserId,
          lineDisplayName,
          linePictureUrl,
          name: summary.name,
          phone: summary.phone,
          createdAt: existingCustomer.exists ? existingCustomer.data()?.createdAt ?? now : now,
          updatedAt: now,
        },
        { merge: true },
      );

      transaction.set(reservationRef, {
        shopId: SHOP_ID,
        customerId: customerRef.id,
        industryType: config.industryType,
        industryLabel: config.industryLabel,
        templateType: "templateType" in config ? config.templateType : null,
        templateLabel: "templateLabel" in config ? config.templateLabel : null,
        lineUserId,
        lineDisplayName,
        linePictureUrl,
        menuName: summary.plan,
        date: summary.date,
        time: summary.time,
        name: summary.name,
        phone: summary.phone,
        fields,
        reservationDetails: fields,
        status: "reserved",
        createdAt: now,
        updatedAt: now,
      });
    });

    let lineNotification: "sent" | "failed" = "sent";

    try {
      const messageLines = [
        "ご予約ありがとうございます。",
        "",
        "【予約内容】",
        `業種：${config.industryLabel}`,
      ];

      if ("templateLabel" in config) {
        messageLines.push(`テンプレート：${config.templateLabel}`);
      }

      messageLines.push(
        `メニュー/プラン：${summary.plan}`,
        `日時：${summary.dateTime}`,
        `お名前：${summary.name}`,
        `電話番号：${summary.phone}`,
        "",
        "内容を確認のうえ、当日はお気をつけてお越しください。",
      );

      await pushLineMessage({
        to: lineUserId,
        text: messageLines.join("\n"),
      });
    } catch (cause) {
      lineNotification = "failed";
      console.error("LINE Push Message送信に失敗しました", cause);
    }

    return NextResponse.json({
      id: reservationRef.id,
      customerId: customerRef.id,
      industryType: config.industryType,
      templateType: "templateType" in config ? config.templateType : null,
      lineNotification,
    });
  } catch (cause) {
    console.error(cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "予約の作成に失敗しました。" },
      { status: 500 },
    );
  }
}

function sanitizeFields(fields: unknown) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, typeof value === "string" ? value.trim() : String(value ?? "").trim()]),
  );
}

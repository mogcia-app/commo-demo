import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getRegionByPrefecture } from "@/lib/survey-taxonomy";

type SurveyResponseRequest = {
  name?: string;
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  ageGroup?: string;
  purpose?: string;
  area?: string;
  prefecture?: string;
  interests?: string[];
  usageCount?: string;
  weekdayNeeds?: string;
  comment?: string;
  source?: "liff" | "line" | "web";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as SurveyResponseRequest;
    const name = body.name?.trim() ?? "";
    const lineUserId = body.lineUserId?.trim() ?? "";
    const lineDisplayName = body.lineDisplayName?.trim() ?? "";
    const linePictureUrl = body.linePictureUrl?.trim() ?? "";
    const ageGroup = body.ageGroup?.trim() ?? "";
    const purpose = body.purpose?.trim() ?? "";
    const prefecture = body.prefecture?.trim() || body.area?.trim() || "";
    const region = getRegionByPrefecture(prefecture);
    const interests = normalizeStringArray(body.interests);
    const usageCount = body.usageCount?.trim() ?? "";
    const weekdayNeeds = body.weekdayNeeds?.trim() ?? "";
    const comment = body.comment?.trim() ?? "";
    const source = body.source ?? "liff";

    if (!name) {
      return NextResponse.json({ error: "お名前を入力してください。" }, { status: 400 });
    }

    if (!ageGroup || !purpose || !prefecture || !usageCount || !weekdayNeeds) {
      return NextResponse.json({ error: "必須項目をすべて選択してください。" }, { status: 400 });
    }

    const db = getAdminDb();
    const now = FieldValue.serverTimestamp();
    const surveyResponseRef = db.collection("surveyResponses").doc();
    const analyticsEventRef = db.collection("analyticsEvents").doc();
    const surveyAnswers = {
      ageGroup,
      purpose,
      prefecture,
      area: prefecture,
      region,
      interests,
      usageCount,
      weekdayNeeds,
      comment,
    };

    if (!lineUserId) {
      await Promise.all([
        surveyResponseRef.set({
          lineUserId: "",
          lineDisplayName: "",
          linePictureUrl: "",
          customerId: "",
          name,
          answers: surveyAnswers,
          source: "web",
          createdAt: now,
          updatedAt: now,
        }),
        analyticsEventRef.set({
          eventType: "survey_submit",
          source: "web",
          lineUserId: "",
          customerId: "",
          reservationId: "",
          campaignId: "",
          couponId: "",
          metadata: {
            surveyResponseId: surveyResponseRef.id,
            purpose,
            prefecture,
            region,
            interests,
            usageCount,
            weekdayNeeds,
          },
          createdAt: now,
        }),
      ]);

      return NextResponse.json({
        surveyResponse: {
          id: surveyResponseRef.id,
          lineUserId: "",
          name,
        },
      });
    }

    const lineUserRef = db.collection("lineUsers").doc(toSafeDocId(lineUserId));

    await db.runTransaction(async (transaction) => {
      const existingLineUser = await transaction.get(lineUserRef);
      const customerId = `line_${toSafeDocId(lineUserId)}`;

      transaction.set(surveyResponseRef, {
        lineUserId,
        lineDisplayName,
        linePictureUrl,
        customerId,
        name,
        answers: surveyAnswers,
        source,
        createdAt: now,
        updatedAt: now,
      });

      transaction.set(
        lineUserRef,
        {
          lineUserId,
          displayName: lineDisplayName || existingLineUser.data()?.displayName || name,
          pictureUrl: linePictureUrl || existingLineUser.data()?.pictureUrl || "",
          customerName: name,
          customerId,
          followStatus: "following",
          surveyAnsweredAt: now,
          surveyAnswers,
          latestSurveyResponseId: surveyResponseRef.id,
          latestSurveyStatus: "answered",
          tags: buildSurveyTags({ ageGroup, purpose, prefecture, region, interests, usageCount, weekdayNeeds }),
          lastActionAt: now,
          lastActionLabel: "アンケートに回答",
          reactionCount: FieldValue.increment(1),
          updatedAt: now,
          createdAt: existingLineUser.exists ? existingLineUser.data()?.createdAt ?? now : now,
        },
        { merge: true },
      );

      transaction.set(analyticsEventRef, {
        eventType: "survey_submit",
        source,
        lineUserId,
        customerId,
        reservationId: "",
        campaignId: "",
        couponId: "",
        metadata: {
          surveyResponseId: surveyResponseRef.id,
          ageGroup,
          purpose,
          prefecture,
          region,
          interests,
          usageCount,
          weekdayNeeds,
        },
        createdAt: now,
      });
    });

    return NextResponse.json({
      surveyResponse: {
        id: surveyResponseRef.id,
        lineUserId,
        name,
      },
    });
  } catch (cause) {
    console.error(cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "アンケート回答の保存に失敗しました。" },
      { status: 500 },
    );
  }
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean).slice(0, 20);
}

function buildSurveyTags(input: { ageGroup: string; purpose: string; prefecture: string; region: string; interests: string[]; usageCount: string; weekdayNeeds: string }) {
  return [...new Set([input.ageGroup, `${input.purpose}関心`, input.prefecture, input.region ? `${input.region}エリア` : "", input.usageCount, input.weekdayNeeds, ...input.interests].filter(Boolean))];
}

function toSafeDocId(value: string) {
  return value.replaceAll("/", "_");
}

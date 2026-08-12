import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { LineFriendAuthError, requireLineFriend } from "@/lib/server/line-friend-auth";

type SurveyOpenRequest = {
  lineDisplayName?: string;
  linePictureUrl?: string;
  idToken?: string;
  source?: "liff" | "line" | "web";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as SurveyOpenRequest;
    const idToken = body.idToken?.trim() ?? "";

    if (!idToken) {
      return NextResponse.json({ error: "LINE認証情報が不足しています。" }, { status: 401 });
    }

    const friend = await requireLineFriend(idToken);
    const now = FieldValue.serverTimestamp();
    const db = getAdminDb();
    const eventRef = db.collection("analyticsEvents").doc();
    const displayName = body.lineDisplayName?.trim() || friend.profile.displayName;
    const pictureUrl = body.linePictureUrl?.trim() || friend.profile.pictureUrl;
    const lineUserData = friend.lineUserSnapshot.data() ?? {};

    if (hasSurveyAnswered(lineUserData)) {
      return NextResponse.json({
        tracked: true,
        alreadyAnswered: true,
        latestSurveyResponseId: typeof lineUserData.latestSurveyResponseId === "string" ? lineUserData.latestSurveyResponseId : "",
      });
    }

    await Promise.all([
      friend.lineUserRef.set(
        {
          lineUserId: friend.lineUserId,
          displayName,
          pictureUrl,
          surveyOpenedAt: now,
          latestSurveyStatus: "opened",
          lastActionAt: now,
          lastActionLabel: "アンケートページを開封",
          reactionCount: FieldValue.increment(1),
          updatedAt: now,
        },
        { merge: true },
      ),
      eventRef.set({
        eventType: "survey_open",
        source: body.source ?? "liff",
        lineUserId: friend.lineUserId,
        customerId: `line_${friend.safeLineUserId}`,
        metadata: {},
        createdAt: now,
      }),
    ]);

    return NextResponse.json({ tracked: true, alreadyAnswered: false });
  } catch (cause) {
    if (cause instanceof LineFriendAuthError) {
      return NextResponse.json({ error: cause.message }, { status: cause.status });
    }

    console.error(cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "アンケート開封の記録に失敗しました。" },
      { status: 500 },
    );
  }
}

function hasSurveyAnswered(data: FirebaseFirestore.DocumentData) {
  return Boolean(data.surveyAnsweredAt || data.latestSurveyResponseId || data.surveyAnswers);
}

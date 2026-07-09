import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

type AuthConfirmationRequest = {
  idToken?: string;
};

type LineIdTokenVerification = {
  sub?: string;
  aud?: string;
  name?: string;
  picture?: string;
  email?: string;
  exp?: number;
  iat?: number;
  auth_time?: number;
  amr?: string[];
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AuthConfirmationRequest;
  const idToken = body.idToken?.trim();
  const clientId = getLineLoginChannelId();

  if (!idToken) {
    return NextResponse.json({ error: "ID tokenが不足しています。" }, { status: 400 });
  }

  if (!clientId) {
    return NextResponse.json({ error: "LINE LoginチャネルIDが未設定です。" }, { status: 500 });
  }

  const verification = await verifyLineIdToken(idToken, clientId);

  if (!verification.sub) {
    return NextResponse.json({ error: "LINE userIdを確認できませんでした。" }, { status: 400 });
  }

  const lineUserId = verification.sub;
  const now = FieldValue.serverTimestamp();
  const lineUserRef = getAdminDb().collection("lineUsers").doc(toSafeDocId(lineUserId));

  await getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(lineUserRef);

    transaction.set(
      lineUserRef,
      {
        lineUserId,
        displayName: verification.name ?? "",
        pictureUrl: verification.picture ?? "",
        email: verification.email ?? "",
        authVerified: true,
        authVerifiedAt: now,
        lastSeenAt: now,
        loginChannelId: verification.aud ?? clientId,
        authMethods: verification.amr ?? [],
        idTokenIssuedAt: verification.iat ?? null,
        idTokenExpiresAt: verification.exp ?? null,
        source: "liff",
        updatedAt: now,
        createdAt: snapshot.exists ? snapshot.data()?.createdAt ?? now : now,
      },
      { merge: true },
    );
  });

  return NextResponse.json({
    verified: true,
    profile: {
      displayName: verification.name ?? "",
      pictureUrl: verification.picture ?? "",
    },
  });
}

async function verifyLineIdToken(idToken: string, clientId: string): Promise<LineIdTokenVerification> {
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: clientId,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = typeof body.error_description === "string" ? body.error_description : "ID tokenの検証に失敗しました。";
    return Promise.reject(new Error(detail));
  }

  return body as LineIdTokenVerification;
}

function getLineLoginChannelId() {
  const explicitChannelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim() || process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID?.trim();

  if (explicitChannelId) {
    return explicitChannelId;
  }

  return process.env.NEXT_PUBLIC_LIFF_ID?.split("-")[0]?.trim() || "";
}

function toSafeDocId(value: string) {
  return value.replaceAll("/", "_");
}

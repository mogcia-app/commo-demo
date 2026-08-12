import type { DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

export type LineIdTokenVerification = {
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

export async function verifyLineIdToken(idToken: string): Promise<LineIdTokenVerification> {
  const clientId = getLineLoginChannelId();

  if (!clientId) {
    throw new Error("LINE LoginチャネルIDが未設定です。");
  }

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
    throw new Error(detail);
  }

  return body as LineIdTokenVerification;
}

export async function requireLineFriend(idToken: string) {
  const verification = await verifyLineIdToken(idToken);
  const lineUserId = verification.sub?.trim() ?? "";

  if (!lineUserId) {
    throw new LineFriendAuthError("LINE userIdを確認できませんでした。", 401);
  }

  const lineUserRef = getAdminDb().collection("lineUsers").doc(toSafeDocId(lineUserId));
  const snapshot = await lineUserRef.get();

  if (!isFollowingLineUser(snapshot)) {
    throw new LineFriendAuthError("公式LINEを友だち追加してから回答してください。", 403);
  }

  return {
    lineUserId,
    safeLineUserId: toSafeDocId(lineUserId),
    lineUserRef,
    lineUserSnapshot: snapshot,
    profile: {
      displayName: verification.name ?? "",
      pictureUrl: verification.picture ?? "",
      email: verification.email ?? "",
    },
    verification,
  };
}

export class LineFriendAuthError extends Error {
  constructor(message: string, readonly status = 401) {
    super(message);
  }
}

export function toSafeLineDocId(value: string) {
  return toSafeDocId(value);
}

function isFollowingLineUser(snapshot: DocumentSnapshot) {
  if (!snapshot.exists) {
    return false;
  }

  const data = snapshot.data() ?? {};
  const followStatus = typeof data.followStatus === "string" ? data.followStatus : "";

  if (followStatus === "blocked") {
    return false;
  }

  return Boolean(data.followedAt || followStatus === "following");
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

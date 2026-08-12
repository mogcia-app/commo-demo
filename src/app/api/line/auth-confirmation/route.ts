import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyLineIdToken } from "@/lib/server/line-friend-auth";

type AuthConfirmationRequest = {
  idToken?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AuthConfirmationRequest;
  const idToken = body.idToken?.trim();

  if (!idToken) {
    return NextResponse.json({ error: "ID tokenが不足しています。" }, { status: 400 });
  }

  const verification = await verifyLineIdToken(idToken);

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
        loginChannelId: verification.aud ?? "",
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

function toSafeDocId(value: string) {
  return value.replaceAll("/", "_");
}

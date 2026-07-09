"use client";

import { useEffect, useState } from "react";

export type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl: string;
};

type LineAuthVerification = {
  verified: boolean;
  error?: string;
};

const demoProfile: LineProfile = {
  userId: "demo-line-user",
  displayName: "LINE Demo User",
  pictureUrl: "",
};

const allowDemoProfile = process.env.NODE_ENV !== "production";

export function useLineProfile(options?: { loginRedirectPath?: string }) {
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [liffState, setLiffState] = useState("LIFFを確認しています");
  const [authVerification, setAuthVerification] = useState<LineAuthVerification>({ verified: false });

  useEffect(() => {
    let ignore = false;

    async function initLiff() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!liffId) {
        if (allowDemoProfile) {
          setProfile(demoProfile);
          setAuthVerification({ verified: true });
          setLiffState("デモプロフィールで表示中");
        } else {
          setLiffState("LIFF IDが未設定です");
        }
        return;
      }

      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          const redirectUri = createLoginRedirectUri(options?.loginRedirectPath);

          if (hasTriedLoginRedirect(redirectUri)) {
            setLiffState("LINE認証を確認できませんでした。LINEアプリ内から開き直してください。");
            return;
          }

          markLoginRedirectTried(redirectUri);
          setLiffState("LINE認証へ移動しています");
          liff.login({
            redirectUri,
          });
          return;
        }

        const lineProfile = await liff.getProfile();
        const nextProfile = {
          userId: lineProfile.userId,
          displayName: lineProfile.displayName,
          pictureUrl: lineProfile.pictureUrl ?? "",
        };

        if (!ignore) {
          setProfile(nextProfile);
          clearLoginRedirectTries();
          setLiffState("LINE認証を確認しています");
        }

        const idToken = liff.getIDToken();

        if (!idToken) {
          if (!ignore) {
            setAuthVerification({ verified: false, error: "ID tokenを取得できませんでした。" });
            setLiffState(liff.isInClient() ? "LINEプロフィールを取得しました" : "LINEログインでプロフィールを取得しました");
          }
          return;
        }

        const verification = await confirmLineAuth(idToken);

        if (!ignore) {
          if (verification.verified) {
            setAuthVerification({ verified: true });
            setLiffState("LINE認証済み");
          } else {
            setAuthVerification({ verified: false, error: verification.error });
            setLiffState("LINE認証のDB確認に失敗しました");
          }
        }
      } catch (cause) {
        console.error(cause);
        if (!ignore) {
          if (allowDemoProfile) {
            setProfile(demoProfile);
            setAuthVerification({ verified: true });
            setLiffState("LIFF初期化に失敗したためデモプロフィールで表示中");
          } else {
            setAuthVerification({ verified: false, error: cause instanceof Error ? cause.message : "LINE認証に失敗しました。" });
            setLiffState("LIFF初期化に失敗しました");
          }
        }
      }
    }

    initLiff();

    return () => {
      ignore = true;
    };
  }, [options?.loginRedirectPath]);

  return { profile, liffState, authVerified: authVerification.verified, authVerificationError: authVerification.error };
}

function createLoginRedirectUri(loginRedirectPath?: string) {
  const fallbackPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const candidate = loginRedirectPath || fallbackPath;

  if (candidate.startsWith("/")) {
    return new URL(candidate, window.location.origin).toString();
  }

  try {
    const url = new URL(candidate);
    return url.origin === window.location.origin ? url.toString() : new URL(fallbackPath, window.location.origin).toString();
  } catch {
    return new URL(fallbackPath, window.location.origin).toString();
  }
}

function hasTriedLoginRedirect(redirectUri: string) {
  return window.sessionStorage.getItem(getLoginRedirectKey(redirectUri)) === "true";
}

function markLoginRedirectTried(redirectUri: string) {
  window.sessionStorage.setItem(getLoginRedirectKey(redirectUri), "true");
}

function clearLoginRedirectTries() {
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);

    if (key?.startsWith("commo:liff-login:")) {
      window.sessionStorage.removeItem(key);
    }
  }
}

function getLoginRedirectKey(redirectUri: string) {
  return `commo:liff-login:${redirectUri}`;
}

async function confirmLineAuth(idToken: string): Promise<LineAuthVerification> {
  const response = await fetch("/api/line/auth-confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const body = (await response.json().catch(() => ({}))) as { verified?: boolean; error?: string };

  if (!response.ok || !body.verified) {
    return { verified: false, error: body.error ?? "LINE認証の確認に失敗しました。" };
  }

  return { verified: true };
}

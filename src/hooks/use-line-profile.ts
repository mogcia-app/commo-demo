"use client";

import { useEffect, useState } from "react";

export type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl: string;
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

  useEffect(() => {
    let ignore = false;

    async function initLiff() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!liffId) {
        if (allowDemoProfile) {
          setProfile(demoProfile);
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
        if (!ignore) {
          setProfile({
            userId: lineProfile.userId,
            displayName: lineProfile.displayName,
            pictureUrl: lineProfile.pictureUrl ?? "",
          });
          clearLoginRedirectTries();
          setLiffState(liff.isInClient() ? "LINEプロフィールを取得しました" : "LINEログインでプロフィールを取得しました");
        }
      } catch (cause) {
        console.error(cause);
        if (!ignore) {
          if (allowDemoProfile) {
            setProfile(demoProfile);
            setLiffState("LIFF初期化に失敗したためデモプロフィールで表示中");
          } else {
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

  return { profile, liffState };
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

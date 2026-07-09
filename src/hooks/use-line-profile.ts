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
          setLiffState("LINE認証へ移動しています");
          liff.login({
            redirectUri: createLoginRedirectUri(options?.loginRedirectPath),
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

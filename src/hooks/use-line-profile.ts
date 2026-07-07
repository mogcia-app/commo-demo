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

export function useLineProfile(options?: { loginRedirectPath?: string }) {
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [liffState, setLiffState] = useState("LIFFを確認しています");

  useEffect(() => {
    let ignore = false;

    async function initLiff() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!liffId) {
        setProfile(demoProfile);
        setLiffState("デモプロフィールで表示中");
        return;
      }

      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          setLiffState("LINE認証へ移動しています");
          liff.login({
            redirectUri: `${window.location.origin}${options?.loginRedirectPath ?? window.location.pathname}`,
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
          setProfile(demoProfile);
          setLiffState("LIFF初期化に失敗したためデモプロフィールで表示中");
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

"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
      if (!currentUser) {
        router.replace("/admin/login");
      }
    });
  }, [router]);

  if (checking) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 text-sm text-slate-500">
        ログイン状態を確認しています
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <Link href="/admin/reservations" className="text-xl font-bold text-commo-ink">
              commo.
            </Link>
            <p className="text-xs text-slate-500">店舗管理画面</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/reservations"
              className={`text-sm font-semibold ${pathname === "/admin/reservations" ? "text-commo-hover" : "text-slate-500"}`}
            >
              予約一覧
            </Link>
            <Link
              href="/admin/availability"
              className={`text-sm font-semibold ${pathname === "/admin/availability" ? "text-commo-hover" : "text-slate-500"}`}
            >
              空き枠
            </Link>
            <Link
              href="/admin/menus"
              className={`text-sm font-semibold ${pathname === "/admin/menus" ? "text-commo-hover" : "text-slate-500"}`}
            >
              メニュー
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut(firebaseAuth);
                router.replace("/admin/login");
              }}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-commo-main"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-6">{children}</div>
    </main>
  );
}

"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

const navItems = [
  { href: "/admin", label: "ダッシュボード", description: "店舗状況の確認" },
  { href: "/admin/reservations", label: "予約一覧", description: "予約と顧客情報" },
  { href: "/admin/availability", label: "空き枠", description: "受付枠の管理" },
  { href: "/admin/menus", label: "メニュー", description: "料金とプラン" },
];

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
    <main className="min-h-screen bg-slate-50 text-commo-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white px-4 py-4 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div>
            <Link href="/admin" className="text-2xl font-bold tracking-normal text-commo-ink">
              commo<span className="text-commo-main">.</span>
            </Link>
            <p className="mt-1 text-xs font-semibold text-slate-500">店舗管理画面</p>
          </div>

          <nav className="mt-5 grid gap-2 sm:grid-cols-4 lg:grid-cols-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md border px-3 py-3 transition ${
                    active
                      ? "border-commo-main bg-commo-soft text-commo-hover"
                      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="mt-1 block text-xs font-semibold text-slate-400">{item.description}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-md bg-slate-50 p-3 text-xs font-semibold text-slate-500">
            <p>ログイン中</p>
            <p className="mt-1 truncate text-slate-700">{user.email ?? "admin"}</p>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={async () => {
                await signOut(firebaseAuth);
                router.replace("/admin/login");
              }}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-commo-main hover:text-commo-hover"
            >
              ログアウト
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</section>
      </div>
    </main>
  );
}

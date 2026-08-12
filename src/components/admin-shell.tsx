"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

const navItems = [
  { path: "", label: "顧客マーケティング" },
  { path: "/users", label: "顧客" },
  { path: "/surveys", label: "アンケート" },
  { path: "/segments", label: "セグメント" },
  { path: "/broadcasts", label: "配信" },
  { path: "/analytics", label: "分析" },
  { path: "/ai-suggestions", label: "AI施策" },
  { path: "/settings", label: "設定" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lineBasePath = "/admin/line";
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
      <div className="min-h-screen w-full">
        <aside className="border-b border-slate-200 bg-white px-4 py-4 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div>
            <Link href="/admin" className="text-2xl font-bold tracking-normal text-commo-ink">
              commo<span className="text-commo-main">.</span>
            </Link>
            <p className="mt-1 text-xs font-semibold text-slate-500">LINE Customer Marketing Platform</p>
          </div>

          <nav className="mt-5 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1">
            <Link
              href="/admin"
              className={`rounded-md border px-3 py-3 transition ${
                pathname === "/admin"
                  ? "border-commo-main bg-commo-soft text-commo-hover"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-bold">ホーム</span>
            </Link>
            {navItems.map((item) => {
              const href = `${lineBasePath}${item.path}`;
              const active =
                pathname === href ||
                (href !== lineBasePath && pathname.startsWith(`${href}/`));

              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md border px-3 py-3 transition ${
                    active
                      ? "border-commo-main bg-commo-soft text-commo-hover"
                      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-sm font-bold">{item.label}</span>
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

        <section className="mx-auto min-w-0 max-w-7xl px-4 py-6 lg:ml-64 lg:px-8">{children}</section>
      </div>
    </main>
  );
}

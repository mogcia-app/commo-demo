"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

export function AdminLoginForm({ showHomeLink = true }: { showHomeLink?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      router.push("/admin/reservations");
    } catch (cause) {
      console.error(cause);
      setError("メールアドレスまたはパスワードを確認してください。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <form onSubmit={onSubmit} className="rounded-md bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold text-commo-main">commo. admin</p>
        <h1 className="mt-2 text-2xl font-bold text-commo-ink">店舗管理者ログイン</h1>

        <label className="mt-6 block">
          <span className="text-sm font-semibold text-commo-ink">メールアドレス</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-3 outline-none transition focus:border-commo-main"
            autoComplete="email"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-commo-ink">パスワード</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-3 outline-none transition focus:border-commo-main"
            autoComplete="current-password"
          />
        </label>

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 w-full rounded-md bg-commo-main px-4 py-3 font-semibold text-white transition hover:bg-commo-hover disabled:bg-slate-300"
        >
          {isLoading ? "ログイン中" : "ログイン"}
        </button>

        {showHomeLink ? (
          <Link href="/" className="mt-4 block text-center text-sm font-semibold text-slate-500 hover:text-commo-hover">
            トップへ戻る
          </Link>
        ) : null}
      </form>
    </main>
  );
}

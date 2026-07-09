"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { fetchAdminAvailability, fetchAdminMenus, fetchAdminReservations, type AdminMenu } from "@/lib/admin-api";
import type { Reservation } from "@/lib/types";

type DashboardState = {
  reservations: Reservation[];
  menus: AdminMenu[];
  todaySlots: number;
  todayRemaining: number;
};

const initialState: DashboardState = {
  reservations: [],
  menus: [],
  todaySlots: 0,
  todayRemaining: 0,
};

export function AdminDashboard() {
  const [state, setState] = useState<DashboardState>(initialState);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const today = useMemo(() => getTodayValue(), []);
  const todayReservations = state.reservations.filter((reservation) => reservation.date === today);
  const activeMenus = state.menus.filter((menu) => menu.enabled !== false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const [reservationResult, menuResult, availabilityResult] = await Promise.all([
          fetchAdminReservations(),
          fetchAdminMenus(),
          fetchAdminAvailability(today),
        ]);

        if (!ignore) {
          setState({
            reservations: reservationResult.reservations,
            menus: menuResult.menus,
            todaySlots: availabilityResult.slots.length,
            todayRemaining: availabilityResult.slots.reduce((sum, slot) => sum + Math.max(slot.remaining, 0), 0),
          });
        }
      } catch (cause) {
        if (!ignore) {
          setError(cause instanceof Error ? cause.message : "ダッシュボードの取得に失敗しました。");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [today]);

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-commo-ink">ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">予約受付の状態と、管理作業の入口をまとめています。</p>
        </div>
        <Link
          href="/hotel-search"
          className="rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover"
        >
          予約ページ
        </Link>
      </div>

      {isLoading ? <p className="mb-4 text-sm text-slate-500">読み込み中です</p> : null}
      {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="本日の予約" value={`${todayReservations.length}件`} sub={today} />
        <MetricCard label="本日の空き枠" value={`${state.todayRemaining}枠`} sub={`${state.todaySlots}時間帯`} />
        <MetricCard label="表示メニュー" value={`${activeMenus.length}件`} sub={`${state.menus.length}件登録`} />
        <MetricCard label="直近予約" value={`${state.reservations.length}件`} sub="最大100件取得" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <ActionCard
          title="予約を確認"
          body="予約者情報、日時、ステータスを確認します。"
          href="/admin/reservations"
          action="予約一覧へ"
        />
        <ActionCard
          title="空き枠を作成"
          body="日付ごとの受付枠や、まとめて作成する枠を管理します。"
          href="/admin/availability"
          action="空き枠へ"
        />
        <ActionCard
          title="料金を変更"
          body="予約ページに表示するプラン名や料金を編集します。"
          href="/admin/menus"
          action="メニューへ"
        />
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-commo-ink">今日の動き</h2>
            <p className="mt-1 text-sm text-slate-500">本日分の予約だけを抜き出しています。</p>
          </div>
          <Link href="/admin/reservations" className="text-sm font-bold text-commo-hover">
            すべて見る
          </Link>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {todayReservations.slice(0, 5).map((reservation) => (
            <div key={reservation.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-bold text-commo-ink">{reservation.name || "名前未設定"}</p>
                <p className="mt-1 text-slate-500">{reservation.menuName}</p>
              </div>
              <span className="rounded-md bg-commo-soft px-3 py-1 font-semibold text-commo-hover">{reservation.time}</span>
            </div>
          ))}

          {!todayReservations.length ? <p className="py-5 text-sm text-slate-500">本日の予約はまだありません。</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-commo-ink">{value}</p>
      <p className="mt-2 text-xs font-semibold text-slate-400">{sub}</p>
    </article>
  );
}

function ActionCard({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-commo-ink">{title}</h2>
      <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">{body}</p>
      <Link href={href} className="mt-4 inline-flex rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover">
        {action}
      </Link>
    </article>
  );
}

function getTodayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

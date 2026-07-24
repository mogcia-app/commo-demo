"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  fetchAdminAvailability,
  fetchAdminLineOverview,
  fetchAdminMenus,
  fetchAdminReservations,
  type AdminLineOverview,
  type AdminMenu,
} from "@/lib/admin-api";
import type { Reservation } from "@/lib/types";

type DashboardState = {
  reservations: Reservation[];
  menus: AdminMenu[];
  todaySlots: number;
  todayRemaining: number;
  lineOverview: AdminLineOverview | null;
};

const initialState: DashboardState = {
  reservations: [],
  menus: [],
  todaySlots: 0,
  todayRemaining: 0,
  lineOverview: null,
};

const fallbackLine = {
  friendTotal: 2482,
  surveyResponseRate: 42.8,
  broadcastClickRate: 18.4,
  inactive90Count: 312,
};

export function AdminDashboard() {
  const [state, setState] = useState<DashboardState>(initialState);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const today = useMemo(() => getTodayValue(), []);
  const todayReservations = state.reservations.filter((reservation) => reservation.date === today);
  const activeMenus = state.menus.filter((menu) => menu.enabled !== false);
  const lineKpis = state.lineOverview?.kpis ?? fallbackLine;

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const [reservationResult, menuResult, availabilityResult, lineResult] = await Promise.allSettled([
          fetchAdminReservations(),
          fetchAdminMenus(),
          fetchAdminAvailability(today),
          fetchAdminLineOverview("hotel"),
        ]);

        if (!ignore) {
          setState({
            reservations: reservationResult.status === "fulfilled" ? reservationResult.value.reservations : [],
            menus: menuResult.status === "fulfilled" ? menuResult.value.menus : [],
            todaySlots: availabilityResult.status === "fulfilled" ? availabilityResult.value.slots.length : 0,
            todayRemaining:
              availabilityResult.status === "fulfilled"
                ? availabilityResult.value.slots.reduce((sum, slot) => sum + Math.max(slot.remaining, 0), 0)
                : 0,
            lineOverview: lineResult.status === "fulfilled" ? lineResult.value : null,
          });

          const rejected = [reservationResult, menuResult, availabilityResult, lineResult].find((result) => result.status === "rejected");
          setError(rejected?.status === "rejected" && rejected.reason instanceof Error ? rejected.reason.message : "");
        }
      } catch (cause) {
        if (!ignore) {
          setError(cause instanceof Error ? cause.message : "AI司令室の取得に失敗しました。");
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
      <section className="mb-6 rounded-md border border-commo-main bg-commo-main p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-bold text-white/75">LINE運用AIエージェント</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight">アンケート分類から配信・分析・改善まで自動で回す司令室</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
              AIが毎週LINE内の反応を読み取り、顧客分類、配信内容、予約日時、効果測定、次回改善まで実行します。予約・空き枠・プラン情報は、配信判断の補助データとして扱います。
            </p>
          </div>
          <div className="grid min-w-60 gap-2 rounded-md border border-white/20 bg-white/10 p-4">
            <StatusRow label="自動運用" value="ON" />
            <StatusRow label="次回週次分析" value="月曜 09:00" />
            <StatusRow label="配信ガードレール" value="有効" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/admin/line/ai-suggestions" className="rounded-md bg-white px-4 py-2 text-sm font-bold text-commo-hover transition hover:bg-commo-soft">
            AI自動運用を見る
          </Link>
          <Link href="/admin/line/broadcasts" className="rounded-md border border-white/30 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10">
            配信予定を見る
          </Link>
        </div>
      </section>

      {isLoading ? <p className="mb-4 text-sm text-slate-500">AI司令室を読み込み中です</p> : null}
      {error ? <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">一部データはデモ値で表示中: {error}</p> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="LINE友だち" value={`${lineKpis.friendTotal.toLocaleString("ja-JP")}人`} sub="AI分類の母数" />
        <MetricCard label="アンケート回答率" value={`${lineKpis.surveyResponseRate}%`} sub="分類精度に反映" />
        <MetricCard label="配信クリック率" value={`${lineKpis.broadcastClickRate}%`} sub="次回施策の評価指標" />
        <MetricCard label="90日反応なし" value={`${lineKpis.inactive90Count.toLocaleString("ja-JP")}人`} sub="頻度抑制の対象" />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="今週AIが回す運用サイクル" sub="担当者が画面を閉じても、サーバー側の定期実行で進みます">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["1. 分析", "友だち追加、アンケート、クリック、最終反応日を集計"],
              ["2. 分類", "高反応、未回答、平日/週末関心、休眠などを自動更新"],
              ["3. 施策作成", "セグメントごとに配信文と予約日時を生成"],
              ["4. 自動配信", "頻度上限と夜間停止を守ってLINEへ送信"],
              ["5. 効果測定", "クリック率、未反応、ブロック率を評価"],
              ["6. 改善", "翌週の対象、文面、頻度へ反映"],
            ].map(([title, body]) => (
              <article key={title} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-commo-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="予約済みのAI施策" sub="完全自動モードでは予約作成までAIが行います">
          <div className="space-y-3">
            {[
              ["月曜 10:30", "高反応ユーザー", "限定プランの先行案内", "低"],
              ["水曜 17:30", "週末宿泊関心層", "週末空室情報 + 予約リンク", "低"],
              ["金曜 10:00", "アンケート未回答", "1分アンケート再送", "低"],
              ["翌週 火曜 11:00", "90日反応なし", "受信希望確認 + 頻度抑制", "中"],
            ].map(([time, segment, theme, risk]) => (
              <div key={`${time}-${segment}`} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-commo-hover">{time}</p>
                    <p className="mt-1 font-bold text-commo-ink">{segment}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${risk === "低" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    リスク{risk}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{theme}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <ActionCard title="AI自動運用" body="週次分析、配信プラン、自動停止ルール、実行ログを確認します。" href="/admin/line/ai-suggestions" action="司令室へ" />
        <ActionCard title="顧客分類" body="LINE友だちのタグ、反応状態、アンケート回答を確認します。" href="/admin/line/users" action="分類を見る" />
        <ActionCard title="配信管理" body="AIが作った配信案と、アンケート回答者向け配信を確認します。" href="/admin/line/broadcasts" action="配信へ" />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="予約データとの接続" sub="LINE運用AIが参照できる店舗側データ">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="本日の予約" value={`${todayReservations.length}件`} sub={today} />
            <MetricCard label="本日の空き枠" value={`${state.todayRemaining}枠`} sub={`${state.todaySlots}時間帯`} />
            <MetricCard label="表示プラン" value={`${activeMenus.length}件`} sub={`${state.menus.length}件登録`} />
            <MetricCard label="直近予約" value={`${state.reservations.length}件`} sub="最大100件取得" />
          </div>
        </Panel>

        <Panel title="最近の予約・反応" sub="配信内容の判断材料として使う想定です">
          <div className="divide-y divide-slate-100">
            {todayReservations.slice(0, 5).map((reservation) => (
              <div key={reservation.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-bold text-commo-ink">{reservation.name || "名前未設定"}</p>
                  <p className="mt-1 text-slate-500">{reservation.menuName}</p>
                </div>
                <span className="rounded-md bg-commo-soft px-3 py-1 font-semibold text-commo-hover">{reservation.time}</span>
              </div>
            ))}

            {!todayReservations.length ? <p className="py-5 text-sm text-slate-500">本日の予約はまだありません。LINE反応データを優先して表示しています。</p> : null}
          </div>
        </Panel>
      </section>
    </AdminShell>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h2 className="text-lg font-bold text-commo-ink">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{sub}</p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-commo-ink">{value}</p>
      <p className="mt-2 min-h-8 text-xs font-semibold leading-4 text-slate-400">{sub}</p>
    </article>
  );
}

function ActionCard({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-commo-ink">{title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{body}</p>
      <Link href={href} className="mt-4 inline-flex rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover">
        {action}
      </Link>
    </article>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="font-semibold text-white/70">{label}</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  );
}

function getTodayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminShell } from "@/components/admin-shell";
import { getIndustryLineTemplate, type IndustryLineTemplate } from "@/config/line-industry-templates";
import {
  fetchAdminLineOverview,
  fetchAdminLineSettings,
  fetchAdminSurveyResponses,
  saveAdminLineSettings,
  sendAdminSurveyBroadcast,
  type AdminLineOverview,
  type AdminSurveyLineUser,
  type AdminSurveyResponse,
  type AdminSurveySegments,
} from "@/lib/admin-api";
import { ageGroupOptions, prefectureOptions, regionOptions } from "@/lib/survey-taxonomy";
import type { IndustryType, OrganizationLineSettings } from "@/lib/types";

type LineAdminView = "dashboard" | "users" | "user-detail" | "segments" | "surveys" | "broadcasts" | "step-messages" | "analytics" | "ai-suggestions" | "settings";

const storageKey = "commo.lineSettings";

const defaultLineSettings: OrganizationLineSettings = {
  industryType: "hotel",
  enabledModules: {
    surveys: true,
    segments: true,
    broadcasts: true,
    stepMessages: true,
    analytics: true,
    aiSuggestions: true,
  },
};

const industryOptions: { value: IndustryType; label: string }[] = [
  { value: "hotel", label: "ホテル" },
  { value: "restaurant", label: "飲食店" },
  { value: "beauty_salon", label: "美容室" },
  { value: "other", label: "その他" },
];

const monthlySeries = [
  { label: "4月", friends: 180, blocks: 12, sent: 9, opens: 460, clicks: 118 },
  { label: "5月", friends: 232, blocks: 16, sent: 12, opens: 620, clicks: 164 },
  { label: "6月", friends: 264, blocks: 14, sent: 11, opens: 710, clicks: 189 },
  { label: "7月", friends: 198, blocks: 9, sent: 8, opens: 540, clicks: 156 },
];

const users = [
  { id: "u-001", name: "山田 太郎", addedAt: "2026-07-01", lastActionAt: "2026-07-12", survey: "回答済み", tags: ["高反応", "限定プラン関心"], action: "配信リンクをクリック", reactions: 8, status: "高関心" },
  { id: "u-002", name: "Sato", addedAt: "2026-06-18", lastActionAt: "2026-07-08", survey: "未回答", tags: ["アンケート未回答"], action: "リッチメニューを選択", reactions: 2, status: "新規" },
  { id: "u-003", name: "M.K.", addedAt: "2026-04-22", lastActionAt: "2026-04-29", survey: "回答済み", tags: ["90日間反応なし"], action: "クーポンを表示", reactions: 1, status: "90日間反応なし" },
  { id: "u-004", name: "Aoi", addedAt: "2026-07-05", lastActionAt: "2026-07-13", survey: "回答済み", tags: ["高反応"], action: "アンケートに回答", reactions: 6, status: "反応あり" },
];

const fallbackOverview: AdminLineOverview = {
  botInfo: null,
  dataStatus: {
    lineApiConnected: false,
    followerIdsAvailable: false,
    followerIdError: "",
    firestoreUsers: 0,
    firestoreEvents: 0,
  },
  kpis: {
    friendTotal: 2482,
    thisMonthAdds: 198,
    thisMonthBlocks: 9,
    surveyResponseRate: 42.8,
    broadcastClickRate: 18.4,
    inactive90Count: 312,
  },
  users: users.map((user) => ({
    ...user,
    lineUserId: user.id,
    pictureUrl: "",
  })),
  monthlySeries,
  segmentCounts: [],
  richMenuClicks: [],
  surveyAnswers: [],
  actionItems: [
    { title: "直近90日間反応なし", count: 312, href: "/users" },
    { title: "友だち追加後アンケート未回答", count: 86, href: "/users" },
    { title: "リンククリックあり", count: 146, href: "/users" },
    { title: "推奨セグメントの確認", count: 118, href: "/segments" },
  ],
};

export function LineAdminPage({
  view,
  userId,
  basePath = "/admin/line",
  forcedIndustryType,
}: {
  view: LineAdminView;
  userId?: string;
  basePath?: string;
  forcedIndustryType?: IndustryType;
}) {
  const initialSettings = useMemo(
    () => (forcedIndustryType ? { ...defaultLineSettings, industryType: forcedIndustryType } : defaultLineSettings),
    [forcedIndustryType],
  );
  const [settings, setSettings] = useState<OrganizationLineSettings>(initialSettings);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [overview, setOverview] = useState<AdminLineOverview>(fallbackOverview);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const template = useMemo(() => getIndustryLineTemplate(settings.industryType), [settings.industryType]);

  useEffect(() => {
    if (forcedIndustryType) {
      setSettings({ ...defaultLineSettings, industryType: forcedIndustryType });
      return;
    }

    let ignore = false;

    async function loadSettings() {
      try {
        const result = await fetchAdminLineSettings();

        if (!ignore) {
          setSettings(result.lineSettings);
          window.localStorage.setItem(storageKey, JSON.stringify(result.lineSettings));
        }
      } catch {
        const saved = window.localStorage.getItem(storageKey);

        if (!saved || ignore) {
          return;
        }

        try {
          setSettings({ ...defaultLineSettings, ...JSON.parse(saved) });
        } catch {
          setSettings(defaultLineSettings);
        }
      }
    }

    void loadSettings();

    return () => {
      ignore = true;
    };
  }, [forcedIndustryType]);

  useEffect(() => {
    let ignore = false;

    async function loadOverview() {
      setOverviewLoading(true);

      try {
        const result = await fetchAdminLineOverview(settings.industryType);

        if (!ignore) {
          setOverview(result);
        }
      } catch {
        if (!ignore) {
          setOverview(fallbackOverview);
        }
      } finally {
        if (!ignore) {
          setOverviewLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      ignore = true;
    };
  }, [settings.industryType]);

  async function saveSettings(nextSettings: OrganizationLineSettings) {
    setSettings(nextSettings);
    window.localStorage.setItem(storageKey, JSON.stringify(nextSettings));

    try {
      const result = await saveAdminLineSettings(nextSettings);
      setSettings(result.lineSettings);
      window.localStorage.setItem(storageKey, JSON.stringify(result.lineSettings));
      setSettingsMessage("LINE設定を保存しました。");
    } catch {
      setSettingsMessage("保存できなかったため、この画面のプレビュー設定として反映しました。");
    }
  }

  return (
    <AdminShell>
      <LineHeader template={template} basePath={basePath} forcedIndustryType={forcedIndustryType} overview={overview} loading={overviewLoading} />

      {view === "dashboard" ? <DashboardView template={template} basePath={basePath} overview={overview} /> : null}
      {view === "users" ? <UsersView template={template} basePath={basePath} overview={overview} /> : null}
      {view === "user-detail" ? <UserDetailView template={template} userId={userId} overview={overview} basePath={basePath} /> : null}
      {view === "segments" ? <SegmentsView template={template} /> : null}
      {view === "surveys" ? <SurveysView template={template} basePath={basePath} /> : null}
      {view === "broadcasts" ? <BroadcastsView template={template} overview={overview} /> : null}
      {view === "step-messages" ? <DashboardView template={template} basePath={basePath} overview={overview} /> : null}
      {view === "analytics" ? <AnalyticsView template={template} /> : null}
      {view === "ai-suggestions" ? <AiSuggestionsView template={template} overview={overview} /> : null}
      {view === "settings" ? <SettingsView settings={settings} template={template} message={settingsMessage} forcedIndustryType={forcedIndustryType} onSave={saveSettings} /> : null}
    </AdminShell>
  );
}

function LineHeader({
  template,
  basePath,
  forcedIndustryType,
  overview,
  loading,
}: {
  template: IndustryLineTemplate;
  basePath: string;
  forcedIndustryType?: IndustryType;
  overview: AdminLineOverview;
  loading: boolean;
}) {
  return (
    <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-commo-hover">Customer Marketing / {template.dashboardLabels.industryLabel}</p>
        <h1 className="mt-1 text-2xl font-bold text-commo-ink">{forcedIndustryType === "hotel" ? "ホテル顧客マーケティング" : "顧客マーケティング"}</h1>
        <p className="mt-1 text-sm text-slate-500">LINE上の回答・行動から顧客像を作り、分類、配信、分析、次の施策までつなげます。</p>
      </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="green" label="顧客データ収集中" />
          <StatusPill tone="slate" label="自動分類有効" />
          <Link href={`${basePath}/settings`} className="rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover">
            設定
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MiniInfo label="データ入口" value={overview.botInfo?.displayName ?? "commo公式LINE"} sub="友だち追加・アンケート・行動イベント" />
        <MiniInfo label="顧客理解" value={loading ? "確認中" : "更新中"} sub="回答と行動から属性・タグを生成" />
        <MiniInfo label="施策改善" value={`${overview.kpis.broadcastClickRate}%`} sub="反応結果を次回配信へ反映" />
      </div>
    </div>
  );
}

function DashboardView({ template, basePath, overview }: { template: IndustryLineTemplate; basePath: string; overview: AdminLineOverview }) {
  const [surveySegments, setSurveySegments] = useState<AdminSurveySegments | null>(null);
  const [surveyRecipientCount, setSurveyRecipientCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadSurveySegments() {
      try {
        const result = await fetchAdminSurveyResponses();

        if (!ignore) {
          setSurveySegments(result.segments);
          setSurveyRecipientCount(result.recipientCount);
        }
      } catch {
        if (!ignore) {
          setSurveySegments(null);
        }
      }
    }

    void loadSurveySegments();

    return () => {
      ignore = true;
    };
  }, []);

  const segmentCounts = overview.segmentCounts.length
    ? overview.segmentCounts
    : template.dashboardLabels.assistMetrics.map((label, index) => ({ label, value: [146, 118, 96, 72][index] ?? 64 }));
  const richMenuClicks = overview.richMenuClicks.some((item) => item.value > 0)
    ? overview.richMenuClicks
    : template.dashboardLabels.richMenuExamples.map((label, index) => ({ label, value: [214, 188, 141, 96, 84][index] ?? 60 }));
  const regionRows = surveySegments?.regions.length
    ? surveySegments.regions.map((item) => ({ label: item.label, value: item.count }))
    : [
        { label: "九州", value: 42 },
        { label: "関西", value: 21 },
        { label: "関東", value: 18 },
        { label: "中国", value: 8 },
        { label: "その他", value: 11 },
      ];
  const purposeRows = surveySegments?.purposes.length
    ? surveySegments.purposes.map((item) => ({ label: item.label, value: item.count }))
    : [
        { label: "観光・レジャー", value: 38 },
        { label: "ビジネス・出張", value: 31 },
        { label: "家族旅行", value: 22 },
        { label: "その他", value: 9 },
      ];
  const surveyAnswerCount = surveyRecipientCount || Math.round((overview.kpis.friendTotal * overview.kpis.surveyResponseRate) / 100);
  const deliverableUsers = Math.max(0, overview.kpis.friendTotal - overview.kpis.thisMonthBlocks);
  const reservationConversion = Math.max(0, Math.round(deliverableUsers * 0.064));

  return (
    <div className="space-y-6">
      <CustomerMarketingFlow basePath={basePath} />

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="今月の友だち追加" value={`${overview.kpis.thisMonthAdds.toLocaleString("ja-JP")}人`} sub="新しく顧客化したLINE友だち" />
        <MetricCard label="アンケート回答" value={`${surveyAnswerCount.toLocaleString("ja-JP")}人`} sub={`回答率 ${overview.kpis.surveyResponseRate}%`} />
        <MetricCard label="配信可能ユーザー" value={`${deliverableUsers.toLocaleString("ja-JP")}人`} sub="友だち追加済み・ブロック除外" />
        <MetricCard label="今月の配信" value={`${overview.monthlySeries.at(-1)?.sent ?? 0}回`} sub="セグメント配信・自動配信" />
        <MetricCard label="平均クリック率" value={`${overview.kpis.broadcastClickRate}%`} sub="LINE内クリックイベント" />
        <MetricCard label="予約転換" value={`${reservationConversion.toLocaleString("ja-JP")}件`} sub="予約イベントから推定" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="今月の顧客構成" sub="アンケート回答から生成した地域属性">
          <div className="space-y-3">
            {regionRows.slice(0, 6).map((row) => (
              <ProgressRow key={row.label} label={row.label} value={row.value} max={Math.max(...regionRows.map((item) => item.value), 1)} suffix={surveySegments?.regions.length ? "人" : "%"} />
            ))}
          </div>
        </Panel>
        <Panel title="利用目的" sub="回答データから作成した顧客像">
          <div className="space-y-3">
            {purposeRows.slice(0, 6).map((row) => (
              <ProgressRow key={row.label} label={row.label} value={row.value} max={Math.max(...purposeRows.map((item) => item.value), 1)} suffix={surveySegments?.purposes.length ? "人" : "%"} />
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="顧客データの増加" sub="友だち追加とブロックの月次推移">
          <BarChart rows={overview.monthlySeries.map((item) => ({ label: item.label, value: item.friends, subValue: item.blocks }))} primaryLabel="友だち追加" secondaryLabel="ブロック" />
        </Panel>
        <Panel title="配信反応の推移" sub="セグメント配信へのLINE内反応">
          <BarChart rows={overview.monthlySeries.map((item) => ({ label: item.label, value: item.clicks, subValue: item.sent }))} primaryLabel="クリック" secondaryLabel="配信通知" />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="自動カテゴリー" sub="回答と行動からcommo.が生成">
          <div className="space-y-3">
            {segmentCounts.map((segment) => (
              <ProgressRow key={segment.label} label={segment.label} value={segment.value} max={160} />
            ))}
          </div>
        </Panel>
        <Panel title="行動シグナル" sub="LINE内で押された項目">
          <div className="space-y-3">
            {richMenuClicks.map((item) => (
              <ProgressRow key={item.label} label={item.label} value={item.value} max={Math.max(...richMenuClicks.map((row) => row.value), 1)} />
            ))}
          </div>
        </Panel>
        <Panel title="次に作るべき顧客群" sub="セグメント化すると配信に使えます">
          <div className="space-y-3">
            <SegmentCandidate label="関西 × ビジネス" count={482} href={`${basePath}/segments`} />
            <SegmentCandidate label="九州 × 観光" count={364} href={`${basePath}/segments`} />
            <SegmentCandidate label="回答済み × 高関心" count={146} href={`${basePath}/broadcasts`} />
            <SegmentCandidate label="開封済み未回答" count={86} href={`${basePath}/surveys`} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="要対応エリア" sub="LINE内行動を基準にした確認対象">
          <div className="divide-y divide-slate-100">
            {overview.actionItems.map((item) => (
              <div key={item.title} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">対象候補 {item.count.toLocaleString("ja-JP")}人</p>
                </div>
                <Link href={`${basePath}${item.href}`} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-commo-main">
                  対象ユーザーを見る
                </Link>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="今月のおすすめ施策" sub="顧客像とLINE内反応から提案">
          <div className="grid gap-3">
            {template.dashboardLabels.recommendedActions.map((action) => (
              <article key={action.title} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-commo-ink">{action.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{action.body}</p>
                <p className="mt-3 text-xs font-bold text-commo-hover">対象候補：{action.targetLabel} / 146人</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <FriendActionPlansPanel template={template} overview={overview} />
    </div>
  );
}

function CustomerMarketingFlow({ basePath }: { basePath: string }) {
  const steps = [
    ["集める", "友だち追加・アンケート・予約・クーポン"],
    ["知る", "回答と行動から顧客プロフィール生成"],
    ["分ける", "自動属性・自動タグ・セグメント"],
    ["届ける", "顧客像に合うLINE配信"],
    ["分析する", "開封・クリック・予約・ブロック"],
    ["次の施策", "AIが改善案と配信案を作成"],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-commo-hover">commo.の循環</p>
          <h2 className="mt-1 text-xl font-bold text-commo-ink">LINE上の顧客データを施策につなげる</h2>
        </div>
        <Link href={`${basePath}/ai-suggestions`} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-commo-main">
          次の施策を見る
        </Link>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {steps.map(([title, body], index) => (
          <article key={title} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold text-commo-hover">STEP {index + 1}</p>
            <h3 className="mt-1 text-sm font-bold text-commo-ink">{title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SegmentCandidate({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <div>
        <p className="text-sm font-bold text-commo-ink">{label}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">対象候補 {count.toLocaleString("ja-JP")}人</p>
      </div>
      <Link href={href} className="rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:text-commo-hover">
        使う
      </Link>
    </div>
  );
}

function UsersView({ template, basePath, overview }: { template: IndustryLineTemplate; basePath: string; overview: AdminLineOverview }) {
  const appliedTags = template.tags.slice(0, 6).map((tag) => tag.name);
  const displayUsers = overview.users.length ? overview.users : fallbackOverview.users;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="顧客カルテ" value={`${displayUsers.length.toLocaleString("ja-JP")}件`} sub="LINE友だちを顧客単位で管理" />
        <MetricCard label="回答済み" value={`${displayUsers.filter((user) => user.survey === "回答済み").length.toLocaleString("ja-JP")}人`} sub="属性生成済み" />
        <MetricCard label="高関心" value={`${displayUsers.filter((user) => user.status === "高関心" || user.tags.includes("高反応")).length.toLocaleString("ja-JP")}人`} sub="クリック・反応が多い顧客" />
        <MetricCard label="休眠候補" value={`${displayUsers.filter((user) => user.status.includes("90日") || daysSinceClient(user.lastActionAt) >= 90).length.toLocaleString("ja-JP")}人`} sub="再接触候補" />
      </section>
      <FilterPanel labels={["自動タグ", "友だち追加日", "最終反応日", "アンケート回答", "顧客状態", "行動シグナル", "配信反応", "ブロック状態"]} />
      <Panel title="LINE顧客カルテ" sub="友だち追加、回答、タグ、行動履歴を顧客単位で確認します">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500">
              <tr>
                {["", "顧客", "友だち追加", "最終反応", "プロフィール", "自動タグ", "直近の行動", "反応", "状態"].map((head) => (
                  <th key={head} className="px-3 py-3 font-bold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayUsers.map((user, index) => (
                <tr key={user.id}>
                  <td className="px-3 py-3">
                    <input type="checkbox" aria-label={`${user.name}を選択`} className="h-4 w-4 rounded border-slate-300" />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`${basePath}/users/${user.id}`} className="flex items-center gap-3 font-bold text-commo-ink hover:text-commo-hover">
                      {user.pictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.pictureUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-commo-soft text-xs text-commo-hover">{user.name.slice(0, 1)}</span>
                      )}
                      <span>{user.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{formatDateLabel(user.addedAt)}</td>
                  <td className="px-3 py-3 text-slate-600">{formatDateLabel(user.lastActionAt)}</td>
                  <td className="px-3 py-3 text-slate-600">{user.survey === "回答済み" ? "回答から属性生成済み" : "属性未取得"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {uniqueTags([...(user.tags.length ? user.tags : []), appliedTags[index] ?? appliedTags[0]]).slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-md bg-commo-soft px-2 py-1 text-xs font-bold text-commo-hover">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{user.action}</td>
                  <td className="px-3 py-3 font-bold text-slate-700">{user.reactions}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{user.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["セグメントへ追加", "この条件で配信", "自動タグ再計算", "CSV出力"].map((action) => (
            <button key={action} type="button" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-commo-main">
              {action}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function UserDetailView({ template, userId, overview, basePath }: { template: IndustryLineTemplate; userId?: string; overview: AdminLineOverview; basePath: string }) {
  const displayUsers = overview.users.length ? overview.users : fallbackOverview.users;
  const user = displayUsers.find((item) => item.id === userId || item.lineUserId === userId) ?? displayUsers[0];
  const displayTags = uniqueTags([...(user.tags.length ? user.tags : []), ...template.tags.slice(0, 6).map((tag) => tag.name)]).slice(0, 10);

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-commo-hover">LINE顧客カルテ</p>
            <h2 className="mt-1 text-2xl font-bold text-commo-ink">{user.name}</h2>
            <p className="mt-1 text-sm text-slate-500">回答・行動・タグをもとに、その人に合う施策へつなげます。</p>
          </div>
          <Link href={`${basePath}/broadcasts`} className="rounded-md bg-commo-main px-4 py-2 text-sm font-bold text-white hover:bg-commo-hover">
            この顧客に配信
          </Link>
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="基本情報" sub="LINEプロフィールと友だち状態">
        <div className="space-y-3 text-sm">
          <DetailRow label="LINE表示名" value={user.name} />
          <DetailRow label="LINEユーザーID" value={user.lineUserId} />
          <DetailRow label="友だち追加日" value={formatDateLabel(user.addedAt)} />
          <DetailRow label="最終反応日" value={formatDateLabel(user.lastActionAt)} />
          <DetailRow label="ステータス" value={user.status} />
        </div>
      </Panel>
      <Panel title="自動タグ" sub="回答データと行動データから生成">
        <div className="flex flex-wrap gap-2">
          {displayTags.map((tag) => (
            <span key={tag} className="rounded-md bg-commo-soft px-3 py-2 text-sm font-bold text-commo-hover">#{tag}</span>
          ))}
        </div>
      </Panel>
      <Panel title="行動履歴" sub="LINE内反応と回答イベント">
        <div className="space-y-3 text-sm text-slate-600">
          <TimelineRow date={formatDateLabel(user.lastActionAt)} label={user.action} />
          <TimelineRow date={formatDateLabel(user.addedAt)} label="LINE友だち追加" />
          <TimelineRow date="-" label={`アンケート回答：${user.survey}`} />
          <TimelineRow date="-" label={`配信反応数：${user.reactions}回`} />
        </div>
      </Panel>
      </div>
    </div>
  );
}

function SegmentsView({ template }: { template: IndustryLineTemplate }) {
  return (
    <div className="space-y-5">
      <Panel title="新規セグメント作成" sub="回答属性・自動タグ・行動データを掛け合わせて配信対象を作ります">
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="grid gap-3 md:grid-cols-3">
            <StaticSelect label="居住地域" value="関西" />
            <StaticSelect label="都道府県" value="大阪府" />
            <StaticSelect label="利用目的" value="ビジネス・出張" />
            <StaticSelect label="宿泊回数" value="2回以上" />
            <StaticSelect label="最終反応" value="90日以内" />
            <StaticSelect label="行動シグナル" value="クリックあり" />
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">対象ユーザー</p>
            <p className="mt-2 text-3xl font-bold text-commo-ink">348人</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">大阪・ビジネス・リピーターとして保存できます。</p>
            <div className="mt-4 grid gap-2">
              <button type="button" className="rounded-md bg-commo-main px-3 py-2 text-sm font-bold text-white hover:bg-commo-hover">セグメント保存</button>
              <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-commo-main">この条件で配信</button>
            </div>
          </div>
        </div>
      </Panel>
      <TemplateList
        title="セグメント一覧"
        sub="保存済み・推奨セグメント。配信や分析の軸として使います"
        items={template.segments.map((segment) => ({ title: segment.name, body: segment.ruleSummary }))}
      />
    </div>
  );
}

function SurveysView({ template, basePath }: { template: IndustryLineTemplate; basePath: string }) {
  return (
    <div className="space-y-4">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-commo-hover">Data Collection</p>
            <h2 className="mt-1 text-xl font-bold text-commo-ink">アンケートは顧客理解の入口</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              回答データはそのまま保存し、commo.が地域・目的・関心・行動シグナルを自動属性とタグに変換します。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`${basePath}/broadcasts`} className="rounded-md bg-commo-main px-4 py-2 text-sm font-bold text-white hover:bg-commo-hover">アンケートを配信</Link>
            <Link href={`${basePath}/analytics`} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-commo-main">分析を見る</Link>
          </div>
        </div>
      </section>
      <HotelSurveyResponsesPanel />
      {template.surveys.map((survey) => (
        <Panel key={survey.title} title={survey.title} sub="commo Miniで作成する初回アンケートの設問例">
          <div className="grid gap-3 md:grid-cols-3">
            {survey.questions.map((question, index) => (
              <article key={question.text} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-commo-hover">Q{index + 1}</p>
                <h3 className="mt-1 font-bold text-commo-ink">{question.text}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <span key={option} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">{option}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function BroadcastsView({ template, overview }: { template: IndustryLineTemplate; overview: AdminLineOverview }) {
  return (
    <div className="space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-commo-hover">Segment Delivery</p>
        <h2 className="mt-1 text-xl font-bold text-commo-ink">顧客像に合わせてLINE配信する</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          地域、都道府県、利用目的、興味、行動シグナルを組み合わせて対象者を絞り、配信結果を次の施策へ戻します。
        </p>
      </section>
      <SurveyBroadcastPanel />
      <TemplateList
        title="配信テーマ"
        sub="AI施策提案やセグメント配信で使うメッセージパターン"
        items={template.broadcastTemplates.map((item) => ({ title: item.title, body: item.objective, note: item.exampleMessage }))}
      />
      <FriendActionPlansPanel template={template} overview={overview} compact />
    </div>
  );
}

function HotelSurveyResponsesPanel() {
  const [responses, setResponses] = useState<AdminSurveyResponse[]>([]);
  const [lineUsers, setLineUsers] = useState<AdminSurveyLineUser[]>([]);
  const [segments, setSegments] = useState<AdminSurveySegments>({
    ageGroups: [],
    purposes: [],
    areas: [],
    prefectures: [],
    regions: [],
    interests: [],
    usageCounts: [],
    weekdayNeeds: [],
  });
  const [delivery, setDelivery] = useState({ latestBroadcastId: "", targetCount: 0, unopenedCount: 0, openedNotAnsweredCount: 0, answeredCount: 0 });
  const [filters, setFilters] = useState({
    ageGroup: "",
    purpose: "",
    region: "",
    prefecture: "",
    status: "",
  });
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const surveyUrl = getSurveyDeliveryUrl();

  useEffect(() => {
    let ignore = false;

    async function loadResponses() {
      setLoading(true);
      setStatusMessage("");

      try {
        const result = await fetchAdminSurveyResponses();

        if (!ignore) {
          setResponses(result.responses);
          setLineUsers(result.lineUsers);
          setSegments(result.segments);
          setDelivery(result.delivery);
        }
      } catch (cause) {
        if (!ignore) {
          setStatusMessage(cause instanceof Error ? cause.message : "アンケート回答の取得に失敗しました。");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadResponses();

    return () => {
      ignore = true;
    };
  }, []);

  const latestResponseByLineUserId = useMemo(() => {
    const map = new Map<string, AdminSurveyResponse>();

    responses.forEach((response) => {
      if (response.lineUserId && !map.has(response.lineUserId)) {
        map.set(response.lineUserId, response);
      }
    });

    return map;
  }, [responses]);

  const rows = useMemo(() => {
    const answeredRows: AdminSurveyLineUser[] = responses
      .filter((response) => response.lineUserId && !lineUsers.some((user) => user.lineUserId === response.lineUserId))
      .map((response) => ({
        id: response.id,
        lineUserId: response.lineUserId,
        displayName: response.lineDisplayName || response.name,
        pictureUrl: "",
        friendAddedAt: "",
        surveyOpenedAt: "",
        surveyAnsweredAt: response.createdAt,
        lastMessageAt: "",
        latestSurveyBroadcastId: "",
        surveyStatus: "回答済み",
        answers: response.answers,
      }));

    return [...lineUsers, ...answeredRows].filter((user) => {
      const response = latestResponseByLineUserId.get(user.lineUserId);
      const answers = response?.answers ?? user.answers;

      if (filters.ageGroup && answers.ageGroup !== filters.ageGroup) {
        return false;
      }

      if (filters.purpose && answers.purpose !== filters.purpose) {
        return false;
      }

      if (filters.region && answers.region !== filters.region) {
        return false;
      }

      if (filters.prefecture && answers.prefecture !== filters.prefecture) {
        return false;
      }

      if (filters.status && user.surveyStatus !== filters.status) {
        return false;
      }

      return true;
    });
  }, [filters.ageGroup, filters.prefecture, filters.purpose, filters.region, filters.status, latestResponseByLineUserId, lineUsers, responses]);

  return (
    <Panel title="ホテルアンケート回答・分類" sub="URL配信、回答、地域分類、開封状況をまとめて確認します">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="最新配信対象" value={loading ? "..." : `${delivery.targetCount}人`} sub="直近のアンケート配信" />
        <MetricCard label="未開封" value={loading ? "..." : `${delivery.unopenedCount}人`} sub="配信済み・未開封" />
        <MetricCard label="開封済み未回答" value={loading ? "..." : `${delivery.openedNotAnsweredCount}人`} sub="URLを開いたが未回答" />
        <MetricCard label="回答済み" value={loading ? "..." : `${delivery.answeredCount}人`} sub="回答保存済み" />
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-bold text-slate-500">配信用アンケートURL</p>
        <p className="mt-1 break-all text-sm font-bold text-commo-ink">{surveyUrl}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <SegmentSelect label="年代" value={filters.ageGroup} options={toSegmentOptions(ageGroupOptions, segments.ageGroups)} onChange={(value) => setFilters((current) => ({ ...current, ageGroup: value }))} />
        <SegmentSelect label="利用目的" value={filters.purpose} options={segments.purposes} onChange={(value) => setFilters((current) => ({ ...current, purpose: value }))} />
        <SegmentSelect label="地方" value={filters.region} options={toSegmentOptions(regionOptions, segments.regions)} onChange={(value) => setFilters((current) => ({ ...current, region: value }))} />
        <SegmentSelect label="都道府県" value={filters.prefecture} options={toSegmentOptions(prefectureOptions, segments.prefectures.length ? segments.prefectures : segments.areas)} onChange={(value) => setFilters((current) => ({ ...current, prefecture: value }))} />
        <SegmentSelect
          label="開封/回答"
          value={filters.status}
          options={["未配信", "配信済み・未開封", "開封済み・未回答", "回答済み"].map((label) => ({ label, count: lineUsers.filter((user) => user.surveyStatus === label).length }))}
          onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              {["表示名", "友だち追加日", "状態", "年代", "地方", "都道府県", "利用目的", "開封日", "回答日"].map((head) => (
                <th key={head} className="px-3 py-3 font-bold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, 100).map((user) => {
              const response = latestResponseByLineUserId.get(user.lineUserId);
              const answers = response?.answers ?? user.answers;

              return (
                <tr key={`${user.lineUserId}-${user.id}`}>
                  <td className="px-3 py-3 font-bold text-commo-ink">{user.displayName}</td>
                  <td className="px-3 py-3 text-slate-600">{formatDateLabel(user.friendAddedAt)}</td>
                  <td className="px-3 py-3"><span className="rounded-md bg-commo-soft px-2 py-1 text-xs font-bold text-commo-hover">{user.surveyStatus}</span></td>
                  <td className="px-3 py-3 text-slate-600">{answers.ageGroup || "-"}</td>
                  <td className="px-3 py-3 text-slate-600">{answers.region || "-"}</td>
                  <td className="px-3 py-3 text-slate-600">{answers.prefecture || "-"}</td>
                  <td className="px-3 py-3 text-slate-600">{answers.purpose || "-"}</td>
                  <td className="px-3 py-3 text-slate-600">{formatDateLabel(user.surveyOpenedAt)}</td>
                  <td className="px-3 py-3 text-slate-600">{formatDateLabel(user.surveyAnsweredAt || response?.createdAt || "")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500">
        <span>表示対象 {rows.length.toLocaleString("ja-JP")}人</span>
        {statusMessage ? <span className="text-rose-600">{statusMessage}</span> : null}
      </div>
    </Panel>
  );
}

function SurveyBroadcastPanel() {
  const [responses, setResponses] = useState<AdminSurveyResponse[]>([]);
  const [lineUsers, setLineUsers] = useState<AdminSurveyLineUser[]>([]);
  const [segments, setSegments] = useState<AdminSurveySegments>({
    ageGroups: [],
    purposes: [],
    areas: [],
    prefectures: [],
    regions: [],
    interests: [],
    usageCounts: [],
    weekdayNeeds: [],
  });
  const [filters, setFilters] = useState({
    ageGroup: "",
    purpose: "",
    prefecture: "",
    region: "",
    interest: "",
    usageCount: "",
    weekdayNeeds: "",
  });
  const surveyUrl = getSurveyDeliveryUrl();
  const [message, setMessage] = useState(`{name} 様\n\nホテル利用アンケートにご協力ください。\n${surveyUrl}\n\n回答内容に合わせておすすめプランをご案内します。`);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadResponses() {
      setLoading(true);
      setStatusMessage("");

      try {
        const result = await fetchAdminSurveyResponses();

        if (!ignore) {
          setResponses(result.responses);
          setLineUsers(result.lineUsers);
          setSegments(result.segments);
        }
      } catch (cause) {
        if (!ignore) {
          setStatusMessage(cause instanceof Error ? cause.message : "アンケート回答の取得に失敗しました。");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadResponses();

    return () => {
      ignore = true;
    };
  }, []);

  const targetCount = useMemo(() => countSurveyTargets(responses, lineUsers, filters), [filters, lineUsers, responses]);

  async function submitBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      setStatusMessage("配信メッセージを入力してください。");
      return;
    }

    if (targetCount === 0) {
      setStatusMessage("配信対象のLINEユーザーがいません。");
      return;
    }

    setSubmitting(true);
    setStatusMessage("");

    try {
      const result = await sendAdminSurveyBroadcast({ message, filters });
      setStatusMessage(`配信しました。対象 ${result.broadcast.targetCount}人 / 成功 ${result.broadcast.sentCount}人 / 失敗 ${result.broadcast.failedCount}人`);
    } catch (cause) {
      setStatusMessage(cause instanceof Error ? cause.message : "アンケート回答者向け配信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="新規セグメント配信" sub="条件なしなら保存済みLINEユーザー全員へ、条件ありなら回答属性で絞って配信します">
      <form onSubmit={submitBroadcast} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <SegmentSelect label="年代" value={filters.ageGroup} options={segments.ageGroups} onChange={(value) => setFilters((current) => ({ ...current, ageGroup: value }))} />
          <SegmentSelect label="利用目的" value={filters.purpose} options={segments.purposes} onChange={(value) => setFilters((current) => ({ ...current, purpose: value }))} />
          <SegmentSelect label="地方" value={filters.region} options={segments.regions} onChange={(value) => setFilters((current) => ({ ...current, region: value }))} />
          <SegmentSelect label="都道府県" value={filters.prefecture} options={segments.prefectures.length ? segments.prefectures : segments.areas} onChange={(value) => setFilters((current) => ({ ...current, prefecture: value }))} />
          <SegmentSelect label="興味関心" value={filters.interest} options={segments.interests} onChange={(value) => setFilters((current) => ({ ...current, interest: value }))} />
          <SegmentSelect label="利用回数" value={filters.usageCount} options={segments.usageCounts} onChange={(value) => setFilters((current) => ({ ...current, usageCount: value }))} />
          <SegmentSelect label="平日ニーズ" value={filters.weekdayNeeds} options={segments.weekdayNeeds} onChange={(value) => setFilters((current) => ({ ...current, weekdayNeeds: value }))} />
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold text-slate-500">アンケートページURL</p>
          <p className="mt-1 break-all text-sm font-bold text-commo-ink">{surveyUrl}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">配信文にこのURLを入れるだけで回答を集められます。LIFFで開いたユーザーは開封状況も記録します。</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <label className="block">
            <span className="text-sm font-bold text-commo-ink">配信メッセージ</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              className="mt-2 w-full resize-none rounded-md border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-commo-main"
            />
            <p className="mt-2 text-xs font-semibold text-slate-500">{"{name}"} を入れるとアンケートのお名前に置換します。</p>
          </label>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">配信対象</p>
            <p className="mt-2 text-3xl font-bold text-commo-ink">{loading ? "..." : `${targetCount}人`}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">LINE配信予定 {loading ? "..." : `${targetCount}通`}。条件ありなら回答済みユーザーから絞ります。</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={submitting || loading || targetCount === 0} className="rounded-md bg-commo-main px-4 py-2 text-sm font-bold text-white hover:bg-commo-hover disabled:cursor-not-allowed disabled:bg-slate-300">
            {submitting ? "配信中..." : "対象者に配信"}
          </button>
          {statusMessage ? <p className="text-sm font-bold text-commo-hover">{statusMessage}</p> : null}
        </div>
      </form>
    </Panel>
  );
}

function SegmentSelect({ label, value, options, onChange }: { label: string; value: string; options: { label: string; count: number }[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-commo-main">
        <option value="">すべて</option>
        {options.map((option) => (
          <option key={option.label} value={option.label}>
            {option.label}（{option.count}）
          </option>
        ))}
      </select>
    </label>
  );
}

function countSurveyTargets(responses: AdminSurveyResponse[], lineUsers: AdminSurveyLineUser[], filters: { ageGroup: string; purpose: string; prefecture: string; region: string; interest: string; usageCount: string; weekdayNeeds: string }) {
  const hasAnswerFilter = Boolean(filters.ageGroup || filters.purpose || filters.prefecture || filters.region || filters.interest || filters.usageCount || filters.weekdayNeeds);
  const targets = new Set<string>();

  if (!hasAnswerFilter) {
    lineUsers.forEach((user) => {
      if (user.lineUserId) {
        targets.add(user.lineUserId);
      }
    });
  }

  responses.forEach((response) => {
    if (!response.lineUserId || targets.has(response.lineUserId)) {
      return;
    }

    if (filters.ageGroup && response.answers.ageGroup !== filters.ageGroup) {
      return;
    }

    if (filters.purpose && response.answers.purpose !== filters.purpose) {
      return;
    }

    if (filters.prefecture && response.answers.prefecture !== filters.prefecture) {
      return;
    }

    if (filters.region && response.answers.region !== filters.region) {
      return;
    }

    if (filters.usageCount && response.answers.usageCount !== filters.usageCount) {
      return;
    }

    if (filters.weekdayNeeds && response.answers.weekdayNeeds !== filters.weekdayNeeds) {
      return;
    }

    if (filters.interest && !response.answers.interests.includes(filters.interest)) {
      return;
    }

    targets.add(response.lineUserId);
  });

  return targets.size;
}

function AnalyticsView({ template }: { template: IndustryLineTemplate }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="配信" value="348通" sub="大阪・ビジネス向け" />
        <MetricCard label="開封" value="241" sub="69.3%" />
        <MetricCard label="クリック" value="87" sub="25.0% / 平均比 +10.2pt" />
        <MetricCard label="予約" value="22" sub="6.3%" />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="配信結果分析" sub="セグメント配信の成果を平均配信と比較">
        <div className="space-y-3">
          <ProgressRow label="今回クリック率" value={25.0} max={30} suffix="%" />
          <ProgressRow label="平均クリック率" value={14.8} max={30} suffix="%" />
          <ProgressRow label="予約転換" value={6.3} max={10} suffix="%" />
          <ProgressRow label="ブロック率" value={0.6} max={3} suffix="%" />
        </div>
      </Panel>
      <Panel title="顧客分析" sub="地域から目的へドリルダウンするイメージ">
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-commo-hover">地域</p>
            <h3 className="mt-1 text-lg font-bold text-commo-ink">九州 42%</h3>
            <p className="mt-2 text-sm text-slate-500">福岡・熊本・鹿児島が中心</p>
          </article>
          <article className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-commo-hover">九州内訳</p>
            <h3 className="mt-1 text-lg font-bold text-commo-ink">熊本 × 観光</h3>
            <p className="mt-2 text-sm text-slate-500">対象 184人 / 配信候補</p>
          </article>
        </div>
      </Panel>
      </div>
      <Panel title="反応が高い配信テーマ" sub={template.dashboardLabels.industryLabel}>
        <div className="space-y-3">
          {template.broadcastTemplates.slice(0, 6).map((item, index) => (
            <ProgressRow key={item.title} label={item.title} value={[188, 166, 142, 118, 104, 92][index] ?? 80} max={200} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AiSuggestionsView({ template, overview }: { template: IndustryLineTemplate; overview: AdminLineOverview }) {
  const [automationLevel, setAutomationLevel] = useState<"assist" | "auto">("auto");
  const users = overview.users.length ? overview.users : fallbackOverview.users;
  const weeklyPlans = useMemo(() => buildWeeklyAutomationPlans(template, users), [template, users]);
  const totalTargets = weeklyPlans.reduce((sum, plan) => sum + plan.targetCount, 0);
  const estimatedClicks = weeklyPlans.reduce((sum, plan) => sum + plan.expectedClicks, 0);

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-commo-main bg-commo-main p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white/80">AI Marketing Assistant</p>
            <h2 className="mt-2 text-2xl font-bold">おすすめターゲット、理由、施策、配信文まで提案</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
              アンケート、タグ、クリック、最終反応日を読み込み、AIが次に狙うべき顧客群と施策理由を提示します。配信文章は最後の実行手段です。
            </p>
          </div>
          <div className="rounded-md border border-white/20 bg-white/10 p-3">
            <p className="text-xs font-bold text-white/70">自動運用モード</p>
            <div className="mt-2 flex rounded-md bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setAutomationLevel("assist")}
                className={`rounded-md px-3 py-2 text-xs font-bold transition ${automationLevel === "assist" ? "bg-white text-commo-hover" : "text-white/80"}`}
              >
                承認制
              </button>
              <button
                type="button"
                onClick={() => setAutomationLevel("auto")}
                className={`rounded-md px-3 py-2 text-xs font-bold transition ${automationLevel === "auto" ? "bg-white text-commo-hover" : "text-white/80"}`}
              >
                完全自動
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="今週の自動施策" value={`${weeklyPlans.length}件`} sub={automationLevel === "auto" ? "AIが予約作成まで実行" : "AIが下書き作成、承認待ち"} />
        <MetricCard label="対象候補" value={`${totalTargets.toLocaleString("ja-JP")}人`} sub="重複配信を避けて週次上限内で調整" />
        <MetricCard label="予測クリック" value={`${estimatedClicks.toLocaleString("ja-JP")}件`} sub="直近のLINE内反応から推定" />
        <MetricCard label="安全制御" value="有効" sub="夜間停止・頻度上限・ブロック率監視" />
      </div>

      <Panel title="おすすめ施策" sub="AIがセグメント、理由、配信テーマ、メッセージを提案します">
        <div className="grid gap-3 xl:grid-cols-3">
          {weeklyPlans.map((plan) => (
            <article key={plan.title} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-commo-hover">{plan.scheduledAt}</p>
                  <h3 className="mt-1 text-base font-bold text-commo-ink">{plan.title}</h3>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${plan.risk === "低" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  リスク{plan.risk}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{plan.reason}</p>
              <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500">
                <DetailRow label="対象" value={`${plan.segment} / ${plan.targetCount.toLocaleString("ja-JP")}人`} />
                <DetailRow label="目的" value={plan.objective} />
                <DetailRow label="予測" value={`クリック ${plan.expectedClicks}件`} />
              </div>
              <div className="mt-3 rounded-md bg-white p-3">
                <p className="text-xs font-bold text-slate-400">AI生成メッセージ</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{plan.message}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded-md bg-commo-main px-3 py-2 text-xs font-bold text-white hover:bg-commo-hover">
                  {automationLevel === "auto" ? "予約済みを確認" : "承認して予約"}
                </button>
                <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-commo-main">
                  内容を編集
                </button>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="AIの判断理由" sub="売上や来店を断定せず、LINE内データを根拠にします">
          <div className="space-y-3">
            {[...template.aiSuggestionExamples, ...template.dashboardLabels.recommendedActions.map((item) => item.body)].map((body, index) => (
              <div key={`${body}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold text-commo-hover">根拠 {index + 1}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
            <div className="rounded-md bg-commo-soft p-3">
              <p className="text-xs font-bold text-commo-hover">プロンプト制約</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{template.aiPromptContext}</p>
            </div>
          </div>
        </Panel>

        <Panel title="自動停止ルール" sub="送信しすぎや強い訴求を防ぐためのガードレール">
          <div className="space-y-3">
            {[
              ["週次配信上限", "1ユーザーあたり週2回まで"],
              ["夜間配信禁止", "21:00-9:00は自動予約しない"],
              ["反応低下時", "クリック率が前回比30%低下で頻度を半減"],
              ["ブロック率監視", "0.8%超過で自動配信を停止"],
              ["強い訴求", "大幅割引・緊急表現は承認制へ切替"],
            ].map(([label, value]) => (
              <DetailRow key={label} label={label} value={value} />
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="自動実行ログ" sub="週次エージェントが分析、分類、予約、効果測定まで回した履歴">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["月曜 09:00", "週次分析", `${users.length.toLocaleString("ja-JP")}人の状態を更新`],
            ["月曜 09:12", "セグメント更新", `${template.segments.slice(0, 4).map((item) => item.name).join(" / ")} を再計算`],
            ["月曜 09:18", "予約作成", `${weeklyPlans.length}件の配信予約を作成`],
            ["翌週 月曜", "改善反映", "クリック・ブロック・未反応を次回施策へ反映"],
          ].map(([time, title, body]) => (
            <article key={title} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-400">{time}</p>
              <h3 className="mt-2 font-bold text-commo-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function FriendActionPlansPanel({ template, overview, compact = false }: { template: IndustryLineTemplate; overview: AdminLineOverview; compact?: boolean }) {
  const users = overview.users.length ? overview.users : fallbackOverview.users;
  const plans = compact ? template.friendActionPlans.slice(0, 6) : template.friendActionPlans;

  return (
    <Panel title="友だちタイプ別の施策" sub="分類ごとに、いつ・何を配信するかを確認できます">
      <div className="grid gap-3 lg:grid-cols-2">
        {plans.map((plan) => {
          const targetCount = countPlanTargets(users, plan);

          return (
            <article key={plan.friendType} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-commo-hover">{plan.recommendedTiming}</p>
                  <h3 className="mt-1 text-base font-bold text-commo-ink">{plan.friendType}</h3>
                </div>
                <span className="rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-700">対象候補 {targetCount.toLocaleString("ja-JP")}人</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{plan.conditionSummary}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <MiniPlanInfo label="目的" value={plan.objective} />
                <MiniPlanInfo label="配信テーマ" value={plan.messageTheme} />
              </div>
              <div className="mt-3 rounded-md bg-white p-3">
                <p className="text-xs font-bold text-slate-400">配信例</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{plan.exampleMessage}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1">
                  {plan.relatedTags.map((tag) => (
                    <span key={tag} className="rounded-md bg-commo-soft px-2 py-1 text-xs font-bold text-commo-hover">{tag}</span>
                  ))}
                </div>
                <button type="button" className="rounded-md bg-commo-main px-3 py-2 text-xs font-bold text-white hover:bg-commo-hover">
                  {plan.primaryAction}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function buildWeeklyAutomationPlans(template: IndustryLineTemplate, users: AdminLineOverview["users"]) {
  const prioritizedPlans = [
    ...template.friendActionPlans.filter((plan) => plan.friendType.includes("高反応")),
    ...template.friendActionPlans.filter((plan) => !plan.friendType.includes("高反応") && !plan.friendType.includes("90日間")),
    ...template.friendActionPlans.filter((plan) => plan.friendType.includes("90日間")),
  ].slice(0, 4);

  return prioritizedPlans.map((plan, index) => {
    const targetCount = Math.max(countPlanTargets(users, plan), fallbackTargetCount(index, users.length));
    const expectedClicks = Math.max(Math.round(targetCount * [0.22, 0.18, 0.14, 0.08][index]), 4);
    const schedule = ["月曜 10:30", "水曜 17:30", "金曜 10:00", "翌週 火曜 11:00"][index] ?? "翌週 木曜 11:00";
    const broadcast = template.broadcastTemplates.find((item) => plan.messageTheme.includes(item.title.slice(0, 2))) ?? template.broadcastTemplates[index % template.broadcastTemplates.length];

    return {
      title: plan.messageTheme,
      segment: plan.friendType,
      scheduledAt: schedule,
      targetCount,
      expectedClicks,
      objective: plan.objective,
      message: plan.exampleMessage || broadcast?.exampleMessage || "LINE内の反応に合わせたおすすめ情報をお届けします。",
      reason: `${plan.conditionSummary}。直近の${template.dashboardLabels.contentWords.linkReaction}とアンケート回答をもとに、${plan.recommendedTiming}の配信が最も反応を取りやすいと判断しました。`,
      risk: plan.friendType.includes("90日間") || plan.friendType.includes("30日間") ? "中" : "低",
    };
  });
}

function fallbackTargetCount(index: number, userCount: number) {
  const base = Math.max(userCount, 120);
  return [Math.round(base * 0.18), Math.round(base * 0.14), Math.round(base * 0.11), Math.round(base * 0.08)][index] ?? 12;
}

function SettingsView({
  settings,
  template,
  message,
  forcedIndustryType,
  onSave,
}: {
  settings: OrganizationLineSettings;
  template: IndustryLineTemplate;
  message: string;
  forcedIndustryType?: IndustryType;
  onSave: (settings: OrganizationLineSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  const selectedTemplate = getIndustryLineTemplate(draft.industryType);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  return (
    <div className="space-y-5">
      <Panel title="業種を選択してください" sub="organizationまたはtenant単位で利用するLINE運用テンプレート">
        <div className="grid gap-3 md:grid-cols-5">
          {industryOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={Boolean(forcedIndustryType)}
              onClick={() => setDraft((current) => ({ ...current, industryType: option.value }))}
              className={`rounded-md border px-4 py-3 text-left text-sm font-bold transition ${
                draft.industryType === option.value ? "border-commo-main bg-commo-soft text-commo-hover" : "border-slate-200 bg-white text-slate-700 hover:border-commo-main"
              } ${forcedIndustryType ? "cursor-not-allowed opacity-70" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {forcedIndustryType ? <p className="mt-3 text-xs font-bold text-slate-500">この入口ではホテル版の確認を優先するため、業種はホテルで固定しています。</p> : null}
      </Panel>

      <Panel title="有効モジュール" sub="Phase 1では画面とテンプレート管理を有効化します">
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(draft.enabledModules).map(([key, enabled]) => (
            <label key={key} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700">
              {moduleLabel(key)}
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    enabledModules: { ...current.enabledModules, [key]: event.target.checked },
                  }))
                }
                className="h-4 w-4"
              />
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="初期作成内容の確認" sub="既存タグや配信は削除せず、必要な推奨データを追加する想定です">
        <div className="grid gap-4 lg:grid-cols-2">
          <PreviewBlock title="推奨タグ" items={selectedTemplate.tags.map((item) => item.name)} />
          <PreviewBlock title="推奨セグメント" items={selectedTemplate.segments.map((item) => item.name)} />
          <PreviewBlock title="初期アンケート" items={selectedTemplate.surveys[0]?.questions.map((item) => item.text) ?? []} />
          <PreviewBlock title="配信テンプレート" items={selectedTemplate.broadcastTemplates.map((item) => item.title)} />
          <PreviewBlock title="友だちタイプ別施策" items={selectedTemplate.friendActionPlans.map((item) => item.friendType)} />
          <PreviewBlock title="ステップ配信テンプレート" items={selectedTemplate.stepCampaignTemplates.flatMap((item) => item.steps.map((step) => `${step.timing}: ${step.message}`))} />
          <PreviewBlock title="リッチメニュー項目例" items={selectedTemplate.dashboardLabels.richMenuExamples} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => onSave(draft)} className="rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover">
            業種設定を保存
          </button>
          <button type="button" className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-commo-main">
            推奨データを初期作成
          </button>
          <p className="text-xs font-semibold text-slate-500">現在の業種：{template.dashboardLabels.industryLabel}</p>
          {message ? <p className="text-xs font-bold text-commo-hover">{message}</p> : null}
        </div>
      </Panel>
    </div>
  );
}

function TemplateList({ title, sub, items }: { title: string; sub: string; items: { title: string; body: string; note?: string }[] }) {
  return (
    <Panel title={title} sub={sub}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-bold text-commo-ink">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            {item.note ? <p className="mt-3 rounded-md bg-white p-3 text-xs leading-5 text-slate-500">{item.note}</p> : null}
          </article>
        ))}
      </div>
    </Panel>
  );
}

function FilterPanel({ labels }: { labels: string[] }) {
  return (
    <Panel title="フィルター・検索" sub="LINE表示名、管理用メモ、タグ名で検索できます">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-commo-main" placeholder="LINE表示名・管理用メモ・タグ名で検索" />
        <button type="button" className="rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover">検索</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {labels.map((label) => (
          <button key={label} type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-commo-main">
            {label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-commo-main">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold leading-none text-commo-ink">{value}</p>
      <p className="mt-3 min-h-8 text-xs font-semibold leading-4 text-slate-400">{sub}</p>
    </article>
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

function BarChart({ rows, primaryLabel, secondaryLabel }: { rows: { label: string; value: number; subValue: number }[]; primaryLabel: string; secondaryLabel: string }) {
  const max = Math.max(...rows.flatMap((row) => [row.value, row.subValue]), 1);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[3rem_1fr] items-center gap-3 text-sm">
          <span className="font-bold text-slate-500">{row.label}</span>
          <div className="space-y-1">
            <div className="h-3 rounded-md bg-slate-100">
              <div className="h-3 rounded-md bg-commo-main" style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
            <div className="h-3 rounded-md bg-slate-100">
              <div className="h-3 rounded-md bg-slate-400" style={{ width: `${(row.subValue / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs font-semibold text-slate-400">{primaryLabel} / {secondaryLabel}</p>
    </div>
  );
}

function ProgressRow({ label, value, max, suffix = "人" }: { label: string; value: number; max: number; suffix?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-bold text-commo-ink">{value}{suffix}</span>
      </div>
      <div className="h-2 rounded-md bg-slate-100">
        <div className="h-2 rounded-md bg-commo-main" style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

function PreviewBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-bold text-commo-ink">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600">{item}</span>
        ))}
      </div>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}

function TimelineRow({ date, label }: { date: string; label: string }) {
  return (
    <div className="flex gap-3 rounded-md bg-slate-50 px-3 py-2">
      <span className="w-24 shrink-0 text-xs font-bold text-slate-400">{date}</span>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </div>
  );
}

function StaticSelect({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <select value={value} onChange={() => undefined} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-commo-ink outline-none">
        <option>{value}</option>
      </select>
    </label>
  );
}

function MiniInfo({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-commo-ink">{value}</p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-400">{sub}</p>
    </div>
  );
}

function MiniPlanInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">{value}</p>
    </div>
  );
}

function StatusPill({ tone, label }: { tone: "green" | "amber" | "slate"; label: string }) {
  const classes = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return <span className={`rounded-md border px-3 py-2 text-xs font-bold ${classes[tone]}`}>{label}</span>;
}

function countPlanTargets(users: AdminLineOverview["users"], plan: IndustryLineTemplate["friendActionPlans"][number]) {
  if (!users.length) {
    return 0;
  }

  if (plan.friendType.includes("新規")) {
    return users.filter((user) => user.status === "新規" || daysSinceClient(user.addedAt) <= 7).length;
  }

  if (plan.friendType.includes("アンケート未回答")) {
    return users.filter((user) => user.survey === "未回答").length;
  }

  if (plan.friendType.includes("高反応")) {
    return users.filter((user) => user.status === "高関心" || user.tags.includes("高反応") || user.reactions >= 5).length;
  }

  if (plan.friendType.includes("30日間")) {
    return users.filter((user) => user.status === "反応低下" || user.tags.includes("30日間反応なし") || daysSinceClient(user.lastActionAt) >= 30).length;
  }

  if (plan.friendType.includes("90日間")) {
    return users.filter((user) => user.status === "90日間反応なし" || user.tags.includes("90日間反応なし") || daysSinceClient(user.lastActionAt) >= 90).length;
  }

  return users.filter((user) =>
    plan.relatedTags.some((tag) => user.tags.some((userTag) => userTag.includes(tag) || tag.includes(userTag) || normalizeLabel(userTag) === normalizeLabel(tag))),
  ).length;
}

function normalizeLabel(value: string) {
  return value.replace(/関心層|ユーザー|情報|プラン|利用/g, "");
}

function uniqueTags(tags: string[]) {
  return [...new Set(tags.filter(Boolean))];
}

function toSegmentOptions(labels: string[], counts: { label: string; count: number }[]) {
  const countByLabel = new Map(counts.map((item) => [item.label, item.count]));

  return labels.map((label) => ({ label, count: countByLabel.get(label) ?? 0 }));
}

function getSurveyDeliveryUrl() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  if (liffId) {
    return `https://liff.line.me/${liffId}?path=%2Fdemo`;
  }

  if (typeof window === "undefined") {
    return "/liff?path=/demo";
  }

  return `${window.location.origin}/liff?path=/demo`;
}

function daysSinceClient(value: string) {
  if (!value) {
    return 999;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 999;
  }

  return Math.floor((Date.now() - parsed.getTime()) / 86400000);
}

function formatDateLabel(value: string) {
  if (!value) {
    return "未取得";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

function moduleLabel(key: string) {
  const labels: Record<string, string> = {
    surveys: "アンケート管理",
    segments: "セグメント管理",
    broadcasts: "配信管理",
    stepMessages: "ステップ配信",
    analytics: "LINE内行動分析",
    aiSuggestions: "AI改善提案",
  };

  return labels[key] ?? key;
}

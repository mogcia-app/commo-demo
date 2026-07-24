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
  type AdminSurveyResponse,
  type AdminSurveySegments,
} from "@/lib/admin-api";
import type { IndustryType, OrganizationLineSettings } from "@/lib/types";

type LineAdminView = "dashboard" | "users" | "user-detail" | "segments" | "surveys" | "broadcasts" | "step-messages" | "analytics" | "ai-suggestions" | "settings";

const storageKey = "commo.lineSettings";

const defaultLineSettings: OrganizationLineSettings = {
  industryType: "golf_course",
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
  { value: "golf_course", label: "ゴルフ場" },
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
      {view === "user-detail" ? <UserDetailView template={template} userId={userId} overview={overview} /> : null}
      {view === "segments" ? <SegmentsView template={template} /> : null}
      {view === "surveys" ? <SurveysView template={template} /> : null}
      {view === "broadcasts" ? <BroadcastsView template={template} overview={overview} /> : null}
      {view === "step-messages" ? <StepMessagesView template={template} /> : null}
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
        <p className="text-sm font-bold text-commo-hover">LINE運用 / {template.dashboardLabels.industryLabel}</p>
        <h1 className="mt-1 text-2xl font-bold text-commo-ink">{forcedIndustryType === "hotel" ? "ホテル向けLINE運用" : "LINE運用"}</h1>
        <p className="mt-1 text-sm text-slate-500">アンケート、顧客分類、配信、効果分析をまとめて管理します。</p>
      </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="green" label="自動運用中" />
          <StatusPill tone="slate" label="安全ルール有効" />
          <Link href={`${basePath}/settings`} className="rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover">
            運用設定
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MiniInfo label="公式アカウント" value={overview.botInfo?.displayName ?? "commo公式LINE"} sub="配信とアンケートの入口" />
        <MiniInfo label="運用状況" value={loading ? "確認中" : "稼働中"} sub="分類・配信・分析を自動で更新" />
        <MiniInfo label="今月の反応" value={`${overview.kpis.broadcastClickRate}%`} sub="配信クリック率をもとに改善" />
      </div>
    </div>
  );
}

function DashboardView({ template, basePath, overview }: { template: IndustryLineTemplate; basePath: string; overview: AdminLineOverview }) {
  const segmentCounts = overview.segmentCounts.length
    ? overview.segmentCounts
    : template.dashboardLabels.assistMetrics.map((label, index) => ({ label, value: [146, 118, 96, 72][index] ?? 64 }));
  const richMenuClicks = overview.richMenuClicks.some((item) => item.value > 0)
    ? overview.richMenuClicks
    : template.dashboardLabels.richMenuExamples.map((label, index) => ({ label, value: [214, 188, 141, 96, 84][index] ?? 60 }));
  const surveyAnswers = overview.surveyAnswers.some((item) => item.value > 0)
    ? overview.surveyAnswers
    : (template.surveys[0]?.questions[1]?.options ?? []).slice(0, 5).map((label, index) => ({ label, value: [34, 28, 18, 12, 8][index] ?? 5 }));

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="LINE友だち総数" value={`${overview.kpis.friendTotal.toLocaleString("ja-JP")}人`} sub="自動分類の対象" />
        <MetricCard label="今月の友だち追加数" value={`${overview.kpis.thisMonthAdds.toLocaleString("ja-JP")}人`} sub="友だち追加・連携日時基準" />
        <MetricCard label="今月のブロック数" value={`${overview.kpis.thisMonthBlocks.toLocaleString("ja-JP")}人`} sub="LINE内ステータス基準" />
        <MetricCard label="アンケート回答率" value={`${overview.kpis.surveyResponseRate}%`} sub="回答記録があるユーザー" />
        <MetricCard label="配信クリック率" value={`${overview.kpis.broadcastClickRate}%`} sub="LINE内イベント基準" />
        <MetricCard label="直近90日間反応なし" value={`${overview.kpis.inactive90Count.toLocaleString("ja-JP")}人`} sub="LINE内最終反応基準" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="友だち追加数とブロック数の推移" sub="LINE友だち追加とブロックの月次推移">
          <BarChart rows={overview.monthlySeries.map((item) => ({ label: item.label, value: item.friends, subValue: item.blocks }))} primaryLabel="友だち追加" secondaryLabel="ブロック" />
        </Panel>
        <Panel title="配信数・開封数・クリック数の推移" sub="配信へのLINE内反応">
          <BarChart rows={overview.monthlySeries.map((item) => ({ label: item.label, value: item.clicks, subValue: item.sent }))} primaryLabel="クリック" secondaryLabel="配信通知" />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="セグメント別ユーザー数" sub={`${template.dashboardLabels.industryLabel}向け補助表示`}>
          <div className="space-y-3">
            {segmentCounts.map((segment) => (
              <ProgressRow key={segment.label} label={segment.label} value={segment.value} max={160} />
            ))}
          </div>
        </Panel>
        <Panel title="リッチメニュー項目別クリック数" sub="LINE内で押された項目">
          <div className="space-y-3">
            {richMenuClicks.map((item) => (
              <ProgressRow key={item.label} label={item.label} value={item.value} max={Math.max(...richMenuClicks.map((row) => row.value), 1)} />
            ))}
          </div>
        </Panel>
        <Panel title="アンケート回答割合" sub="初期アンケート回答から集計">
          <div className="space-y-3">
            {surveyAnswers.map((item) => (
              <ProgressRow key={item.label} label={item.label} value={item.value} max={Math.max(...surveyAnswers.map((row) => row.value), 1)} suffix="人" />
            ))}
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
        <Panel title="今月のおすすめ施策" sub="AI改善提案の一部">
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

function UsersView({ template, basePath, overview }: { template: IndustryLineTemplate; basePath: string; overview: AdminLineOverview }) {
  const appliedTags = template.tags.slice(0, 6).map((tag) => tag.name);
  const displayUsers = overview.users.length ? overview.users : fallbackOverview.users;

  return (
    <div className="space-y-5">
      <FilterPanel labels={["タグ", "友だち追加日", "最終反応日", "アンケート回答", "ステータス", "クリックしたメニュー", "配信反応", "ブロック状態"]} />
      <Panel title="LINEユーザー" sub="LINE表示名、タグ、最終反応を一覧管理します">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500">
              <tr>
                {["", "表示名", "友だち追加日", "最終反応日", "アンケート", "保有タグ", "直近の行動", "反応数", "ステータス"].map((head) => (
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
                  <td className="px-3 py-3 text-slate-600">{user.survey}</td>
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
          {["タグ追加", "タグ削除", "セグメントへ追加", "配信対象に設定", "CSV出力"].map((action) => (
            <button key={action} type="button" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-commo-main">
              {action}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function UserDetailView({ template, userId, overview }: { template: IndustryLineTemplate; userId?: string; overview: AdminLineOverview }) {
  const displayUsers = overview.users.length ? overview.users : fallbackOverview.users;
  const user = displayUsers.find((item) => item.id === userId || item.lineUserId === userId) ?? displayUsers[0];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="基本情報" sub="LINEプロフィールと管理情報">
        <div className="space-y-3 text-sm">
          <DetailRow label="LINE表示名" value={user.name} />
          <DetailRow label="LINEユーザーID" value={user.lineUserId} />
          <DetailRow label="友だち追加日" value={formatDateLabel(user.addedAt)} />
          <DetailRow label="最終反応日" value={formatDateLabel(user.lastActionAt)} />
          <DetailRow label="ステータス" value={user.status} />
        </div>
      </Panel>
      <Panel title="保有タグ" sub={template.dashboardLabels.industryLabel}>
        <div className="flex flex-wrap gap-2">
          {template.tags.slice(0, 8).map((tag) => (
            <span key={tag.name} className="rounded-md bg-commo-soft px-3 py-2 text-sm font-bold text-commo-hover">{tag.name}</span>
          ))}
        </div>
      </Panel>
      <Panel title="LINE内行動" sub="来店や売上ではなくLINE内反応だけを表示">
        <div className="space-y-3 text-sm text-slate-600">
          <p>アンケート回答：{user.survey}</p>
          <p>直近の行動：{user.action}</p>
          <p>配信反応数：{user.reactions}</p>
          <p>{template.dashboardLabels.contentWords.linkReaction}：4回</p>
        </div>
      </Panel>
    </div>
  );
}

function SegmentsView({ template }: { template: IndustryLineTemplate }) {
  return (
    <TemplateList
      title="セグメント"
      sub="タグ・アンケート・LINE内反応を条件に分類します"
      items={template.segments.map((segment) => ({ title: segment.name, body: segment.ruleSummary }))}
    />
  );
}

function SurveysView({ template }: { template: IndustryLineTemplate }) {
  return (
    <div className="space-y-4">
      {template.surveys.map((survey) => (
        <Panel key={survey.title} title={survey.title} sub="業種別の初期アンケートテンプレート">
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
      <SurveyBroadcastPanel />
      <TemplateList
        title="配信テンプレート"
        sub="AIが施策作成に使う配信パターン"
        items={template.broadcastTemplates.map((item) => ({ title: item.title, body: item.objective, note: item.exampleMessage }))}
      />
      <FriendActionPlansPanel template={template} overview={overview} compact />
    </div>
  );
}

function SurveyBroadcastPanel() {
  const [responses, setResponses] = useState<AdminSurveyResponse[]>([]);
  const [segments, setSegments] = useState<AdminSurveySegments>({
    purposes: [],
    areas: [],
    interests: [],
    usageCounts: [],
    weekdayNeeds: [],
  });
  const [filters, setFilters] = useState({
    purpose: "",
    area: "",
    interest: "",
    usageCount: "",
    weekdayNeeds: "",
  });
  const [message, setMessage] = useState("{name} 様\n\n平日限定のホテルプランをご用意しました。\nご都合のよい日程がありましたら、LINEからお気軽にご確認ください。");
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

  const targetCount = useMemo(() => countSurveyTargets(responses, filters), [filters, responses]);

  async function submitBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      setStatusMessage("配信メッセージを入力してください。");
      return;
    }

    if (targetCount === 0) {
      setStatusMessage("配信対象のアンケート回答者がいません。");
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
    <Panel title="アンケート回答者向け配信" sub="公式LINEの属性ターゲティングではなく、DBに保存したLINEユーザーIDへ直接配信します">
      <form onSubmit={submitBroadcast} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <SegmentSelect label="利用目的" value={filters.purpose} options={segments.purposes} onChange={(value) => setFilters((current) => ({ ...current, purpose: value }))} />
          <SegmentSelect label="エリア" value={filters.area} options={segments.areas} onChange={(value) => setFilters((current) => ({ ...current, area: value }))} />
          <SegmentSelect label="興味関心" value={filters.interest} options={segments.interests} onChange={(value) => setFilters((current) => ({ ...current, interest: value }))} />
          <SegmentSelect label="利用回数" value={filters.usageCount} options={segments.usageCounts} onChange={(value) => setFilters((current) => ({ ...current, usageCount: value }))} />
          <SegmentSelect label="平日ニーズ" value={filters.weekdayNeeds} options={segments.weekdayNeeds} onChange={(value) => setFilters((current) => ({ ...current, weekdayNeeds: value }))} />
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
            <p className="mt-2 text-xs leading-5 text-slate-500">アンケート回答済みかつLINEユーザーIDが保存済みの人だけが対象です。</p>
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

function countSurveyTargets(responses: AdminSurveyResponse[], filters: { purpose: string; area: string; interest: string; usageCount: string; weekdayNeeds: string }) {
  const targets = new Set<string>();

  responses.forEach((response) => {
    if (!response.lineUserId || targets.has(response.lineUserId)) {
      return;
    }

    if (filters.purpose && response.answers.purpose !== filters.purpose) {
      return;
    }

    if (filters.area && response.answers.area !== filters.area) {
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

function StepMessagesView({ template }: { template: IndustryLineTemplate }) {
  return (
    <div className="space-y-4">
      {template.stepCampaignTemplates.map((campaign) => (
        <Panel key={campaign.title} title={campaign.title} sub="ステップ配信テンプレート">
          <div className="grid gap-3 md:grid-cols-5">
            {campaign.steps.map((step) => (
              <article key={step.timing} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-commo-hover">{step.timing}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.message}</p>
              </article>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function AnalyticsView({ template }: { template: IndustryLineTemplate }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="LINE内行動分析" sub="LINEで取得できる情報に限定">
        <div className="space-y-3">
          <ProgressRow label={template.dashboardLabels.contentWords.planInterest} value={68} max={100} suffix="%" />
          <ProgressRow label={template.dashboardLabels.contentWords.linkReaction} value={184} max={220} />
          <ProgressRow label="配信クリック率" value={18.4} max={30} suffix="%" />
          <ProgressRow label="アンケート回答率" value={42.8} max={60} suffix="%" />
          <ProgressRow label="LINE内再反応率" value={24.2} max={40} suffix="%" />
        </div>
      </Panel>
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
            <p className="text-sm font-bold text-white/80">LINE運用AIエージェント</p>
            <h2 className="mt-2 text-2xl font-bold">週次分析から施策作成・予約配信・改善まで自動実行</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
              アンケート、タグ、クリック、最終反応日を毎週読み込み、AIが対象分類、配信文、配信日時、改善方針を決めます。担当者は成果と停止条件だけを確認します。
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

      <Panel title="今週のAI自動運用プラン" sub="AIがセグメント、配信文、予約日時、狙いを自動生成します">
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

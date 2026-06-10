import Link from "next/link";
import { LiffWarmup } from "@/components/liff-warmup";
import { reservationDemoConfigs } from "@/lib/reservation-demos";

const demos = [
  {
    href: "/reserve/hotel",
    config: reservationDemoConfigs.hotel,
    sample: "客室選択から代表者情報まで、宿泊予約の自然な流れを再現します。",
  },
  {
    href: "/reserve/golf",
    config: reservationDemoConfigs.golf,
    sample: "来場日、スタート時間、コンペ利用までプレー予約に必要な項目を確認できます。",
  },
  {
    href: "/reserve/salon",
    config: reservationDemoConfigs.salon,
    sample: "メニュー、スタッフ、来店日時をスマホで選びやすく見せられます。",
  },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-white">
      <LiffWarmup />
      <section className="mx-auto w-full max-w-6xl px-5 py-10">
        <p className="text-sm font-semibold text-commo-main">commo. demo library</p>
        <h1 className="mt-3 text-4xl font-bold tracking-normal text-commo-ink">業種別LINE予約デモ</h1>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            営業先の業種に合わせて、予約項目と見た目を切り替えたデモを表示できます。
          </p>
          <Link
            href="/demo/templates"
            className="rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover"
          >
            予約UIテンプレートを見る
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {demos.map(({ href, config, sample }) => (
            <Link
              key={config.industryType}
              href={href}
              className="group overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-commo-main hover:shadow-soft"
            >
              <div className="p-5" style={{ backgroundColor: config.softAccent }}>
                <p className="text-sm font-semibold" style={{ color: config.accent }}>
                  {config.industryLabel}
                </p>
                <h2 className="mt-2 text-xl font-bold text-commo-ink">{config.title}</h2>
                <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-white/80 bg-white/70 px-3 text-center text-xs font-semibold text-slate-500">
                  {config.imagePlaceholder}
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm leading-6 text-slate-600">{sample}</p>
                <p className="mt-3 text-xs font-semibold text-slate-500">{config.steps.length}ステップの予約体験</p>
                <span
                  className="mt-5 inline-flex rounded-md px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: config.accent }}
                >
                  デモを開く
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { reservationDemoConfigs } from "@/lib/reservation-demos";

const demos = [
  {
    href: "/reserve/hotel",
    config: reservationDemoConfigs.hotel,
    sample: "宿泊日・客室タイプ・宿泊プラン",
  },
  {
    href: "/reserve/golf",
    config: reservationDemoConfigs.golf,
    sample: "来場日・スタート時間・コンペ利用",
  },
  {
    href: "/reserve/salon",
    config: reservationDemoConfigs.salon,
    sample: "来店日・メニュー・指名スタッフ",
  },
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto w-full max-w-6xl px-5 py-10">
        <p className="text-sm font-semibold text-commo-main">commo. demo library</p>
        <h1 className="mt-3 text-4xl font-bold tracking-normal text-commo-ink">業種別LINE予約デモ</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          営業先の業種に合わせて、予約項目と見た目を切り替えたデモを表示できます。
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {demos.map(({ href, config, sample }) => (
            <Link
              key={config.industryType}
              href={href}
              className="group overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-commo-main hover:shadow-soft"
            >
              <div className="h-28 p-5" style={{ backgroundColor: config.softAccent }}>
                <p className="text-sm font-semibold" style={{ color: config.accent }}>
                  {config.industryLabel}
                </p>
                <h2 className="mt-2 text-xl font-bold text-commo-ink">{config.title}</h2>
              </div>
              <div className="p-5">
                <p className="text-sm leading-6 text-slate-600">{sample}</p>
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

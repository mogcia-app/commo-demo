import Link from "next/link";
import { reservationTemplateConfigs } from "@/lib/reservation-templates";

const templates = [
  { href: "/reserve/templates/calendar", config: reservationTemplateConfigs.calendar, note: "日付から始める定番の予約導線" },
  { href: "/reserve/templates/slots", config: reservationTemplateConfigs.slots, note: "空き状況を見て即決しやすい枠表示" },
  { href: "/reserve/templates/cards", config: reservationTemplateConfigs.cards, note: "プランの魅力をカードで見せるUI" },
  { href: "/reserve/templates/hotel-search", config: reservationTemplateConfigs["hotel-search"], note: "宿泊検索から空室選択までの流れ" },
  { href: "/reserve/templates/golf-start", config: reservationTemplateConfigs["golf-start"], note: "スタート時間を軸にしたゴルフ予約" },
  { href: "/reserve/templates/chat", config: reservationTemplateConfigs.chat, note: "LINEらしく質問に答えて進む予約" },
];

export default function ReservationTemplatesPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-commo-main">commo. UI templates</p>
            <h1 className="mt-3 text-4xl font-bold tracking-normal text-commo-ink">予約UIテンプレート</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              業種だけでなく、予約の見せ方そのものを切り替えて提案できます。
            </p>
          </div>
          <Link href="/demo" className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            業種別デモへ
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(({ href, config, note }) => (
            <Link
              key={config.templateType}
              href={href}
              className="group overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-commo-main hover:shadow-soft"
            >
              <div className="p-5" style={{ backgroundColor: config.softAccent }}>
                <p className="text-sm font-semibold" style={{ color: config.accent }}>
                  {config.templateLabel}
                </p>
                <h2 className="mt-2 text-xl font-bold text-commo-ink">{config.title}</h2>
                <div className="mt-4 flex h-24 items-center justify-center rounded-md border border-dashed border-white/80 bg-white/70 px-3 text-center text-xs font-semibold text-slate-500">
                  {config.imagePlaceholder}
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm leading-6 text-slate-600">{note}</p>
                <p className="mt-3 text-xs font-semibold text-slate-500">{config.steps.length}ステップ</p>
                <span
                  className="mt-5 inline-flex rounded-md px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: config.accent }}
                >
                  テンプレートを開く
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

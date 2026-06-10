import Link from "next/link";
import { isIndustryType, reservationDemoConfigs } from "@/lib/reservation-demos";

export default async function ReserveCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ industry?: string }>;
}) {
  const { industry } = await searchParams;
  const config = reservationDemoConfigs[industry && isIndustryType(industry) ? industry : "salon"];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <section className="rounded-md bg-white p-6 text-center shadow-soft">
        <p
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold"
          style={{ backgroundColor: config.softAccent, color: config.accent }}
        >
          ✓
        </p>
        <h1 className="mt-5 text-2xl font-bold text-commo-ink">予約が完了しました</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {config.industryLabel}の予約を受け付けました。LINEに予約確認メッセージを送信しました。
        </p>
        <Link
          href={`/reserve/${config.industryType}`}
          className="mt-6 inline-flex rounded-md bg-commo-main px-5 py-3 text-sm font-semibold text-white transition hover:bg-commo-hover"
          style={{ backgroundColor: config.accent }}
        >
          別の予約を作成
        </Link>
        <Link href="/demo" className="mt-4 block text-sm font-semibold text-slate-500 hover:text-commo-hover">
          業種別デモへ戻る
        </Link>
      </section>
    </main>
  );
}

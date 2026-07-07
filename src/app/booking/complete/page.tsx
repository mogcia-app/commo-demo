import Link from "next/link";

export default function BookingCompletePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <section className="rounded-md bg-white p-6 text-center shadow-soft">
        <p className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl font-bold text-emerald-700">
          OK
        </p>
        <h1 className="mt-5 text-2xl font-bold text-commo-ink">予約が完了しました</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          予約を受け付けました。LINEに予約確認メッセージを送信します。
        </p>
        <Link
          href="/booking"
          className="mt-6 inline-flex rounded-md bg-commo-main px-5 py-3 text-sm font-semibold text-white transition hover:bg-commo-hover"
        >
          予約サイトへ戻る
        </Link>
      </section>
    </main>
  );
}

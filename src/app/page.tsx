import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-10">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-commo-main">LINE予約サービス デモ</p>
        <h1 className="mt-4 text-5xl font-bold tracking-normal text-commo-ink">commo.</h1>
        <p className="mt-5 text-lg leading-8 text-slate-700">
          公式LINEのリッチメニューから開くLIFF予約、Firebase保存、LINE通知、店舗管理画面までを確認できるデモです。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/demo"
            className="rounded-md bg-commo-main px-5 py-3 text-sm font-semibold text-white transition hover:bg-commo-hover"
          >
            業種別デモを開く
          </Link>
          <Link
            href="/reserve"
            className="rounded-md border border-purple-100 bg-white px-5 py-3 text-sm font-semibold text-commo-hover transition hover:border-commo-main"
          >
            美容室デモ
          </Link>
          <Link
            href="/admin/login"
            className="rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-commo-ink transition hover:border-commo-main"
          >
            管理画面へ
          </Link>
        </div>
      </div>
    </main>
  );
}

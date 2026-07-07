import Link from "next/link";
import { AnalyticsEventLogger } from "@/components/storefront/analytics-event-logger";
import { ThemeProvider } from "@/components/storefront/theme-provider";
import { getCouponsForStore, requireStoreBySlug } from "@/lib/storefront/store-service";

export default async function MyPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ campaignId?: string; couponId?: string }>;
}) {
  const { storeSlug } = await params;
  const { campaignId, couponId } = await searchParams;
  const store = await requireStoreBySlug(storeSlug);
  const coupons = await getCouponsForStore(store.id);

  return (
    <ThemeProvider theme={store.theme}>
      <AnalyticsEventLogger
        storeSlug={store.slug}
        eventType="mypage_view"
        campaignId={campaignId}
        couponId={couponId}
      />
      {couponId ? (
        <AnalyticsEventLogger
          storeSlug={store.slug}
          eventType="coupon_open"
          source="line"
          campaignId={campaignId}
          couponId={couponId}
        />
      ) : null}
      <main className="mx-auto min-h-screen max-w-3xl px-4 py-6">
        <Link href={`/${store.slug}`} className="text-sm font-bold" style={{ color: "var(--store-primary)" }}>
          {store.name}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">マイページ</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--store-muted)" }}>
          LINE userId と customers サブコレクションを紐付ける前提の仮画面です。
        </p>

        <section className="mt-6 grid gap-4">
          <article className="rounded-[var(--store-radius)] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold" style={{ color: "var(--store-primary)" }}>
              次回予約
            </p>
            <h2 className="mt-2 text-xl font-bold">2026-07-06 10:00</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--store-muted)" }}>
              仮データです。後から customers/{`{customerId}`}/reservations へ接続します。
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href={`/${store.slug}/reserve`}
                className="rounded-[var(--store-radius)] px-4 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: "var(--store-primary)" }}
              >
                予約変更
              </Link>
              <button className="rounded-[var(--store-radius)] border border-slate-200 px-4 py-2 text-sm font-bold">
                キャンセル
              </button>
            </div>
          </article>

          {store.modules.showCoupons ? (
            <article className="rounded-[var(--store-radius)] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">クーポン</h2>
              <div className="mt-3 grid gap-3">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="rounded-[var(--store-radius)] border border-slate-200 p-4">
                    <p className="font-bold">{coupon.title}</p>
                    <p className="mt-1 text-sm" style={{ color: "var(--store-muted)" }}>
                      {coupon.description}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {store.modules.showMemberCard ? (
            <article className="rounded-[var(--store-radius)] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold">会員情報</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--store-muted)" }}>
                LINE認証後に displayName / pictureUrl / phone を表示します。
              </p>
            </article>
          ) : null}
        </section>
      </main>
    </ThemeProvider>
  );
}

import Link from "next/link";
import { ThemeProvider } from "@/components/storefront/theme-provider";
import { requireStoreBySlug } from "@/lib/storefront/store-service";

export default async function CompletePage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ reservationId?: string; campaignId?: string; couponId?: string }>;
}) {
  const { storeSlug } = await params;
  const { reservationId, campaignId, couponId } = await searchParams;
  const store = await requireStoreBySlug(storeSlug);
  const myPageParams = new URLSearchParams();

  if (campaignId) {
    myPageParams.set("campaignId", campaignId);
  }

  if (couponId) {
    myPageParams.set("couponId", couponId);
  }

  const myPageHref = myPageParams.size ? `/${store.slug}/mypage?${myPageParams.toString()}` : `/${store.slug}/mypage`;

  return (
    <ThemeProvider theme={store.theme}>
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
        <section className="rounded-[var(--store-radius)] bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-bold" style={{ color: "var(--store-primary)" }}>
            Reservation complete
          </p>
          <h1 className="mt-2 text-3xl font-bold">予約が完了しました</h1>
          <p className="mt-4 text-sm leading-6" style={{ color: "var(--store-muted)" }}>
            {store.reservationSettings.completionMessage}
          </p>
          <div className="mt-5 rounded-[var(--store-radius)] bg-slate-50 p-4 text-left text-sm">
            <p className="font-bold">予約ID</p>
            <p className="mt-1" style={{ color: "var(--store-muted)" }}>
              {reservationId ?? "demo-reservation"}
            </p>
          </div>
          <div className="mt-6 grid gap-3">
            <Link
              href={`/${store.slug}`}
              className="rounded-[var(--store-radius)] px-4 py-3 text-sm font-bold text-white"
              style={{ backgroundColor: "var(--store-primary)" }}
            >
              ホームへ戻る
            </Link>
            <Link href={myPageHref} className="text-sm font-bold" style={{ color: "var(--store-primary)" }}>
              マイページを見る
            </Link>
          </div>
        </section>
      </main>
    </ThemeProvider>
  );
}

import Link from "next/link";
import { getStorefrontTemplate } from "./template-provider";
import { ThemeProvider } from "./theme-provider";
import type { Coupon, Menu, Staff, Store } from "@/lib/storefront/types";

export function StorefrontRenderer({
  store,
  menus,
  coupons,
  staff,
}: {
  store: Store;
  menus: Menu[];
  coupons: Coupon[];
  staff: Staff[];
}) {
  const Template = getStorefrontTemplate(store.layout.customTemplateKey ?? store.layout.storefront);

  return (
    <ThemeProvider theme={store.theme}>
      <Template
        store={store}
        menus={menus}
        coupons={coupons}
        staff={staff}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${store.slug}/reserve`}
              className="rounded-[var(--store-radius)] px-5 py-3 text-sm font-bold text-white"
              style={{ backgroundColor: "var(--store-primary)" }}
            >
              予約する
            </Link>
            <a
              href={store.lineSettings.friendUrl}
              className="rounded-[var(--store-radius)] border px-5 py-3 text-sm font-bold"
              style={{ borderColor: "var(--store-primary)", color: "var(--store-primary)" }}
            >
              LINE追加
            </a>
          </div>
        }
      />
    </ThemeProvider>
  );
}

import type { ReactNode } from "react";
import type { BusinessHours, Coupon, Menu, Staff, Store } from "@/lib/storefront/types";

export function StoreHero({ store, actions }: { store: Store; actions: ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: store.theme.heroImage ? `url(${store.theme.heroImage})` : undefined,
          backgroundColor: "var(--store-primary)",
        }}
      >
        <div className="absolute inset-0 bg-black/35" />
      </div>
      <div className="relative mx-auto flex min-h-[520px] max-w-6xl flex-col justify-end px-5 pb-10 pt-24 text-white">
        {store.theme.logoUrl ? (
          <span
            aria-label={store.name}
            className="mb-4 block h-12 w-40 bg-contain bg-left bg-no-repeat"
            style={{ backgroundImage: `url(${store.theme.logoUrl})` }}
          />
        ) : null}
        <p className="text-sm font-bold uppercase tracking-[0.18em]">{store.industry}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">{store.name}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/90">{store.description}</p>
        <div className="mt-7">{actions}</div>
      </div>
    </section>
  );
}

export function StoreHeader({ store }: { store: Store }) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <a href={`/${store.slug}`} className="font-bold" style={{ color: "var(--store-text)" }}>
          {store.name}
        </a>
        <nav className="flex items-center gap-4 text-sm font-semibold" style={{ color: "var(--store-muted)" }}>
          <a href={`/${store.slug}/reserve`}>予約</a>
          <a href={`/${store.slug}/mypage`}>マイページ</a>
        </nav>
      </div>
    </header>
  );
}

export function MenuList({ menus }: { menus: Menu[] }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <SectionTitle eyebrow="Menu" title="メニュー" />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {menus.map((menu) => (
          <article key={menu.id} className="rounded-[var(--store-radius)] bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-[128px_1fr]">
              {menu.imageUrl ? (
                <span
                  aria-label={menu.name}
                  className="block aspect-[4/3] rounded-[var(--store-radius)] bg-cover bg-center"
                  style={{ backgroundImage: `url(${menu.imageUrl})` }}
                />
              ) : null}
              <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0">
                <p className="text-xs font-bold uppercase" style={{ color: "var(--store-primary)" }}>
                  {menu.category}
                </p>
                <h3 className="mt-1 text-lg font-bold">{menu.name}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--store-muted)" }}>
                  {menu.description}
                </p>
              </div>
                {menu.priceLabel ? <p className="shrink-0 text-sm font-bold">{menu.priceLabel}</p> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CouponList({ coupons }: { coupons: Coupon[] }) {
  if (!coupons.length) {
    return null;
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-8">
      <SectionTitle eyebrow="Campaign" title="クーポン" />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {coupons.map((coupon) => (
          <article
            key={coupon.id}
            className="rounded-[var(--store-radius)] border bg-white p-5"
            style={{ borderColor: "var(--store-secondary)" }}
          >
            <h3 className="font-bold">{coupon.title}</h3>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--store-muted)" }}>
              {coupon.description}
            </p>
            <p className="mt-3 text-xs font-semibold" style={{ color: "var(--store-primary)" }}>
              {coupon.expiresAt} まで
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function StaffList({ staff }: { staff: Staff[] }) {
  if (!staff.length) {
    return null;
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-8">
      <SectionTitle eyebrow="Staff" title="スタッフ" />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {staff.map((member) => (
          <article key={member.id} className="rounded-[var(--store-radius)] bg-white p-5 shadow-sm">
            {member.imageUrl ? (
              <span
                aria-label={member.name}
                className="mb-4 block aspect-[4/3] rounded-[var(--store-radius)] bg-cover bg-center"
                style={{ backgroundImage: `url(${member.imageUrl})` }}
              />
            ) : null}
            <p className="text-sm font-bold" style={{ color: "var(--store-primary)" }}>
              {member.role}
            </p>
            <h3 className="mt-1 text-lg font-bold">{member.name}</h3>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--store-muted)" }}>
              {member.profile}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AccessSection({ store }: { store: Store }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="rounded-[var(--store-radius)] bg-white p-5 shadow-sm">
          <SectionTitle eyebrow="Access" title="アクセス" />
          <p className="mt-4 font-semibold">{store.address}</p>
          <p className="mt-2 text-sm" style={{ color: "var(--store-muted)" }}>
            {store.access}
          </p>
          <p className="mt-4 text-sm font-semibold">{store.phone}</p>
        </div>
        <BusinessHoursList businessHours={store.businessHours} />
      </div>
    </section>
  );
}

function BusinessHoursList({ businessHours }: { businessHours: BusinessHours[] }) {
  return (
    <div className="rounded-[var(--store-radius)] bg-white p-5 shadow-sm">
      <SectionTitle eyebrow="Hours" title="営業時間" />
      <div className="mt-4 space-y-3">
        {businessHours.map((item) => (
          <div key={`${item.label}-${item.days}`} className="flex items-center justify-between gap-4 text-sm">
            <div>
              <p className="font-bold">{item.label}</p>
              <p style={{ color: "var(--store-muted)" }}>{item.days}</p>
            </div>
            <p className="font-semibold">{item.hours}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--store-primary)" }}>
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-bold">{title}</h2>
    </div>
  );
}

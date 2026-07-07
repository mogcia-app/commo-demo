import { Calendar } from "./reservation-form-parts";
import { ReservationForm } from "./reservation-form";
import { ThemeProvider } from "./theme-provider";
import type { AvailableSlot, Menu, Question, Staff, Store } from "@/lib/storefront/types";

export function ReserveRenderer({
  store,
  menus,
  staff,
  questions,
  availableSlots,
  attribution,
}: {
  store: Store;
  menus: Menu[];
  staff: Staff[];
  questions: Question[];
  availableSlots: AvailableSlot[];
  attribution?: {
    campaignId?: string;
    couponId?: string;
  };
}) {
  return (
    <ThemeProvider theme={store.theme}>
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6">
        <div className="mb-5">
          <a href={`/${store.slug}`} className="text-sm font-bold" style={{ color: "var(--store-primary)" }}>
            {store.name}
          </a>
          <h1 className="mt-2 text-3xl font-bold">予約</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--store-muted)" }}>
            {store.layout.reserve} の予約フローで表示しています。
          </p>
        </div>
        {store.modules.showCalendar ? <Calendar availableSlots={availableSlots} compact /> : null}
        <ReservationForm
          store={store}
          menus={menus}
          staff={staff}
          questions={questions}
          availableSlots={availableSlots}
          attribution={attribution}
        />
      </main>
    </ThemeProvider>
  );
}

import { ReserveRenderer } from "@/components/storefront/reserve-renderer";
import {
  getAvailableSlotsForStore,
  getMenusForStore,
  getQuestionsForStore,
  getStaffForStore,
  requireStoreBySlug,
} from "@/lib/storefront/store-service";

export default async function ReservePage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ campaignId?: string; couponId?: string }>;
}) {
  const { storeSlug } = await params;
  const { campaignId, couponId } = await searchParams;
  const store = await requireStoreBySlug(storeSlug);
  const [menus, staff, questions, availableSlots] = await Promise.all([
    getMenusForStore(store.id),
    getStaffForStore(store.id),
    getQuestionsForStore(store.id),
    getAvailableSlotsForStore(store.id),
  ]);

  return (
    <ReserveRenderer
      store={store}
      menus={menus}
      staff={staff}
      questions={questions}
      availableSlots={availableSlots}
      attribution={{
        campaignId,
        couponId,
      }}
    />
  );
}

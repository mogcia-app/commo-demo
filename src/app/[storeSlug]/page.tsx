import { StorefrontRenderer } from "@/components/storefront/storefront-renderer";
import { getCouponsForStore, getMenusForStore, getStaffForStore, requireStoreBySlug } from "@/lib/storefront/store-service";

export default async function StorefrontPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await requireStoreBySlug(storeSlug);
  const [menus, coupons, staff] = await Promise.all([
    getMenusForStore(store.id),
    getCouponsForStore(store.id),
    getStaffForStore(store.id),
  ]);

  return <StorefrontRenderer store={store} menus={menus} coupons={coupons} staff={staff} />;
}

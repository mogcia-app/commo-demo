import type { StorefrontTemplateProps } from "../template-provider";
import { AccessSection, CouponList, MenuList, StoreHeader, StoreHero } from "../storefront-sections";

export function HotelTemplate({ store, menus, coupons, actions }: StorefrontTemplateProps) {
  return (
    <>
      <StoreHeader store={store} />
      <StoreHero store={store} actions={actions} />
      <MenuList menus={menus} />
      {store.modules.showCoupons ? <CouponList coupons={coupons} /> : null}
      <AccessSection store={store} />
    </>
  );
}

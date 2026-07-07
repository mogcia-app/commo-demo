import type { StorefrontTemplateProps } from "../template-provider";
import { AccessSection, CouponList, MenuList, StaffList, StoreHeader, StoreHero } from "../storefront-sections";

export function GolfTemplate({ store, menus, coupons, staff, actions }: StorefrontTemplateProps) {
  return (
    <>
      <StoreHeader store={store} />
      <StoreHero store={store} actions={actions} />
      <MenuList menus={menus} />
      {store.modules.showStaffSelect ? <StaffList staff={staff} /> : null}
      {store.modules.showCoupons ? <CouponList coupons={coupons} /> : null}
      <AccessSection store={store} />
    </>
  );
}

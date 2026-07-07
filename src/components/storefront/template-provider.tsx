import type { ComponentType, ReactNode } from "react";
import type { Coupon, Menu, Staff, Store } from "@/lib/storefront/types";
import { ClinicTemplate } from "./templates/clinic-template";
import { GolfTemplate } from "./templates/golf-template";
import { HotelTemplate } from "./templates/hotel-template";
import { RestaurantTemplate } from "./templates/restaurant-template";
import { SalonTemplate } from "./templates/salon-template";

export type StorefrontTemplateProps = {
  store: Store;
  menus: Menu[];
  coupons: Coupon[];
  staff: Staff[];
  actions: ReactNode;
};

export const storefrontTemplates: Record<string, ComponentType<StorefrontTemplateProps>> = {
  hotel_standard: HotelTemplate,
  salon_standard: SalonTemplate,
  restaurant_standard: RestaurantTemplate,
  golf_standard: GolfTemplate,
  clinic_standard: ClinicTemplate,
};

export function getStorefrontTemplate(key: string) {
  return storefrontTemplates[key] ?? SalonTemplate;
}

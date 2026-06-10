import type { ReservationStatus } from "./constants";
import type { IndustryType } from "./reservation-demos";

export type Customer = {
  id: string;
  shopId: string;
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl: string;
  name: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

export type Reservation = {
  id: string;
  shopId: string;
  customerId: string;
  industryType: IndustryType;
  industryLabel?: string;
  lineUserId: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  menuName: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  fields?: Record<string, string>;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
};

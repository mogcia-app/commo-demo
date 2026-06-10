import type { ReservationStatus } from "./constants";
import type { IndustryType } from "./reservation-demos";
import type { TemplateType } from "./reservation-templates";

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
  templateType?: TemplateType | null;
  templateLabel?: string | null;
  lineUserId: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  menuName: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  fields?: Record<string, string>;
  reservationDetails?: Record<string, string>;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
};

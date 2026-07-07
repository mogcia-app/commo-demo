import type { ReservationStatus } from "./constants";

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
  industryType?: string;
  industryLabel?: string;
  templateType?: string | null;
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

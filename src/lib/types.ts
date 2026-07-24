import type { ReservationStatus } from "./constants";

export type IndustryType = "golf_course" | "hotel" | "restaurant" | "beauty_salon" | "other";

export type OrganizationLineSettings = {
  industryType: IndustryType;
  enabledModules: {
    surveys: boolean;
    segments: boolean;
    broadcasts: boolean;
    stepMessages: boolean;
    analytics: boolean;
    aiSuggestions: boolean;
  };
};

export type Organization = {
  id: string;
  name: string;
  lineSettings: OrganizationLineSettings;
};

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

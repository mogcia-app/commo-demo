export const SHOP_ID = "demo-shop";

export const STATUS_LABELS = {
  reserved: "予約済み",
  confirmed: "確定",
  canceled: "キャンセル",
} as const;

export type ReservationStatus = keyof typeof STATUS_LABELS;

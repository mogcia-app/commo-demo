export type BookingSite = {
  slug: string;
  title: string;
  description: string;
};

export const bookingSites = {
  calendar: {
    slug: "calendar",
    title: "カレンダー予約",
    description: "日付と時間を選ぶ予約導線",
  },
  "hotel-search": {
    slug: "hotel-search",
    title: "宿泊予約",
    description: "宿泊検索から空室選択までの予約導線",
  },
  "golf-start": {
    slug: "golf-start",
    title: "ゴルフ予約",
    description: "スタート時間を軸にしたゴルフ予約導線",
  },
} as const satisfies Record<string, BookingSite>;

export type BookingSiteSlug = keyof typeof bookingSites;

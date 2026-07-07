import { reservationTemplateConfigs, type TemplateType } from "./reservation-templates";

export type BookingSite = {
  slug: string;
  templateType: TemplateType;
  title: string;
  description: string;
};

export const bookingSites = [
  {
    slug: "calendar",
    templateType: "calendar",
    title: "カレンダー型予約サイト",
    description: "日付から始める定番の予約導線",
  },
  {
    slug: "hotel-search",
    templateType: "hotel-search",
    title: "ホテル検索型予約サイト",
    description: "宿泊検索から空室選択までの流れ",
  },
  {
    slug: "golf-start",
    templateType: "golf-start",
    title: "ゴルフ場予約サイト",
    description: "スタート時間を軸にしたゴルフ予約",
  },
] as const satisfies readonly BookingSite[];

const bookingSiteBySlug: Map<string, BookingSite> = new Map(bookingSites.map((site) => [site.slug, site]));

export function getBookingSiteBySlug(slug: string) {
  return bookingSiteBySlug.get(slug) ?? null;
}

export function getBookingSiteConfig(site: BookingSite) {
  return reservationTemplateConfigs[site.templateType];
}

export function getDefaultBookingSite() {
  return bookingSites[0];
}

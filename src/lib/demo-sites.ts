import { reservationTemplateConfigs, type TemplateType } from "./reservation-templates";

export type DemoSite = {
  slug: string;
  templateType: TemplateType;
  title: string;
  description: string;
};

export const demoSites = [
  {
    slug: "calendar",
    templateType: "calendar",
    title: "カレンダー型予約サイト",
    description: "日付から始める定番の予約導線",
  },
  {
    slug: "cards",
    templateType: "cards",
    title: "カード選択型予約サイト",
    description: "プランの魅力をカードで見せるUI",
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
] as const satisfies readonly DemoSite[];

const demoSiteBySlug: Map<string, DemoSite> = new Map(demoSites.map((site) => [site.slug, site]));

export function getDemoSiteBySlug(slug: string) {
  return demoSiteBySlug.get(slug) ?? null;
}

export function getDemoSiteConfig(site: DemoSite) {
  return reservationTemplateConfigs[site.templateType];
}

export function getDefaultDemoSite() {
  return demoSites[0];
}

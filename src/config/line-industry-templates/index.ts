import type { IndustryType } from "@/lib/types";
import { hotelLineTemplate } from "./hotel";
import type { IndustryLineTemplate } from "./types";

const otherLineTemplate: IndustryLineTemplate = {
  ...hotelLineTemplate,
  industryType: "other",
  dashboardLabels: {
    ...hotelLineTemplate.dashboardLabels,
    industryLabel: "その他",
    assistMetrics: ["限定プラン関心層", "高反応ユーザー", "アンケート未回答", "90日間反応なし"],
  },
  aiPromptContext: "業種固有の来店、予約完了、売上を断定せず、LINE内のクリック、アンケート回答、リッチメニュー選択、配信反応だけを根拠に提案する。",
};

export const industryLineTemplates: Record<IndustryType, IndustryLineTemplate> = {
  golf_course: hotelLineTemplate,
  hotel: hotelLineTemplate,
  restaurant: otherLineTemplate,
  beauty_salon: otherLineTemplate,
  other: otherLineTemplate,
};

export function getIndustryLineTemplate(industryType: IndustryType | null | undefined) {
  return industryLineTemplates[industryType ?? "hotel"] ?? hotelLineTemplate;
}

export type { IndustryLineTemplate } from "./types";

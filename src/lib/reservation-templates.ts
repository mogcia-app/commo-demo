import { toDateInputValue } from "./date";
import type { IndustryType, ReservationField, ReservationStep, ReservationSummaryConfig } from "./reservation-demos";

export const TEMPLATE_TYPES = ["calendar", "slots", "hotel-search", "golf-start", "chat"] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export type ReservationTemplateConfig = ReservationSummaryConfig & {
  templateType: TemplateType;
  templateLabel: string;
  industryType: IndustryType;
  industryLabel: string;
  title: string;
  lead: string;
  accent: string;
  softAccent: string;
  imagePlaceholder: string;
  fields: ReservationField[];
  defaults: Record<string, string>;
  steps: ReservationStep[];
};

const today = toDateInputValue();
const tomorrow = offsetDate(1);
const dayAfterTomorrow = offsetDate(2);
const threeDaysLater = offsetDate(3);

export const reservationTemplateConfigs: Record<TemplateType, ReservationTemplateConfig> = {
  calendar: {
    templateType: "calendar",
    templateLabel: "カレンダー型",
    industryType: "salon",
    industryLabel: "サロン・整体・クリニック向け",
    title: "カレンダー型予約",
    lead: "日付をカレンダーのように選び、その日の時間枠へ進む予約UIです。",
    accent: "#A66BE8",
    softAccent: "#F4EEFD",
    imagePlaceholder: "月間カレンダー・空き枠プレビュー",
    defaults: {
      date: tomorrow,
      time: "10:00",
      menu: "初回カウンセリング",
      name: "",
      phone: "",
    },
    primary: { date: "date", time: "time", plan: "menu", name: "name", phone: "phone" },
    steps: [
      { title: "日付", lead: "希望日をカレンダーから選びます。", fieldKeys: ["date"] },
      { title: "時間", lead: "選択日の空き時間を選びます。", fieldKeys: ["time"] },
      { title: "メニュー", lead: "予約したいメニューを選択します。", fieldKeys: ["menu"] },
      { title: "お客様情報", lead: "連絡先を入力します。", fieldKeys: ["name", "phone"] },
      { title: "確認", lead: "内容を確認して予約を確定します。", fieldKeys: [] },
      { title: "完了", lead: "予約完了後、LINEに確認メッセージを送信します。", fieldKeys: [] },
    ],
    fields: [
      {
        key: "date",
        label: "日付",
        type: "select",
        required: true,
        options: [today, tomorrow, dayAfterTomorrow, threeDaysLater],
        optionDescriptions: {
          [today]: "本日。残りわずか",
          [tomorrow]: "午前・午後とも予約しやすい日",
          [dayAfterTomorrow]: "夕方に余裕あり",
          [threeDaysLater]: "終日選びやすい日",
        },
      },
      { key: "time", label: "時間", type: "select", required: true, options: ["10:00", "11:30", "14:00", "16:30"] },
      { key: "menu", label: "メニュー", type: "select", required: true, options: ["初回カウンセリング", "施術60分", "施術90分"] },
      { key: "name", label: "お名前", type: "text", required: true, placeholder: "山田 花子" },
      { key: "phone", label: "電話番号", type: "tel", required: true, placeholder: "09012345678" },
    ],
  },
  slots: {
    templateType: "slots",
    templateLabel: "空き枠型",
    industryType: "salon",
    industryLabel: "美容室・整体・病院向け",
    title: "空き枠型予約",
    lead: "○ △ × の空き状況を見ながら、時間枠カードを選ぶ予約UIです。",
    accent: "#9257D9",
    softAccent: "#F4EEFD",
    imagePlaceholder: "日別の空き枠カード一覧",
    defaults: {
      slot: `${tomorrow} 10:00 ○`,
      menu: "カット",
      name: "",
      phone: "",
    },
    primary: { date: "slot", plan: "menu", name: "name", phone: "phone" },
    steps: [
      { title: "時間枠", lead: "空き状況を見て枠を選びます。", fieldKeys: ["slot"] },
      { title: "メニュー", lead: "希望メニューを選びます。", fieldKeys: ["menu"] },
      { title: "お客様情報", lead: "予約に必要な連絡先を入力します。", fieldKeys: ["name", "phone"] },
      { title: "確認", lead: "内容を確認して予約を確定します。", fieldKeys: [] },
      { title: "完了", lead: "予約完了後、LINEに確認メッセージを送信します。", fieldKeys: [] },
    ],
    fields: [
      {
        key: "slot",
        label: "空き枠",
        type: "select",
        required: true,
        options: [`${tomorrow} 10:00 ○`, `${tomorrow} 13:00 △`, `${tomorrow} 16:00 ×`, `${dayAfterTomorrow} 11:00 ○`],
        optionDescriptions: {
          [`${tomorrow} 10:00 ○`]: "すぐ予約できます",
          [`${tomorrow} 13:00 △`]: "残りわずか",
          [`${tomorrow} 16:00 ×`]: "満席表示のサンプル",
          [`${dayAfterTomorrow} 11:00 ○`]: "余裕あり",
        },
      },
      { key: "menu", label: "メニュー", type: "select", required: true, options: ["カット", "整体60分", "診察予約"] },
      { key: "name", label: "お名前", type: "text", required: true, placeholder: "山田 花子" },
      { key: "phone", label: "電話番号", type: "tel", required: true, placeholder: "09012345678" },
    ],
  },
  "hotel-search": {
    templateType: "hotel-search",
    templateLabel: "ホテル検索型",
    industryType: "hotel",
    industryLabel: "ホテル・旅館向け",
    title: "ホテル検索型予約",
    lead: "チェックイン・チェックアウト・人数で検索して、空室一覧から客室を選ぶUIです。",
    accent: "#6B7FD7",
    softAccent: "#EEF1FF",
    imagePlaceholder: "空室検索結果・客室写真プレースホルダー",
    defaults: {
      checkIn: tomorrow,
      checkOut: dayAfterTomorrow,
      guests: "2名",
      room: "ツインルーム",
      plan: "朝食付き",
      name: "",
      phone: "",
    },
    primary: { date: "checkIn", time: "checkOut", plan: "room", name: "name", phone: "phone" },
    steps: [
      { title: "検索条件", lead: "チェックイン、チェックアウト、人数を入力します。", fieldKeys: ["checkIn", "checkOut", "guests"] },
      { title: "空室一覧", lead: "条件に合う空室から選択します。", fieldKeys: ["room", "plan"] },
      { title: "お客様情報", lead: "代表者情報を入力します。", fieldKeys: ["name", "phone"] },
      { title: "確認", lead: "内容を確認して予約を確定します。", fieldKeys: [] },
      { title: "完了", lead: "予約完了後、LINEに確認メッセージを送信します。", fieldKeys: [] },
    ],
    fields: [
      { key: "checkIn", label: "チェックイン", type: "date", required: true, min: today },
      { key: "checkOut", label: "チェックアウト", type: "date", required: true, min: today },
      { key: "guests", label: "人数", type: "select", required: true, options: ["1名", "2名", "3名", "4名"] },
      {
        key: "room",
        label: "客室",
        type: "select",
        required: true,
        options: ["シングルルーム", "ツインルーム", "和室", "スイートルーム"],
      },
      { key: "plan", label: "プラン", type: "select", required: true, options: ["素泊まり", "朝食付き", "2食付き"] },
      { key: "name", label: "お名前", type: "text", required: true, placeholder: "山田 花子" },
      { key: "phone", label: "電話番号", type: "tel", required: true, placeholder: "09012345678" },
    ],
  },
  "golf-start": {
    templateType: "golf-start",
    templateLabel: "ゴルフ場スタート時間型",
    industryType: "golf",
    industryLabel: "ゴルフ場向け",
    title: "ゴルフ場スタート時間型予約",
    lead: "来場日とスタート時間を軸に、ゴルフ場予約に必要な項目を順番に選ぶUIです。",
    accent: "#3E9B6D",
    softAccent: "#EAF7F0",
    imagePlaceholder: "スタート時間表・コース写真プレースホルダー",
    defaults: {
      visitDate: tomorrow,
      startTime: "8:24",
      guests: "4名",
      plan: "平日セルフ",
      competition: "なし",
      name: "",
      phone: "",
    },
    primary: { date: "visitDate", time: "startTime", plan: "plan", name: "name", phone: "phone" },
    steps: [
      { title: "来場日", lead: "プレー日を選択します。", fieldKeys: ["visitDate"] },
      { title: "スタート時間", lead: "空いているスタート枠を選択します。", fieldKeys: ["startTime"] },
      { title: "人数", lead: "プレー人数を選択します。", fieldKeys: ["guests"] },
      { title: "プラン", lead: "プランとコンペ利用有無を選びます。", fieldKeys: ["plan", "competition"] },
      { title: "代表者情報", lead: "代表者の連絡先を入力します。", fieldKeys: ["name", "phone"] },
      { title: "確認", lead: "内容を確認して予約を確定します。", fieldKeys: [] },
      { title: "完了", lead: "予約完了後、LINEに確認メッセージを送信します。", fieldKeys: [] },
    ],
    fields: [
      { key: "visitDate", label: "来場日", type: "date", required: true, min: today },
      { key: "startTime", label: "スタート時間", type: "select", required: true, options: ["7:32", "8:24", "9:16", "10:08"] },
      { key: "guests", label: "人数", type: "select", required: true, options: ["2名", "3名", "4名"] },
      { key: "plan", label: "プラン", type: "select", required: true, options: ["平日セルフ", "土日祝セルフ", "キャディ付き", "コンペプラン"] },
      { key: "competition", label: "コンペ利用有無", type: "select", required: true, options: ["なし", "あり"] },
      { key: "name", label: "代表者名", type: "text", required: true, placeholder: "山田 太郎" },
      { key: "phone", label: "電話番号", type: "tel", required: true, placeholder: "09012345678" },
    ],
  },
  chat: {
    templateType: "chat",
    templateLabel: "LINEチャット風予約型",
    industryType: "salon",
    industryLabel: "LINE接客向け",
    title: "LINEチャット風予約",
    lead: "質問に答えていく感覚で予約できる、LINE内で自然なチャットUIです。",
    accent: "#06C755",
    softAccent: "#ECFDF3",
    imagePlaceholder: "LINEチャット画面プレースホルダー",
    defaults: {
      date: tomorrow,
      guests: "2名",
      plan: "スタンダードプラン",
      name: "",
      phone: "",
    },
    primary: { date: "date", plan: "plan", name: "name", phone: "phone" },
    steps: [
      { title: "ご希望日はいつですか？", lead: "チャットに答えるように希望日を選択します。", fieldKeys: ["date"] },
      { title: "人数を選択してください", lead: "利用人数を選択します。", fieldKeys: ["guests"] },
      { title: "プランを選択してください", lead: "希望するプランを選択します。", fieldKeys: ["plan"] },
      { title: "お客様情報", lead: "最後に連絡先を入力します。", fieldKeys: ["name", "phone"] },
      { title: "確認", lead: "内容を確認して予約を確定します。", fieldKeys: [] },
      { title: "完了", lead: "予約完了後、LINEに確認メッセージを送信します。", fieldKeys: [] },
    ],
    fields: [
      { key: "date", label: "希望日", type: "select", required: true, options: [today, tomorrow, dayAfterTomorrow] },
      { key: "guests", label: "人数", type: "select", required: true, options: ["1名", "2名", "3名", "4名"] },
      { key: "plan", label: "プラン", type: "select", required: true, options: ["ライトプラン", "スタンダードプラン", "プレミアムプラン"] },
      { key: "name", label: "お名前", type: "text", required: true, placeholder: "山田 花子" },
      { key: "phone", label: "電話番号", type: "tel", required: true, placeholder: "09012345678" },
    ],
  },
};

export function isTemplateType(value: string): value is TemplateType {
  return TEMPLATE_TYPES.includes(value as TemplateType);
}

export function getReservationTemplateConfig(templateType: TemplateType) {
  return reservationTemplateConfigs[templateType];
}

function offsetDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

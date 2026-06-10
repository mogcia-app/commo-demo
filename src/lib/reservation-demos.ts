import { toDateInputValue } from "./date";

export const INDUSTRY_TYPES = ["hotel", "golf", "salon"] as const;

export type IndustryType = (typeof INDUSTRY_TYPES)[number];

export type ReservationField = {
  key: string;
  label: string;
  type: "date" | "select" | "text" | "tel" | "number" | "textarea";
  placeholder?: string;
  required?: boolean;
  options?: string[];
  min?: string;
};

export type ReservationDemoConfig = {
  industryType: IndustryType;
  industryLabel: string;
  title: string;
  lead: string;
  accent: string;
  softAccent: string;
  heroNote: string;
  submitLabel: string;
  fields: ReservationField[];
  defaults: Record<string, string>;
  primary: {
    date: string;
    time?: string;
    plan: string;
    name: string;
    phone: string;
  };
};

const today = toDateInputValue();

export const reservationDemoConfigs: Record<IndustryType, ReservationDemoConfig> = {
  hotel: {
    industryType: "hotel",
    industryLabel: "ホテル・旅館",
    title: "ホテル・旅館の宿泊予約",
    lead: "宿泊日とプランを選ぶだけで、LINEからスムーズに予約できます。",
    accent: "#6B7FD7",
    softAccent: "#EEF1FF",
    heroNote: "Stay booking",
    submitLabel: "宿泊を予約する",
    defaults: {
      checkInDate: today,
      nights: "1泊",
      guests: "2名",
      roomType: "和洋室",
      plan: "朝食付きスタンダード",
      name: "",
      phone: "",
      notes: "",
    },
    primary: {
      date: "checkInDate",
      time: "nights",
      plan: "plan",
      name: "name",
      phone: "phone",
    },
    fields: [
      { key: "checkInDate", label: "宿泊日", type: "date", required: true, min: today },
      { key: "nights", label: "泊数", type: "select", required: true, options: ["1泊", "2泊", "3泊"] },
      { key: "guests", label: "人数", type: "select", required: true, options: ["1名", "2名", "3名", "4名"] },
      { key: "roomType", label: "客室タイプ", type: "select", required: true, options: ["和室", "洋室ツイン", "和洋室", "露天風呂付き客室"] },
      {
        key: "plan",
        label: "宿泊プラン",
        type: "select",
        required: true,
        options: ["素泊まり", "朝食付きスタンダード", "夕朝食付き会席", "記念日プラン"],
      },
      { key: "name", label: "名前", type: "text", required: true, placeholder: "山田 花子" },
      { key: "phone", label: "電話番号", type: "tel", required: true, placeholder: "09012345678" },
      { key: "notes", label: "備考", type: "textarea", placeholder: "到着予定時刻やアレルギーなど" },
    ],
  },
  golf: {
    industryType: "golf",
    industryLabel: "ゴルフ場",
    title: "ゴルフ場のプレー予約",
    lead: "来場日、スタート時間、人数をLINE上でまとめて受け付けます。",
    accent: "#3E9B6D",
    softAccent: "#EAF7F0",
    heroNote: "Tee time",
    submitLabel: "プレーを予約する",
    defaults: {
      visitDate: today,
      startTime: "8:24",
      guests: "4名",
      plan: "セルフプレー",
      name: "",
      phone: "",
      competition: "なし",
    },
    primary: {
      date: "visitDate",
      time: "startTime",
      plan: "plan",
      name: "name",
      phone: "phone",
    },
    fields: [
      { key: "visitDate", label: "来場日", type: "date", required: true, min: today },
      { key: "startTime", label: "スタート時間", type: "select", required: true, options: ["7:32", "8:24", "9:16", "10:08"] },
      { key: "guests", label: "人数", type: "select", required: true, options: ["2名", "3名", "4名"] },
      { key: "plan", label: "プラン", type: "select", required: true, options: ["セルフプレー", "キャディ付き", "昼食付きパック", "薄暮ハーフ"] },
      { key: "name", label: "代表者名", type: "text", required: true, placeholder: "山田 太郎" },
      { key: "phone", label: "電話番号", type: "tel", required: true, placeholder: "09012345678" },
      { key: "competition", label: "コンペ利用有無", type: "select", required: true, options: ["なし", "あり"] },
    ],
  },
  salon: {
    industryType: "salon",
    industryLabel: "美容室・サロン",
    title: "美容室・サロンの予約",
    lead: "メニューとスタッフを選んで、LINEプロフィールからかんたん予約。",
    accent: "#A66BE8",
    softAccent: "#F4EEFD",
    heroNote: "Salon booking",
    submitLabel: "サロンを予約する",
    defaults: {
      visitDate: today,
      time: "10:00",
      menu: "カット",
      staff: "指名なし",
      name: "",
      phone: "",
    },
    primary: {
      date: "visitDate",
      time: "time",
      plan: "menu",
      name: "name",
      phone: "phone",
    },
    fields: [
      { key: "visitDate", label: "来店日", type: "date", required: true, min: today },
      { key: "time", label: "時間", type: "select", required: true, options: ["10:00", "11:00", "13:00", "14:00", "15:00"] },
      { key: "menu", label: "メニュー", type: "select", required: true, options: ["カット", "カットカラー", "カラー"] },
      { key: "staff", label: "指名スタッフ", type: "select", required: true, options: ["指名なし", "Saki", "Mio", "Rena"] },
      { key: "name", label: "名前", type: "text", required: true, placeholder: "山田 花子" },
      { key: "phone", label: "電話番号", type: "tel", required: true, placeholder: "09012345678" },
    ],
  },
};

export function getReservationDemoConfig(industryType: IndustryType) {
  return reservationDemoConfigs[industryType];
}

export function isIndustryType(value: string): value is IndustryType {
  return INDUSTRY_TYPES.includes(value as IndustryType);
}

export function getFieldValue(fields: Record<string, string>, key: string) {
  return fields[key]?.trim() ?? "";
}

export function getReservationSummary(config: ReservationDemoConfig, fields: Record<string, string>) {
  const date = getFieldValue(fields, config.primary.date);
  const time = config.primary.time ? getFieldValue(fields, config.primary.time) : "";
  const plan = getFieldValue(fields, config.primary.plan);
  const name = getFieldValue(fields, config.primary.name);
  const phone = getFieldValue(fields, config.primary.phone);

  return {
    date,
    time,
    plan,
    name,
    phone,
    dateTime: [date, time].filter(Boolean).join(" "),
  };
}

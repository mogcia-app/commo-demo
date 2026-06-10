import { toDateInputValue } from "./date";

export const INDUSTRY_TYPES = ["hotel", "golf", "salon"] as const;

export type IndustryType = (typeof INDUSTRY_TYPES)[number];

export type ReservationField = {
  key: string;
  label: string;
  type: "date" | "select" | "text" | "tel" | "email" | "number" | "textarea";
  placeholder?: string;
  required?: boolean;
  options?: string[];
  optionDescriptions?: Record<string, string>;
  optionImageLabels?: Record<string, string>;
  optionMeta?: Record<string, string>;
  optionPriceLabels?: Record<string, string>;
  min?: string;
};

export type ReservationStep = {
  title: string;
  lead: string;
  fieldKeys: string[];
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
  imagePlaceholder: string;
  steps: ReservationStep[];
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

export type ReservationSummaryConfig = {
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
    imagePlaceholder: "客室・館内写真プレースホルダー",
    steps: [
      { title: "客室選択", lead: "滞在イメージに合う客室を選択します。", fieldKeys: ["roomType"] },
      { title: "宿泊日・泊数選択", lead: "チェックイン日と泊数を指定します。", fieldKeys: ["checkInDate", "nights"] },
      { title: "人数・宿泊プラン選択", lead: "ご利用人数と宿泊プランを選択します。", fieldKeys: ["guests", "plan"] },
      { title: "代表者情報入力", lead: "予約代表者の連絡先を入力します。", fieldKeys: ["name", "kana", "phone", "email", "notes"] },
      { title: "確認", lead: "予約内容を確認して送信します。", fieldKeys: [] },
      { title: "完了", lead: "予約完了後、LINEに確認メッセージを送信します。", fieldKeys: [] },
    ],
    defaults: {
      checkInDate: today,
      nights: "1泊",
      guests: "2名",
      roomType: "ツイン",
      plan: "朝食付き",
      name: "",
      kana: "",
      phone: "",
      email: "",
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
      {
        key: "roomType",
        label: "客室タイプ",
        type: "select",
        required: true,
        options: ["シングル", "ツイン", "和室", "デラックスルーム"],
        optionDescriptions: {
          シングル: "ビジネス・一人旅向け",
          ツイン: "カップル・ご夫婦におすすめ",
          和室: "家族・グループにおすすめ",
          デラックスルーム: "ゆったりとした上質な空間",
        },
        optionImageLabels: {
          シングル: "シングル客室画像",
          ツイン: "ツイン客室画像",
          和室: "和室客室画像",
          デラックスルーム: "デラックスルーム画像",
        },
        optionMeta: {
          シングル: "18㎡ / 1名利用",
          ツイン: "24㎡ / 1〜2名利用",
          和室: "10畳 / 2〜4名利用",
          デラックスルーム: "36㎡ / 1〜2名利用",
        },
        optionPriceLabels: {
          シングル: "¥8,800〜",
          ツイン: "¥13,200〜",
          和室: "¥15,400〜",
          デラックスルーム: "¥22,000〜",
        },
      },
      {
        key: "plan",
        label: "宿泊プラン",
        type: "select",
        required: true,
        options: ["素泊まり", "朝食付き", "2食付き"],
        optionDescriptions: {
          素泊まり: "予定に合わせやすいシンプルプラン",
          朝食付き: "朝食会場でゆっくり過ごせる人気プラン",
          "2食付き": "夕食と朝食を含む宿泊プラン",
        },
      },
      { key: "checkInDate", label: "宿泊日", type: "date", required: true, min: today },
      { key: "nights", label: "泊数", type: "select", required: true, options: ["1泊", "2泊", "3泊"] },
      { key: "guests", label: "人数", type: "select", required: true, options: ["1名", "2名", "3名", "4名"] },
      { key: "name", label: "名前", type: "text", required: true, placeholder: "山田 花子" },
      { key: "kana", label: "フリガナ", type: "text", required: true, placeholder: "ヤマダ ハナコ" },
      { key: "phone", label: "電話番号", type: "tel", required: true, placeholder: "09012345678" },
      { key: "email", label: "メールアドレス", type: "email", required: true, placeholder: "hanako.yamada@example.com" },
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
    imagePlaceholder: "コース・クラブハウス写真プレースホルダー",
    steps: [
      { title: "来場日・スタート時間選択", lead: "プレー予定日と希望のスタート時間を選択します。", fieldKeys: ["visitDate", "startTime"] },
      { title: "人数選択", lead: "プレー人数を選択します。", fieldKeys: ["guests"] },
      { title: "プラン選択", lead: "プレー内容とコンペ利用を選択します。", fieldKeys: ["plan", "competition"] },
      { title: "代表者情報入力", lead: "代表者の連絡先を入力します。", fieldKeys: ["name", "phone"] },
      { title: "確認", lead: "予約内容を確認して送信します。", fieldKeys: [] },
      { title: "完了", lead: "予約完了後、LINEに確認メッセージを送信します。", fieldKeys: [] },
    ],
    defaults: {
      visitDate: today,
      startTime: "8:24",
      guests: "4名",
      plan: "平日セルフ",
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
      {
        key: "plan",
        label: "プラン",
        type: "select",
        required: true,
        options: ["平日セルフ", "土日祝セルフ", "キャディ付き", "コンペプラン"],
        optionDescriptions: {
          平日セルフ: "気軽に回れる平日限定プラン",
          土日祝セルフ: "週末の定番セルフプレー",
          キャディ付き: "コース案内付きで安心",
          コンペプラン: "複数組での利用におすすめ",
        },
        optionImageLabels: {
          平日セルフ: "フェアウェイ画像",
          土日祝セルフ: "クラブハウス画像",
          キャディ付き: "コース案内画像",
          コンペプラン: "コンペ会場画像",
        },
        optionMeta: {
          平日セルフ: "昼食別 / 2サム可",
          土日祝セルフ: "週末人気枠",
          キャディ付き: "初めての方にも安心",
          コンペプラン: "3組以上におすすめ",
        },
        optionPriceLabels: {
          平日セルフ: "¥8,500 / 人",
          土日祝セルフ: "¥13,500 / 人",
          キャディ付き: "¥16,800 / 人",
          コンペプラン: "¥9,500 / 人",
        },
      },
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
    imagePlaceholder: "スタイル・店内写真プレースホルダー",
    steps: [
      { title: "メニュー選択", lead: "希望する施術メニューを選択します。", fieldKeys: ["menu"] },
      { title: "スタッフ選択", lead: "指名スタッフを選択します。", fieldKeys: ["staff"] },
      { title: "来店日・時間選択", lead: "来店日と時間を選択します。", fieldKeys: ["visitDate", "time"] },
      { title: "お客様情報入力", lead: "予約に必要な連絡先を入力します。", fieldKeys: ["name", "phone"] },
      { title: "確認", lead: "予約内容を確認して送信します。", fieldKeys: [] },
      { title: "完了", lead: "予約完了後、LINEに確認メッセージを送信します。", fieldKeys: [] },
    ],
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
      {
        key: "menu",
        label: "メニュー",
        type: "select",
        required: true,
        options: ["カット", "カットカラー", "カラー", "トリートメント"],
        optionDescriptions: {
          カット: "骨格に合わせたベーシックメニュー",
          カットカラー: "印象を変えたい方におすすめ",
          カラー: "リタッチや全体カラーに対応",
          トリートメント: "髪質ケアを重視したメニュー",
        },
        optionImageLabels: {
          カット: "カット仕上がり画像",
          カットカラー: "カラー施術画像",
          カラー: "ヘアカラー画像",
          トリートメント: "ヘアケア画像",
        },
        optionMeta: {
          カット: "60分",
          カットカラー: "120分",
          カラー: "90分",
          トリートメント: "45分",
        },
        optionPriceLabels: {
          カット: "¥4,400",
          カットカラー: "¥9,900",
          カラー: "¥7,700",
          トリートメント: "¥5,500",
        },
      },
      {
        key: "staff",
        label: "指名スタッフ",
        type: "select",
        required: true,
        options: ["指名なし", "Saki", "Mio", "Rena"],
        optionDescriptions: {
          指名なし: "最短でご案内できるスタッフ",
          Saki: "透明感カラーが得意",
          Mio: "ショート・ボブが得意",
          Rena: "髪質改善ケアが得意",
        },
        optionImageLabels: {
          指名なし: "スタッフ自動選択",
          Saki: "スタッフ写真 Saki",
          Mio: "スタッフ写真 Mio",
          Rena: "スタッフ写真 Rena",
        },
      },
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

export function getReservationSummary(config: ReservationSummaryConfig, fields: Record<string, string>) {
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

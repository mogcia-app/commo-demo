export type GolfCourse = {
  id: string;
  name: string;
  area: string;
  rating: string;
  reviews: string;
  priceFrom: number;
  features: string[];
  imageLabel: string;
};

export type GolfPlan = {
  id: string;
  name: string;
  pricePerPerson: number;
  description: string;
  labels: string[];
};

export type GolfPlayDate = {
  id: string;
  label: string;
  shortLabel: string;
  apiDate: string;
};

export type GolfTimeSlot = {
  time: string;
  available: boolean;
};

export const golfTheme = {
  background: "#F5FAF3",
  surface: "#FFFFFF",
  border: "#DCEAD8",
  soft: "#EAF6E7",
  green: "#2F6B2F",
  greenDark: "#245626",
  ink: "#1F2D20",
  muted: "#637163",
};

export const golfCopy = {
  title: "ゴルフ場予約サイト",
  subtitle: "希望の条件で検索して、簡単にゴルフ場を予約",
};

export const golfSearchConditions = {
  playDate: "2026年7月20日（月）",
  apiDate: "2026-07-20",
  area: "関東エリア",
  playStyle: "指定なし",
  guests: "4人",
  preferences: ["早朝", "昼食付", "乗用カート", "スループレー"],
};

export const golfPlayerCounts = [1, 2, 3, 4];

export const golfPlayDates: GolfPlayDate[] = [
  {
    id: "2026-07-20",
    label: "2026年7月20日（月）",
    shortLabel: "7/20\n月",
    apiDate: "2026-07-20",
  },
  {
    id: "2026-07-21",
    label: "2026年7月21日（火）",
    shortLabel: "7/21\n火",
    apiDate: "2026-07-21",
  },
  {
    id: "2026-07-22",
    label: "2026年7月22日（水）",
    shortLabel: "7/22\n水",
    apiDate: "2026-07-22",
  },
  {
    id: "2026-07-23",
    label: "2026年7月23日（木）",
    shortLabel: "7/23\n木",
    apiDate: "2026-07-23",
  },
];

export const golfTimeSlots: GolfTimeSlot[] = [
  { time: "7:00", available: true },
  { time: "7:30", available: true },
  { time: "8:00", available: false },
  { time: "8:30", available: true },
  { time: "9:00", available: false },
  { time: "9:30", available: true },
  { time: "10:00", available: true },
  { time: "10:30", available: false },
  { time: "11:00", available: true },
  { time: "11:30", available: true },
];

export const golfCourses: GolfCourse[] = [
  {
    id: "greenhill",
    name: "グリーンヒルカントリークラブ",
    area: "栃木県",
    rating: "4.3",
    reviews: "312件",
    priceFrom: 12800,
    features: ["平日セルフ", "昼食付", "乗用カート"],
    imageLabel: "GREEN",
  },
  {
    id: "sunrise",
    name: "サンライズゴルフクラブ",
    area: "千葉県",
    rating: "4.1",
    reviews: "256件",
    priceFrom: 11500,
    features: ["平日セルフ", "乗用カート"],
    imageLabel: "SUNRISE",
  },
  {
    id: "fuji",
    name: "富士見カントリークラブ",
    area: "山梨県",
    rating: "4.5",
    reviews: "421件",
    priceFrom: 13900,
    features: ["昼食付", "景観良好"],
    imageLabel: "FUJI",
  },
  {
    id: "lakeside",
    name: "レイクサイドゴルフコース",
    area: "茨城県",
    rating: "3.9",
    reviews: "189件",
    priceFrom: 10800,
    features: ["平日セルフ", "乗用カート"],
    imageLabel: "LAKE",
  },
];

export const golfPlans: GolfPlan[] = [
  {
    id: "self-lunch",
    name: "【昼食付】平日セルフプラン",
    pricePerPerson: 12800,
    description: "気軽に楽しめる昼食付きの定番プラン",
    labels: ["昼食付", "乗用カート", "平日限定"],
  },
  {
    id: "caddie",
    name: "【昼食付】平日キャディ付プラン",
    pricePerPerson: 16800,
    description: "初めての方にも安心のキャディ付き",
    labels: ["昼食付", "キャディ付"],
  },
  {
    id: "competition",
    name: "コンペ向け3組以上プラン",
    pricePerPerson: 14800,
    description: "複数組での利用に便利なコンペ向け",
    labels: ["コンペ", "昼食付"],
  },
];

export const golfStartTimes = ["7:30", "8:00", "8:30", "9:00", "9:30", "10:00", "10:30", "11:00"];

export const golfFullStartTimes = new Set(["9:00", "11:00"]);

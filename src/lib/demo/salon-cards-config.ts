export type Salon = {
  id: string;
  name: string;
  area: string;
  station: string;
  rating: string;
  reviews: string;
  priceFrom: number;
  badges: string[];
  imageLabel: string;
  address: string;
  hours: string;
  access: string;
  intro: string;
};

export type SalonMenu = {
  id: string;
  name: string;
  regularPrice: number;
  salePrice: number;
  duration: string;
  imageLabel: string;
};

export type SalonStaff = {
  id: string;
  name: string;
  role: string;
  imageLabel: string;
};

export const salonTheme = {
  background: "#FFF7FA",
  surface: "#FFFFFF",
  border: "#F2D7E1",
  soft: "#FFF0F5",
  pink: "#E7386F",
  pinkDark: "#C92D5D",
  ink: "#31262B",
  muted: "#76666E",
};

export const salonSearchConditions = {
  area: "渋谷駅",
  station: "渋谷駅",
  date: "2026年7月20日（月）",
  apiDate: "2026-07-20",
  genre: "美容室・ヘアサロン",
  menu: "カット + カラー",
  preferences: ["即時予約OK", "ポイント利用可", "クーポンあり", "個室あり", "メンズにもオススメ", "駐車場あり"],
  popularAreas: ["渋谷", "新宿", "池袋", "銀座", "横浜"],
};

export const salons: Salon[] = [
  {
    id: "emma",
    name: "Emma by afloat",
    area: "渋谷",
    station: "渋谷駅 徒歩3分",
    rating: "4.7",
    reviews: "1,324件",
    priceFrom: 8900,
    badges: ["即時予約OK", "ポイント利用可"],
    imageLabel: "SALON",
    address: "東京都渋谷区神南1-2-3",
    hours: "10:00 - 21:00",
    access: "渋谷駅B1出口から徒歩3分",
    intro: "透明感カラーと顔まわりのデザインに強い、落ち着いた雰囲気のサロンです。",
  },
  {
    id: "lond",
    name: "Lond omotesando",
    area: "表参道",
    station: "表参道駅 徒歩2分",
    rating: "4.6",
    reviews: "2,451件",
    priceFrom: 9800,
    badges: ["クーポンあり", "個室あり"],
    imageLabel: "HAIR",
    address: "東京都港区北青山3-4-5",
    hours: "09:30 - 20:30",
    access: "表参道駅A2出口から徒歩2分",
    intro: "上品なヘアデザインと丁寧なカウンセリングが特徴です。",
  },
  {
    id: "ways",
    name: "WAY'S 渋谷",
    area: "渋谷",
    station: "渋谷駅 徒歩5分",
    rating: "4.5",
    reviews: "953件",
    priceFrom: 8400,
    badges: ["即時予約OK", "クーポンあり"],
    imageLabel: "STYLE",
    address: "東京都渋谷区宇田川町1-1",
    hours: "10:00 - 22:00",
    access: "渋谷駅ハチ公口から徒歩5分",
    intro: "トレンド感のあるカラーと再現性の高いカットが人気です。",
  },
];

export const salonMenus: SalonMenu[] = [
  {
    id: "cut-color-treatment",
    name: "【人気No.1】カット + 透明感カラー + トリートメント",
    regularPrice: 12100,
    salePrice: 8900,
    duration: "約120分",
    imageLabel: "MENU",
  },
  {
    id: "tokio",
    name: "カット + カラー + TOKIOトリートメント",
    regularPrice: 14300,
    salePrice: 9900,
    duration: "約150分",
    imageLabel: "CARE",
  },
  {
    id: "bangs",
    name: "【メンズ限定】カット + 眉カット",
    regularPrice: 6600,
    salePrice: 5500,
    duration: "約60分",
    imageLabel: "MEN",
  },
];

export const salonStaff: SalonStaff[] = [
  { id: "none", name: "指名なし", role: "おまかせ", imageLabel: "FREE" },
  { id: "kana", name: "松本 佳奈", role: "Top stylist", imageLabel: "A" },
  { id: "naoki", name: "佐藤 直樹", role: "Colorist", imageLabel: "B" },
  { id: "yuko", name: "山田 優子", role: "Stylist", imageLabel: "C" },
];

export const salonDates = ["7/20（月）", "7/21（火）", "7/22（水）", "7/23（木）", "7/24（金）"];

export const salonTimes = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"];

export const salonFullTimes = new Set(["12:30", "18:30"]);

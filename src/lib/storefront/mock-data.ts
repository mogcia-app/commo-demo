import type { AvailableSlot, Coupon, Menu, Question, Staff, Store } from "./types";

const baseModules = {
  showCoupons: true,
  showCalendar: true,
  showStaffSelect: true,
  showRoomSelect: false,
  showSeatType: false,
  showGuestCount: true,
  showNotes: true,
  showQuestionnaire: true,
  showMemberCard: true,
};

export const mockStores: Store[] = [
  {
    id: "store_abc_salon",
    name: "commo. Beauty Salon",
    slug: "company-a",
    status: "active",
    industry: "salon",
    template: "salon_standard",
    layout: {
      storefront: "salon_standard",
      reserve: "salon_step",
    },
    theme: {
      primaryColor: "#B85ACD",
      secondaryColor: "#F7D9F2",
      backgroundColor: "#FFF7FC",
      surfaceColor: "#FFFFFF",
      textColor: "#312438",
      mutedTextColor: "#75667A",
      heroImage:
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1400&auto=format&fit=crop",
      borderRadius: "md",
      fontFamily: "system-ui",
      buttonStyle: "solid",
    },
    modules: baseModules,
    address: "東京都渋谷区神宮前1-1-1",
    access: "明治神宮前駅から徒歩4分",
    businessHours: [
      { label: "平日", days: "月-金", hours: "10:00-20:00" },
      { label: "週末", days: "土日祝", hours: "09:00-19:00" },
    ],
    reservationSettings: {
      minLeadHours: 3,
      slotIntervalMinutes: 30,
      maxGuests: 2,
      completionMessage: "ご予約ありがとうございます。LINEに確認メッセージをお送りします。",
    },
    lineSettings: {
      liffId: "2000000000-companya",
      officialAccountUrl: "https://line.me/R/ti/p/@commo-demo",
      friendUrl: "https://line.me/R/ti/p/@commo-demo",
    },
    description: "髪と肌のコンディションに合わせた、短時間でも満足度の高い予約体験を提供します。",
    phone: "03-0000-0001",
  },
  {
    id: "store_hotel_luna",
    name: "HOTEL LUNA",
    slug: "company-b",
    status: "active",
    industry: "hotel",
    template: "hotel_standard",
    layout: {
      storefront: "hotel_standard",
      reserve: "hotel_step",
    },
    theme: {
      primaryColor: "#256D85",
      secondaryColor: "#D8EEF2",
      backgroundColor: "#F6FBFC",
      surfaceColor: "#FFFFFF",
      textColor: "#18343B",
      mutedTextColor: "#5D7278",
      heroImage:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1400&auto=format&fit=crop",
      borderRadius: "sm",
      fontFamily: "system-ui",
      buttonStyle: "solid",
    },
    modules: {
      ...baseModules,
      showRoomSelect: true,
      showStaffSelect: false,
    },
    address: "沖縄県那覇市久茂地1-1-1",
    access: "県庁前駅から徒歩3分",
    businessHours: [{ label: "フロント", days: "毎日", hours: "00:00-24:00" }],
    reservationSettings: {
      minLeadHours: 24,
      slotIntervalMinutes: 60,
      maxGuests: 6,
      completionMessage: "ご予約を承りました。チェックイン情報をLINEでお送りします。",
    },
    lineSettings: {
      liffId: "2000000000-companyb",
      officialAccountUrl: "https://line.me/R/ti/p/@commo-demo",
      friendUrl: "https://line.me/R/ti/p/@commo-demo",
    },
    description: "旅の予定変更にも合わせやすい、LINEから完結するホテル予約ページです。",
    phone: "098-000-0002",
  },
];

export const mockMenus: Menu[] = [
  {
    id: "menu_cut_color",
    storeId: "store_abc_salon",
    name: "カット + カラー",
    description: "印象を整える定番メニュー。初回来店にもおすすめです。",
    priceLabel: "12,000円",
    durationMinutes: 120,
    category: "hair",
  },
  {
    id: "menu_headspa",
    storeId: "store_abc_salon",
    name: "ヘッドスパ",
    description: "短時間でリフレッシュできるリラクゼーションメニュー。",
    priceLabel: "6,600円",
    durationMinutes: 60,
    category: "care",
  },
  {
    id: "menu_suite",
    storeId: "store_hotel_luna",
    name: "オーシャンビュー スイート",
    description: "海を望む上層階のお部屋。記念日利用にも向いています。",
    priceLabel: "42,000円〜",
    durationMinutes: 1440,
    category: "room",
  },
  {
    id: "menu_standard_room",
    storeId: "store_hotel_luna",
    name: "スタンダード ツイン",
    description: "観光にもビジネスにも使いやすいベーシックなお部屋。",
    priceLabel: "18,000円〜",
    durationMinutes: 1440,
    category: "room",
  },
];

export const mockCoupons: Record<string, Coupon[]> = {
  store_abc_salon: [
    {
      id: "coupon_first",
      title: "初回10%OFF",
      description: "LINE予約限定で初回来店時に利用できます。",
      expiresAt: "2026-12-31",
    },
  ],
  store_hotel_luna: [
    {
      id: "coupon_breakfast",
      title: "朝食アップグレード",
      description: "LINE予約限定で朝食セットを優待価格にできます。",
      expiresAt: "2026-12-31",
    },
  ],
};

export const mockStaff: Record<string, Staff[]> = {
  store_abc_salon: [
    { id: "staff_mika", name: "Mika", role: "Stylist", profile: "透明感カラーと顔まわりの提案が得意です。" },
    { id: "staff_ren", name: "Ren", role: "Care specialist", profile: "ヘッドスパと髪質ケアを担当します。" },
  ],
  store_hotel_luna: [],
};

export const mockQuestions: Record<string, Question[]> = {
  store_abc_salon: [
    {
      id: "hairConcern",
      label: "今気になっている髪のお悩み",
      type: "textarea",
      required: false,
    },
    {
      id: "firstVisit",
      label: "ご来店は初めてですか？",
      type: "select",
      required: true,
      options: ["初めて", "2回目以降"],
    },
  ],
  store_hotel_luna: [
    {
      id: "arrivalTime",
      label: "到着予定時間",
      type: "select",
      required: true,
      options: ["15:00-17:00", "17:00-19:00", "19:00以降"],
    },
  ],
};

export const mockAvailableSlots: AvailableSlot[] = [
  { date: "2026-07-06", time: "10:00", remaining: 3 },
  { date: "2026-07-06", time: "13:00", remaining: 2 },
  { date: "2026-07-07", time: "11:30", remaining: 4 },
  { date: "2026-07-07", time: "16:00", remaining: 1 },
];

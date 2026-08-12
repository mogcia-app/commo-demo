"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import type { Menu } from "@/lib/storefront/types";
import type { OrganizationLineSettings, Reservation } from "@/lib/types";

export type AdminAvailabilitySlot = {
  time: string;
  capacity: number;
  booked: number;
  remaining: number;
  available: boolean;
};

export type AdminMenu = Pick<Menu, "id" | "bookingTemplate" | "name" | "description" | "price" | "priceLabel" | "durationMinutes" | "category" | "imageUrl" | "enabled" | "sortOrder">;

export type AdminLineOverview = {
  botInfo: {
    userId?: string;
    basicId?: string;
    displayName?: string;
    pictureUrl?: string;
    chatMode?: string;
    markAsReadMode?: string;
  } | null;
  dataStatus: {
    lineApiConnected: boolean;
    followerIdsAvailable: boolean;
    followerIdError: string;
    firestoreUsers: number;
    firestoreEvents: number;
  };
  kpis: {
    friendTotal: number;
    thisMonthAdds: number;
    thisMonthBlocks: number;
    surveyResponseRate: number;
    broadcastClickRate: number;
    inactive90Count: number;
  };
  users: {
    id: string;
    lineUserId: string;
    name: string;
    pictureUrl: string;
    addedAt: string;
    lastActionAt: string;
    survey: string;
    tags: string[];
    action: string;
    reactions: number;
    status: string;
  }[];
  monthlySeries: {
    label: string;
    friends: number;
    blocks: number;
    sent: number;
    opens: number;
    clicks: number;
  }[];
  segmentCounts: { label: string; value: number }[];
  richMenuClicks: { label: string; value: number }[];
  surveyAnswers: { label: string; value: number }[];
  actionItems: { title: string; count: number; href: string }[];
};

export type AdminSurveyResponse = {
  id: string;
  lineUserId: string;
  lineDisplayName: string;
  name: string;
  answers: {
    ageGroup: string;
    purpose: string;
    area: string;
    prefecture: string;
    region: string;
    interests: string[];
    usageCount: string;
    weekdayNeeds: string;
    comment: string;
  };
  createdAt: string;
};

export type AdminSurveyLineUser = {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string;
  friendAddedAt: string;
  surveyOpenedAt: string;
  surveyAnsweredAt: string;
  lastMessageAt: string;
  latestSurveyBroadcastId: string;
  surveyStatus: string;
  answers: AdminSurveyResponse["answers"];
};

export type AdminSurveySegments = {
  ageGroups: { label: string; count: number }[];
  purposes: { label: string; count: number }[];
  areas: { label: string; count: number }[];
  prefectures: { label: string; count: number }[];
  regions: { label: string; count: number }[];
  interests: { label: string; count: number }[];
  usageCounts: { label: string; count: number }[];
  weekdayNeeds: { label: string; count: number }[];
};

async function getIdToken() {
  const user = firebaseAuth.currentUser;

  if (!user) {
    throw new Error("ログインが必要です。");
  }

  return user.getIdToken();
}

export async function fetchAdminReservations() {
  const token = await getIdToken();
  const response = await fetch("/api/admin/reservations", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "予約一覧の取得に失敗しました。");
  }

  return (await response.json()) as { reservations: Reservation[] };
}

export async function updateReservationStatus(id: string, status: Reservation["status"]) {
  const token = await getIdToken();
  const response = await fetch(`/api/reservations/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "ステータス更新に失敗しました。");
  }

  return response.json();
}

export async function fetchAdminAvailability(date: string) {
  const token = await getIdToken();
  const response = await fetch(`/api/admin/availability?date=${encodeURIComponent(date)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "空き枠の取得に失敗しました。");
  }

  return (await response.json()) as { date: string; slots: AdminAvailabilitySlot[] };
}

export async function saveAdminAvailability(date: string, slots: AdminAvailabilitySlot[]) {
  const token = await getIdToken();
  const response = await fetch("/api/admin/availability", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ date, slots }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "空き枠の保存に失敗しました。");
  }

  return (await response.json()) as { date: string; slots: AdminAvailabilitySlot[] };
}

export async function saveAdminAvailabilityRange(startDate: string, days: number, slots: AdminAvailabilitySlot[]) {
  const token = await getIdToken();
  const response = await fetch("/api/admin/availability", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode: "range", startDate, days, slots }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "空き枠の一括作成に失敗しました。");
  }

  return (await response.json()) as { startDate: string; days: number; dates: string[]; slots: AdminAvailabilitySlot[] };
}

export async function fetchAdminMenus() {
  const token = await getIdToken();
  const response = await fetch("/api/admin/menus", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "メニューの取得に失敗しました。");
  }

  return (await response.json()) as { menus: AdminMenu[] };
}

export async function saveAdminMenus(menus: AdminMenu[]) {
  const token = await getIdToken();
  const response = await fetch("/api/admin/menus", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ menus }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "メニューの保存に失敗しました。");
  }

  return (await response.json()) as { menus: AdminMenu[] };
}

export async function fetchAdminLineSettings() {
  const token = await getIdToken();
  const response = await fetch("/api/admin/line-settings", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "LINE設定の取得に失敗しました。");
  }

  return (await response.json()) as { lineSettings: OrganizationLineSettings };
}

export async function saveAdminLineSettings(lineSettings: OrganizationLineSettings) {
  const token = await getIdToken();
  const response = await fetch("/api/admin/line-settings", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lineSettings }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "LINE設定の保存に失敗しました。");
  }

  return (await response.json()) as { lineSettings: OrganizationLineSettings };
}

export async function fetchAdminLineOverview(industryType: OrganizationLineSettings["industryType"]) {
  const token = await getIdToken();
  const response = await fetch(`/api/admin/line-overview?industryType=${encodeURIComponent(industryType)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "LINE運用データの取得に失敗しました。");
  }

  return (await response.json()) as AdminLineOverview;
}

export async function fetchAdminSurveyResponses() {
  const token = await getIdToken();
  const response = await fetch("/api/admin/survey-responses", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "アンケート回答の取得に失敗しました。");
  }

  return (await response.json()) as {
    responses: AdminSurveyResponse[];
    lineUsers: AdminSurveyLineUser[];
    segments: AdminSurveySegments;
    recipientCount: number;
    delivery: {
      latestBroadcastId: string;
      targetCount: number;
      unopenedCount: number;
      openedNotAnsweredCount: number;
      answeredCount: number;
    };
  };
}

export async function sendAdminSurveyBroadcast(input: {
  message: string;
  filters: {
    purpose?: string;
    area?: string;
    prefecture?: string;
    region?: string;
    ageGroup?: string;
    interest?: string;
    usageCount?: string;
    weekdayNeeds?: string;
  };
}) {
  const token = await getIdToken();
  const response = await fetch("/api/admin/survey-broadcasts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "アンケート回答者向け配信に失敗しました。");
  }

  return (await response.json()) as { broadcast: { id: string; targetCount: number; sentCount: number; failedCount: number } };
}

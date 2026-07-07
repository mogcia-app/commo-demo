"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import type { Reservation } from "@/lib/types";

export type AdminAvailabilitySlot = {
  time: string;
  capacity: number;
  booked: number;
  remaining: number;
  available: boolean;
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

import { FieldValue } from "firebase-admin/firestore";
import { pushLineMessage } from "@/lib/line";
import { getAdminApp, getAdminDb } from "@/lib/firebase/admin";
import type { Menu, Reservation, Store } from "./types";

type ReservationCompleteTemplate = {
  enabled?: boolean;
  message?: string;
};

type LineMessageSettings = {
  reservationComplete?: ReservationCompleteTemplate;
};

type LineConnectionSettings = {
  connected?: boolean;
  isConnected?: boolean;
  status?: string;
  channelAccessTokenSecretName?: string;
  channelAccessTokenSecretVersion?: string;
  channelAccessTokenSecretResourceName?: string;
  secretName?: string;
};

export type LineNotificationStatus = "sent" | "skipped" | "failed";

type ReservationCompleteInput = {
  store: Store;
  reservation: Reservation;
  menu: Menu;
  lineUserId: string;
  customerName: string;
  phone: string;
  email?: string;
  staffName?: string;
  paymentMethod?: string;
};

export async function sendReservationCompleteLineMessage(input: ReservationCompleteInput): Promise<LineNotificationStatus> {
  try {
    const settings = await getLineMessageSettings(input.store.id);
    const template = settings?.reservationComplete;
    const message = template?.message?.trim();

    if (template?.enabled !== true || !message || !input.lineUserId.trim()) {
      return "skipped";
    }

    const lineConnection = await getLineConnectionSettings(input.store.id);

    if (!lineConnection || !isLineConnected(lineConnection)) {
      return "skipped";
    }

    const channelAccessToken = await getChannelAccessToken(lineConnection);

    if (!channelAccessToken) {
      return "skipped";
    }

    const text = renderTemplate(message, buildTemplateValues(input));

    await pushLineMessage({
      to: input.lineUserId.trim(),
      text,
      channelAccessToken,
    });

    await markReservationCompleteMessageSent(input.store.id, input.reservation.id, input.lineUserId.trim(), text);

    return "sent";
  } catch (cause) {
    console.error("予約完了LINE通知に失敗しました", cause);
    await markReservationCompleteMessageFailed(input.store.id, input.reservation.id, cause).catch((loggingCause) => {
      console.error("予約完了LINE通知の失敗ログ保存に失敗しました", loggingCause);
    });

    return "failed";
  }
}

async function getLineMessageSettings(storeId: string) {
  const snapshot = await getAdminDb().collection("stores").doc(storeId).collection("settings").doc("lineMessages").get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as LineMessageSettings;
}

async function getLineConnectionSettings(storeId: string) {
  const snapshot = await getAdminDb().collection("stores").doc(storeId).collection("settings").doc("line").get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as LineConnectionSettings;
}

function isLineConnected(settings: LineConnectionSettings) {
  if (settings.connected === false || settings.isConnected === false) {
    return false;
  }

  if (settings.status) {
    return settings.status === "connected";
  }

  return settings.connected === true || settings.isConnected === true || Boolean(getSecretResourceName(settings));
}

async function getChannelAccessToken(settings: LineConnectionSettings) {
  const secretResourceName = getSecretResourceName(settings);

  if (!secretResourceName) {
    return null;
  }

  return accessSecretVersion(secretResourceName);
}

function getSecretResourceName(settings: LineConnectionSettings) {
  const explicitResourceName = settings.channelAccessTokenSecretResourceName;

  if (explicitResourceName?.startsWith("projects/")) {
    return explicitResourceName.includes("/versions/") ? explicitResourceName : `${explicitResourceName}/versions/latest`;
  }

  const secretName = settings.channelAccessTokenSecretName ?? settings.secretName;

  if (!secretName) {
    return null;
  }

  if (secretName.startsWith("projects/")) {
    return secretName.includes("/versions/") ? secretName : `${secretName}/versions/${settings.channelAccessTokenSecretVersion ?? "latest"}`;
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    return null;
  }

  return `projects/${projectId}/secrets/${secretName}/versions/${settings.channelAccessTokenSecretVersion ?? "latest"}`;
}

async function accessSecretVersion(secretResourceName: string) {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(`https://secretmanager.googleapis.com/v1/${secretResourceName}:access`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Secret ManagerからLINEアクセストークンを取得できませんでした: ${response.status} ${detail}`);
  }

  const body = (await response.json()) as { payload?: { data?: string } };
  const encodedToken = body.payload?.data;

  if (!encodedToken) {
    return null;
  }

  return Buffer.from(encodedToken, "base64").toString("utf8").trim();
}

async function getGoogleAccessToken() {
  const credential = getAdminApp().options.credential as
    | {
        getAccessToken?: () => Promise<{ access_token?: string }>;
      }
    | undefined;
  const token = (await credential?.getAccessToken?.())?.access_token;

  if (!token) {
    throw new Error("Secret ManagerへアクセスするためのGoogle認証トークンを取得できませんでした。");
  }

  return token;
}

function buildTemplateValues(input: ReservationCompleteInput) {
  const startAt = formatReservationDateTime(input.reservation.date, input.reservation.time);
  const durationMinutes = input.menu.durationMinutes || 0;
  const endAt = durationMinutes ? formatEndDateTime(input.reservation.date, input.reservation.time, durationMinutes) : "";

  return {
    customerName: input.customerName,
    menuName: input.menu.name,
    storeName: input.store.name,
    storeSlug: input.store.slug,
    startAt,
    endAt,
    date: input.reservation.date,
    time: input.reservation.time,
    reservationId: input.reservation.id,
    phone: input.phone,
    email: input.email ?? "",
    staffName: input.staffName ?? "",
    paymentMethod: input.paymentMethod ?? "",
    reservationDate: input.reservation.date,
    reservationTime: input.reservation.time,
    priceLabel: input.menu.priceLabel,
  };
}

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (matched, key: string) => values[key] ?? matched);
}

function formatReservationDateTime(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00+09:00`);

  if (Number.isNaN(parsed.getTime())) {
    return `${date} ${time}`;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatEndDateTime(date: string, time: string, durationMinutes: number) {
  const parsed = new Date(`${date}T${time}:00+09:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed.getTime() + durationMinutes * 60 * 1000));
}

async function markReservationCompleteMessageSent(storeId: string, reservationId: string, lineUserId: string, text: string) {
  const db = getAdminDb();
  const now = FieldValue.serverTimestamp();

  await Promise.all([
    db.collection("stores").doc(storeId).collection("reservations").doc(reservationId).set(
      {
        notifications: {
          completedSentAt: now,
          completedMessage: text,
          completedError: "",
        },
        updatedAt: now,
      },
      { merge: true },
    ),
    db.collection("stores").doc(storeId).collection("lineUsers").doc(toSafeDocId(lineUserId)).set(
      {
        lastMessageAt: now,
        updatedAt: now,
      },
      { merge: true },
    ),
  ]);
}

async function markReservationCompleteMessageFailed(storeId: string, reservationId: string, cause: unknown) {
  await getAdminDb().collection("stores").doc(storeId).collection("reservations").doc(reservationId).set(
    {
      notifications: {
        completedError: cause instanceof Error ? cause.message : "LINE通知に失敗しました。",
        completedFailedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

function toSafeDocId(value: string) {
  return value.trim().replace(/\//g, "_");
}

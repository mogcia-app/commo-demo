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

type LineNotificationSkipReason =
  | "reservation_complete_disabled"
  | "reservation_complete_message_empty"
  | "line_user_id_missing"
  | "line_connection_disconnected"
  | "channel_access_token_missing";

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

const defaultReservationCompleteTemplate: Required<ReservationCompleteTemplate> = {
  enabled: true,
  message: `{customerName} 様

ご予約ありがとうございます。
以下の内容で予約を受け付けました。

店舗: {storeName}
メニュー: {menuName}
日時: {date} {time}

ご来店をお待ちしております。`,
};

export async function sendReservationCompleteLineMessage(input: ReservationCompleteInput): Promise<LineNotificationStatus> {
  try {
    const template = await getReservationCompleteTemplate();
    const message = template?.message?.trim();

    if (template?.enabled !== true) {
      await markReservationCompleteMessageSkipped(input.reservation.id, "reservation_complete_disabled");
      return "skipped";
    }

    if (!message) {
      await markReservationCompleteMessageSkipped(input.reservation.id, "reservation_complete_message_empty");
      return "skipped";
    }

    if (!input.lineUserId.trim()) {
      await markReservationCompleteMessageSkipped(input.reservation.id, "line_user_id_missing");
      return "skipped";
    }

    const lineConnection = await getLineConnectionSettings();

    if (lineConnection && !isLineConnected(lineConnection)) {
      await markReservationCompleteMessageSkipped(input.reservation.id, "line_connection_disconnected");
      return "skipped";
    }

    const channelAccessToken = await getChannelAccessToken(lineConnection);

    if (!channelAccessToken) {
      await markReservationCompleteMessageSkipped(input.reservation.id, "channel_access_token_missing");
      return "skipped";
    }

    const text = renderTemplate(message, buildTemplateValues(input));

    await pushLineMessage({
      to: input.lineUserId.trim(),
      text,
      channelAccessToken,
    });

    await markReservationCompleteMessageSent(input.reservation.id, input.lineUserId.trim(), text);

    return "sent";
  } catch (cause) {
    console.error("予約完了LINE通知に失敗しました", cause);
    await markReservationCompleteMessageFailed(input.reservation.id, cause).catch((loggingCause) => {
      console.error("予約完了LINE通知の失敗ログ保存に失敗しました", loggingCause);
    });

    return "failed";
  }
}

async function getReservationCompleteTemplate() {
  const settings = await getLineMessageSettings();
  const firestoreTemplate = settings?.reservationComplete;

  return {
    ...defaultReservationCompleteTemplate,
    ...firestoreTemplate,
  };
}

async function getLineMessageSettings() {
  const snapshot = await getAdminDb().collection("settings").doc("lineMessages").get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as LineMessageSettings;
}

async function getLineConnectionSettings() {
  const snapshot = await getAdminDb().collection("settings").doc("line").get();

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

async function getChannelAccessToken(settings: LineConnectionSettings | null) {
  const secretResourceName = settings ? getSecretResourceName(settings) : null;

  if (!secretResourceName) {
    return process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() || null;
  }

  return accessSecretVersion(secretResourceName).catch((cause) => {
    if (process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()) {
      console.error("店舗別SecretからLINEアクセストークンを取得できないため環境変数を使用します", cause);
      return process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() || null;
    }

    throw cause;
  });
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

async function markReservationCompleteMessageSent(reservationId: string, lineUserId: string, text: string) {
  const db = getAdminDb();
  const now = FieldValue.serverTimestamp();

  await Promise.all([
    db.collection("reservations").doc(reservationId).set(
      {
        notifications: {
          completedSentAt: now,
          completedMessage: text,
          completedError: "",
          completedStatus: "sent",
          completedSkippedReason: "",
        },
        updatedAt: now,
      },
      { merge: true },
    ),
    db.collection("lineUsers").doc(toSafeDocId(lineUserId)).set(
      {
        lastMessageAt: now,
        updatedAt: now,
      },
      { merge: true },
    ),
  ]);
}

async function markReservationCompleteMessageFailed(reservationId: string, cause: unknown) {
  await getAdminDb().collection("reservations").doc(reservationId).set(
    {
      notifications: {
        completedError: cause instanceof Error ? cause.message : "LINE通知に失敗しました。",
        completedFailedAt: FieldValue.serverTimestamp(),
        completedStatus: "failed",
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function markReservationCompleteMessageSkipped(
  reservationId: string,
  reason: LineNotificationSkipReason,
) {
  await getAdminDb().collection("reservations").doc(reservationId).set(
    {
      notifications: {
        completedStatus: "skipped",
        completedSkippedAt: FieldValue.serverTimestamp(),
        completedSkippedReason: reason,
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

function toSafeDocId(value: string) {
  return value.trim().replace(/\//g, "_");
}

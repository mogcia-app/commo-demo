"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { fetchAdminReservations, updateReservationStatus } from "@/lib/admin-api";
import { STATUS_LABELS, type ReservationStatus } from "@/lib/constants";
import { reservationDemoConfigs, type IndustryType } from "@/lib/reservation-demos";
import type { Reservation } from "@/lib/types";

const statuses = Object.keys(STATUS_LABELS) as ReservationStatus[];

export function ReservationDetail({ id }: { id: string }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const reservation = useMemo(() => reservations.find((item) => item.id === id), [id, reservations]);
  const config = reservationDemoConfigs[reservation?.industryType ?? "salon"];

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const result = await fetchAdminReservations();
        if (!ignore) {
          setReservations(result.reservations);
        }
      } catch (cause) {
        if (!ignore) {
          setError(cause instanceof Error ? cause.message : "予約詳細の取得に失敗しました。");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  async function onStatusChange(status: ReservationStatus) {
    if (!reservation || status === reservation.status) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await updateReservationStatus(reservation.id, status);
      setReservations((current) => current.map((item) => (item.id === reservation.id ? { ...item, status } : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ステータス更新に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminShell>
      <div className="mb-5">
        <Link href="/admin/reservations" className="text-sm font-semibold text-slate-500 hover:text-commo-hover">
          予約一覧へ戻る
        </Link>
      </div>

      {isLoading ? <p className="text-sm text-slate-500">読み込み中です</p> : null}
      {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {!isLoading && !reservation ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          予約が見つかりません。
        </div>
      ) : null}

      {reservation ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">予約詳細</p>
                <h1 className="mt-1 text-2xl font-bold text-commo-ink">{reservation.name}</h1>
                <span
                  className="mt-3 inline-flex rounded-md px-3 py-1 text-sm font-semibold"
                  style={{ backgroundColor: config.softAccent, color: config.accent }}
                >
                  {reservation.industryLabel ?? config.industryLabel}
                </span>
              </div>
              <span className="rounded-md bg-commo-soft px-3 py-1 text-sm font-semibold text-commo-hover">
                {STATUS_LABELS[reservation.status]}
              </span>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Info label="メニュー/プラン" value={reservation.menuName} />
              <Info label="日時" value={`${reservation.date} ${reservation.time}`} />
              <Info label="電話番号" value={reservation.phone} />
              <Info label="LINE userId" value={reservation.lineUserId} />
            </dl>

            <div className="mt-6">
              <p className="text-sm font-semibold text-commo-ink">予約項目</p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {getFieldRows(reservation).map((row) => (
                  <Info key={row.label} label={row.label} value={row.value} />
                ))}
              </dl>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">顧客情報</p>
            <div className="mt-4 flex items-center gap-3">
              {reservation.linePictureUrl ? (
                <Image
                  src={reservation.linePictureUrl}
                  alt={reservation.lineDisplayName ?? reservation.name}
                  width={52}
                  height={52}
                  className="h-[52px] w-[52px] rounded-full object-cover"
                />
              ) : (
                <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-commo-soft text-lg font-bold text-commo-main">
                  L
                </div>
              )}
              <div>
                <p className="font-bold text-commo-ink">{reservation.lineDisplayName ?? "未取得"}</p>
                <p className="text-sm text-slate-500">{reservation.name}</p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-commo-ink">ステータス変更</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {statuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={isSaving}
                    onClick={() => onStatusChange(status)}
                    className={`rounded-md border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      reservation.status === status
                        ? "border-commo-main bg-commo-soft text-commo-hover"
                        : "border-slate-200 bg-white text-slate-700 hover:border-commo-main"
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
              {isSaving ? <p className="mt-3 text-sm text-slate-500">保存中です</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}

function getFieldRows(reservation: Reservation) {
  const industryType: IndustryType = reservation.industryType ?? "salon";
  const config = reservationDemoConfigs[industryType];
  const fields = reservation.fields ?? {};

  return config.fields
    .map((field) => ({
      label: field.label,
      value: fields[field.key]?.trim() ?? "",
    }))
    .filter((row) => row.value);
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-commo-ink">{value}</dd>
    </div>
  );
}

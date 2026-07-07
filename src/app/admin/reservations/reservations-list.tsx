"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { fetchAdminReservations } from "@/lib/admin-api";
import { STATUS_LABELS } from "@/lib/constants";
import type { Reservation } from "@/lib/types";

export function ReservationsList() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
          setError(cause instanceof Error ? cause.message : "予約一覧の取得に失敗しました。");
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

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-commo-ink">予約一覧</h1>
          <p className="mt-1 text-sm text-slate-500">この予約サイトで受け付けた予約を表示しています。</p>
        </div>
        <Link
          href="/hotel-search"
          className="rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover"
        >
          予約ページ
        </Link>
      </div>

      {isLoading ? <p className="text-sm text-slate-500">読み込み中です</p> : null}
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3">
        {reservations.map((reservation) => (
          <Link
            key={reservation.id}
            href={`/admin/reservations/${reservation.id}`}
            className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-commo-main"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <ReservationTypeTag reservation={reservation} />
                  <p className="text-sm font-semibold text-slate-500">
                    {reservation.date} {reservation.time}
                  </p>
                </div>
                <h2 className="mt-1 text-lg font-bold text-commo-ink">{reservation.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{reservation.menuName}</p>
              </div>
              <span className="rounded-md bg-commo-soft px-3 py-1 text-sm font-semibold text-commo-hover">
                {STATUS_LABELS[reservation.status] ?? reservation.status}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {!isLoading && !error && reservations.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          まだ予約がありません。
        </div>
      ) : null}
    </AdminShell>
  );
}

function ReservationTypeTag({ reservation }: { reservation: Reservation }) {
  return (
    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
      {getReservationTypeLabel(reservation)}
    </span>
  );
}

function getReservationTypeLabel(reservation: Reservation) {
  return (
    reservation.templateLabel ||
    reservation.industryLabel ||
    reservation.reservationDetails?.bookingTemplate ||
    reservation.fields?.bookingTemplate ||
    reservation.templateType ||
    reservation.industryType ||
    "予約"
  );
}

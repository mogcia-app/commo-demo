"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  fetchAdminAvailability,
  saveAdminAvailability,
  type AdminAvailabilitySlot,
} from "@/lib/admin-api";

const defaultTimes = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

export function AvailabilityEditor() {
  const [date, setDate] = useState(getTodayValue());
  const [slots, setSlots] = useState<AdminAvailabilitySlot[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const totalRemaining = useMemo(() => slots.reduce((sum, slot) => sum + Math.max(slot.capacity - slot.booked, 0), 0), [slots]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError("");
      setMessage("");

      try {
        const result = await fetchAdminAvailability(date);

        if (!ignore) {
          setSlots(result.slots.length ? result.slots : buildDefaultSlots());
        }
      } catch (cause) {
        if (!ignore) {
          setError(cause instanceof Error ? cause.message : "空き枠の取得に失敗しました。");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [date]);

  async function onSave() {
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await saveAdminAvailability(date, slots);
      setSlots(result.slots);
      setMessage("空き枠を保存しました。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "空き枠の保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  function updateSlot(index: number, patch: Partial<AdminAvailabilitySlot>) {
    setSlots((current) =>
      current.map((slot, slotIndex) => {
        if (slotIndex !== index) {
          return slot;
        }

        const next = { ...slot, ...patch };
        const capacity = Math.max(Number(next.capacity) || 0, 0);
        const booked = Math.max(Number(next.booked) || 0, 0);

        return {
          ...next,
          capacity,
          booked,
          remaining: Math.max(capacity - booked, 0),
        };
      }),
    );
  }

  function addSlot() {
    setSlots((current) => [
      ...current,
      {
        time: "18:00",
        capacity: 1,
        booked: 0,
        remaining: 1,
        available: true,
      },
    ]);
  }

  function removeSlot(index: number) {
    setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index));
  }

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-commo-ink">空き枠設定</h1>
          <p className="mt-1 text-sm text-slate-500">予約ページに表示する日付ごとの受付枠を管理します。</p>
        </div>
        <Link
          href="/booking"
          className="rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover"
        >
          予約ページ
        </Link>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-semibold text-commo-ink">
            日付
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={addSlot}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-commo-main"
          >
            枠を追加
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            保存
          </button>
          <p className="text-sm font-semibold text-slate-500">残り合計 {totalRemaining} 枠</p>
        </div>

        {isLoading ? <p className="mt-4 text-sm text-slate-500">読み込み中です</p> : null}
        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold text-slate-500">
                <th className="border-b border-slate-200 px-3 py-2">時間</th>
                <th className="border-b border-slate-200 px-3 py-2">受付</th>
                <th className="border-b border-slate-200 px-3 py-2">定員</th>
                <th className="border-b border-slate-200 px-3 py-2">予約済み</th>
                <th className="border-b border-slate-200 px-3 py-2">残り</th>
                <th className="border-b border-slate-200 px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, index) => (
                <tr key={`${slot.time}-${index}`}>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <input
                      type="time"
                      value={slot.time}
                      onChange={(event) => updateSlot(index, { time: event.target.value })}
                      className="w-28 rounded-md border border-slate-200 px-3 py-2"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={slot.available}
                        onChange={(event) => updateSlot(index, { available: event.target.checked })}
                        className="h-4 w-4"
                      />
                      表示
                    </label>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <input
                      type="number"
                      min={0}
                      value={slot.capacity}
                      onChange={(event) => updateSlot(index, { capacity: Number(event.target.value) })}
                      className="w-24 rounded-md border border-slate-200 px-3 py-2"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <input
                      type="number"
                      min={0}
                      value={slot.booked}
                      onChange={(event) => updateSlot(index, { booked: Number(event.target.value) })}
                      className="w-24 rounded-md border border-slate-200 px-3 py-2"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 font-semibold text-commo-ink">
                    {Math.max(slot.capacity - slot.booked, 0)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <button
                      type="button"
                      onClick={() => removeSlot(index)}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-300 hover:text-red-700"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function buildDefaultSlots(): AdminAvailabilitySlot[] {
  return defaultTimes.map((time) => ({
    time,
    capacity: 1,
    booked: 0,
    remaining: 1,
    available: true,
  }));
}

function getTodayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

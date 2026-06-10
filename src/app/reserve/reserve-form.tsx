"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLineProfile, type LineProfile } from "@/hooks/use-line-profile";
import {
  getReservationDemoConfig,
  getReservationSummary,
  type IndustryType,
  type ReservationDemoConfig,
  type ReservationField,
} from "@/lib/reservation-demos";

export function ReserveForm({ industryType = "salon" }: { industryType?: IndustryType }) {
  const config = getReservationDemoConfig(industryType);
  const router = useRouter();
  const { profile, liffState } = useLineProfile({ loginRedirectPath: "/demo" });
  const [values, setValues] = useState<Record<string, string>>(config.defaults);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = config.steps[stepIndex];
  const isConfirmStep = currentStep.fieldKeys.length === 0;
  const summary = getReservationSummary(config, values);
  const progress = Math.round(((stepIndex + 1) / config.steps.length) * 100);

  useEffect(() => {
    setValues(config.defaults);
    setStepIndex(0);
  }, [config]);

  const canProceed = useMemo(() => {
    const requiredFieldsFilled = currentStep.fieldKeys
      .map((key) => config.fields.find((field) => field.key === key))
      .filter((field): field is ReservationField => Boolean(field?.required))
      .every((field) => values[field.key]?.trim());

    return Boolean(requiredFieldsFilled && !isSubmitting);
  }, [config.fields, currentStep.fieldKeys, isSubmitting, values]);

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function goNext() {
    setError("");
    if (stepIndex < config.steps.length - 2) {
      setStepIndex((current) => current + 1);
    }
  }

  function goBack() {
    setError("");
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfirmStep) {
      goNext();
      return;
    }

    if (!profile) {
      setError("LINEプロフィールを取得中です。少し待ってから再度お試しください。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industryType: config.industryType,
          lineUserId: profile.userId,
          lineDisplayName: profile.displayName,
          linePictureUrl: profile.pictureUrl,
          fields: values,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "予約の作成に失敗しました。");
      }

      setStepIndex(config.steps.length - 1);
      router.push(`/reserve/complete?industry=${config.industryType}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "予約の作成に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-md bg-[#FAF8FD] px-4 py-5"
      style={{
        background: `linear-gradient(180deg, ${config.softAccent} 0%, #FAF8FD 320px)`,
      }}
    >
      <IndustryAppHeader config={config} liffState={liffState} />

      <form onSubmit={onSubmit} className="rounded-md bg-white p-5 shadow-soft">
        <div className="mb-5">
          <IndustryStepDots config={config} stepIndex={stepIndex} progress={progress} />
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold text-commo-ink">{getStepHeading(config, currentStep.title)}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{currentStep.lead}</p>
        </div>

        <div className="mt-5 space-y-4">
          {isConfirmStep ? (
            <ConfirmPanel config={config} values={values} />
          ) : (
            currentStep.fieldKeys.map((key) => {
              const field = config.fields.find((item) => item.key === key);

              if (!field) {
                return null;
              }

              return (
                <ReservationInput
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ""}
                  accent={config.accent}
                  onChange={(value) => updateValue(field.key, value)}
                />
              );
            })
          )}
        </div>

        <SummaryStrip config={config} summary={summary} />

        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 grid grid-cols-[0.8fr_1.2fr] gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0 || isSubmitting}
            className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-commo-main disabled:cursor-not-allowed disabled:opacity-40"
          >
            戻る
          </button>
          <button
            type="submit"
            disabled={!canProceed || isSubmitting}
            className="rounded-md px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
            style={{ backgroundColor: canProceed && !isSubmitting ? config.accent : undefined }}
          >
            {isSubmitting ? "予約しています" : isConfirmStep ? "この内容で予約する" : "次へ"}
          </button>
        </div>
      </form>
      <div className="mt-4">
        <ProfileCard config={config} profile={profile} liffState={liffState} />
      </div>
    </main>
  );
}

function IndustryAppHeader({ config, liffState }: { config: ReservationDemoConfig; liffState: string }) {
  return (
    <div className="mb-4 overflow-hidden rounded-md bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-500">‹</span>
        <div className="text-center">
          <h1 className="text-sm font-bold text-commo-ink">{getIndustryHeaderTitle(config.industryType)}</h1>
          <p className="mt-1 max-w-48 truncate text-[10px] font-semibold text-slate-400">{liffState}</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-500">×</span>
      </div>
    </div>
  );
}

function IndustryStepDots({
  config,
  stepIndex,
  progress,
}: {
  config: ReservationDemoConfig;
  stepIndex: number;
  progress: number;
}) {
  return (
    <div className="relative">
      <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-slate-200" />
      <div
        className="absolute left-4 top-1/2 h-px -translate-y-1/2"
        style={{ width: `calc(${progress}% - 28px)`, backgroundColor: config.accent }}
      />
      <div className="relative z-10 flex items-center justify-between">
        {config.steps.map((step, index) => {
          const active = index <= stepIndex;

          return (
            <span
              key={step.title}
              className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold shadow-sm"
              style={{
                borderColor: active ? config.accent : "#E2E8F0",
                backgroundColor: active ? config.accent : "#FFFFFF",
                color: active ? "#FFFFFF" : "#64748B",
              }}
            >
              {index + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function getIndustryHeaderTitle(industryType: IndustryType) {
  const titles: Record<IndustryType, string> = {
    hotel: "ホテル予約",
    golf: "ゴルフ予約",
    salon: "サロン予約",
  };

  return titles[industryType];
}

function getStepHeading(config: ReservationDemoConfig, title: string) {
  if (config.industryType === "hotel") {
    return `${title}してください`;
  }

  if (config.industryType === "golf") {
    return title.endsWith("選択") ? `${title}してください` : `${title}を選択してください`;
  }

  return `${title}してください`;
}

function ProfileCard({
  config,
  profile,
  liffState,
}: {
  config: ReservationDemoConfig;
  profile: LineProfile | null;
  liffState: string;
}) {
  return (
    <section className="mb-4 rounded-md border border-purple-100 bg-white/90 p-4 shadow-sm">
      <p className="text-xs font-semibold" style={{ color: config.accent }}>
        {liffState}
      </p>
      <div className="mt-3 flex items-center gap-3">
        {profile?.pictureUrl ? (
          <Image
            src={profile.pictureUrl}
            alt={profile.displayName}
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-bold"
            style={{ color: config.accent }}
          >
            L
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-commo-ink">{profile?.displayName ?? "取得中"}</p>
          <p className="truncate text-xs text-slate-500">{profile?.userId ?? "LINE userIdを確認しています"}</p>
        </div>
      </div>
    </section>
  );
}

function ReservationInput({
  field,
  value,
  accent,
  onChange,
}: {
  field: ReservationField;
  value: string;
  accent: string;
  onChange: (value: string) => void;
}) {
  const inputClass =
    "mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-commo-main";

  if (field.key === "checkInDate") {
    return <HotelCalendar field={field} value={value} accent={accent} onChange={onChange} />;
  }

  if (field.type === "select" && field.options) {
    const hasImageCards = Boolean(field.optionImageLabels);

    return (
      <div>
        <p className="text-sm font-semibold text-commo-ink">{field.label}</p>
        <div className={hasImageCards ? "mt-2 grid gap-3" : "mt-2 grid gap-2"}>
          {field.options.map((option) => {
            const selected = value === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange(option)}
                className="overflow-hidden rounded-md border text-left transition"
                style={{
                  borderColor: selected ? accent : "#E2E8F0",
                  backgroundColor: selected ? `${accent}14` : "#FFFFFF",
                }}
              >
                {field.optionImageLabels?.[option] ? (
                  <span
                    className="flex h-28 items-center justify-center border-b border-slate-100 bg-slate-100 px-4 text-center text-xs font-semibold text-slate-500"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(166,107,232,0.16), rgba(255,255,255,0.8) 48%, rgba(107,127,215,0.16))",
                    }}
                  >
                    {field.optionImageLabels[option]}
                  </span>
                ) : null}
                <span className="block p-3">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-commo-ink">{option}</span>
                      {field.optionMeta?.[option] ? (
                        <span className="mt-1 block text-xs font-semibold text-slate-500">{field.optionMeta[option]}</span>
                      ) : null}
                      {field.optionPriceLabels?.[option] ? (
                        <span className="mt-2 block text-sm font-bold text-commo-ink">{field.optionPriceLabels[option]}</span>
                      ) : null}
                    </span>
                    {selected ? (
                      <span className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: accent }}>
                        選択中
                      </span>
                    ) : null}
                  </span>
                  {field.optionDescriptions?.[option] ? (
                    <span className="mt-2 block text-xs leading-5 text-slate-500">{field.optionDescriptions[option]}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-semibold text-commo-ink">{field.label}</span>
      {field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={inputClass}
        />
      ) : (
        <input
          type={field.type}
          value={value}
          min={field.min}
          inputMode={field.type === "tel" ? "tel" : undefined}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={inputClass}
          style={{ caretColor: accent }}
        />
      )}
    </label>
  );
}

function HotelCalendar({
  field,
  value,
  accent,
  onChange,
}: {
  field: ReservationField;
  value: string;
  accent: string;
  onChange: (value: string) => void;
}) {
  const dates = getHotelCalendarDates();

  return (
    <div>
      <div className="rounded-md border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xl text-slate-500">‹</span>
          <p className="text-sm font-bold text-commo-ink">2026年6月</p>
          <span className="text-xl text-slate-500">›</span>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400">
          {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
            <span key={day} className={day === "日" ? "text-rose-400" : day === "土" ? "text-indigo-400" : ""}>
              {day}
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm">
          {dates.map((date) => {
            const selected = value === date.value;

            return (
              <button
                key={date.key}
                type="button"
                onClick={() => date.value && onChange(date.value)}
                disabled={!date.value}
                className="flex h-9 items-center justify-center rounded-full font-semibold disabled:text-slate-200"
                style={{
                  backgroundColor: selected ? accent : "transparent",
                  color: selected ? "#FFFFFF" : undefined,
                }}
              >
                {date.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
            選択可能
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />
            残りわずか
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-300" />
            満室
          </span>
        </div>
      </div>
      <input type="hidden" aria-label={field.label} value={value} readOnly />
    </div>
  );
}

function getHotelCalendarDates() {
  const blanks = Array.from({ length: 1 }, (_, index) => ({ key: `blank-${index}`, label: "", value: "" }));
  const days = Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const padded = String(day).padStart(2, "0");
    return { key: `day-${day}`, label: String(day), value: `2026-06-${padded}` };
  });

  return [...blanks, ...days];
}

function SummaryStrip({
  config,
  summary,
}: {
  config: ReservationDemoConfig;
  summary: ReturnType<typeof getReservationSummary>;
}) {
  return (
    <div className="mt-5 rounded-md p-3" style={{ backgroundColor: config.softAccent }}>
      <p className="text-xs font-semibold" style={{ color: config.accent }}>
        現在の選択
      </p>
      <p className="mt-1 truncate text-sm font-bold text-commo-ink">{summary.plan || "未選択"}</p>
      <p className="mt-1 text-xs text-slate-600">{summary.dateTime || "日時未選択"}</p>
    </div>
  );
}

function ConfirmPanel({ config, values }: { config: ReservationDemoConfig; values: Record<string, string> }) {
  const rows = config.fields
    .map((field) => ({
      label: field.label,
      value: values[field.key]?.trim() ?? "",
    }))
    .filter((row) => row.value);

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 p-3">
          <span className="text-xs font-semibold text-slate-500">{row.label}</span>
          <span className="text-right text-sm font-semibold text-commo-ink">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

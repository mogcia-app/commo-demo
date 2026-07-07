"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLineProfile } from "@/hooks/use-line-profile";
import type { DemoSite } from "@/lib/demo-sites";
import { getReservationSummary, type ReservationField } from "@/lib/reservation-demos";
import {
  getReservationTemplateConfig,
  type ReservationTemplateConfig,
} from "@/lib/reservation-templates";
import type { Menu } from "@/lib/storefront/types";
import { CalendarReservationSite } from "./calendar-reservation-site";
import { GolfStartReservationSite } from "./golf-start-reservation-site";
import { HotelSearchReservationSite } from "./hotel-search-reservation-site";

export function DemoReservationSite({ site }: { site: DemoSite }) {
  if (site.slug === "calendar") {
    return <CalendarReservationSite site={site} />;
  }

  if (site.slug === "hotel-search") {
    return <HotelSearchReservationSite site={site} />;
  }

  if (site.slug === "golf-start") {
    return <GolfStartReservationSite site={site} />;
  }

  return <GenericDemoReservationSite site={site} />;
}

function GenericDemoReservationSite({ site }: { site: DemoSite }) {
  const config = getReservationTemplateConfig(site.templateType);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLiveReservation = true;
  const campaignId = searchParams.get("campaignId")?.trim() || undefined;
  const couponId = searchParams.get("couponId")?.trim() || undefined;
  const loginRedirectPath = `${pathname}?${searchParams.toString()}`;
  const { profile } = useLineProfile({ loginRedirectPath });
  const [values, setValues] = useState<Record<string, string>>(config.defaults);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menus, setMenus] = useState<Menu[]>([]);

  const currentStep = config.steps[stepIndex];
  const isConfirmStep = currentStep.fieldKeys.length === 0;
  const progress = Math.round(((stepIndex + 1) / config.steps.length) * 100);
  const summary = getReservationSummary(config, values);

  useEffect(() => {
    setValues(config.defaults);
    setStepIndex(0);
  }, [config]);

  useEffect(() => {
    let ignore = false;

    async function loadMenus() {
      if (!isLiveReservation) {
        setMenus([]);
        return;
      }

      const response = await fetch("/api/menus");

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as { menus?: Menu[] };

      if (!ignore) {
        setMenus(body.menus ?? []);
      }
    }

    void loadMenus();

    return () => {
      ignore = true;
    };
  }, [isLiveReservation]);

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
      if (!isLiveReservation) {
        router.push("/booking/complete");
        return;
      }

      const selectedMenu = menus[0];
      const { date, time } = getReservationDateTime(summary);

      if (!selectedMenu) {
        throw new Error("予約メニューが見つかりません。メニュー設定を確認してください。");
      }

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId: selectedMenu.id,
          date,
          time,
          lineUserId: profile.userId,
          lineDisplayName: profile.displayName,
          linePictureUrl: profile.pictureUrl,
          displayName: summary.name,
          phone: summary.phone,
          email: values.email,
          answers: {
            ...values,
            bookingTemplate: site.slug,
            demoTemplateType: config.templateType,
            demoTemplateLabel: config.templateLabel,
            selectedPlan: summary.plan,
          },
          source: "liff",
          campaignId,
          couponId,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "予約の作成に失敗しました。");
      }

      router.push("/booking/complete");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "予約の作成に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-md px-4 py-5"
      style={{ background: `linear-gradient(180deg, ${config.softAccent} 0%, rgba(255,255,255,0) 320px)` }}
    >
      <TemplateHero config={config} site={site} />

      <form onSubmit={onSubmit} className="rounded-md bg-white p-5 shadow-soft">
        <StepHeader config={config} stepIndex={stepIndex} progress={progress} />

        {config.templateType === "chat" ? (
          <ChatQuestion config={config} title={currentStep.title} lead={currentStep.lead} />
        ) : (
          <div>
            <h2 className="text-xl font-bold text-commo-ink">{currentStep.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{currentStep.lead}</p>
          </div>
        )}

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
                <TemplateInput
                  key={field.key}
                  config={config}
                  field={field}
                  value={values[field.key] ?? ""}
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
    </main>
  );
}

function getReservationDateTime(summary: ReturnType<typeof getReservationSummary>) {
  const today = new Date().toISOString().slice(0, 10);
  const dateMatch = summary.date.match(/\d{4}-\d{2}-\d{2}/);
  const timeMatch = summary.time.match(/\d{1,2}:\d{2}/) ?? summary.dateTime.match(/\d{1,2}:\d{2}/);

  return {
    date: dateMatch?.[0] ?? today,
    time: timeMatch?.[0] ?? "10:00",
  };
}

function TemplateHero({ config, site }: { config: ReservationTemplateConfig; site: DemoSite }) {
  return (
    <div className="mb-4 overflow-hidden rounded-md bg-white shadow-soft">
      <div className="p-5" style={{ backgroundColor: config.softAccent }}>
        <p className="text-sm font-semibold" style={{ color: config.accent }}>
          commo. {config.templateLabel}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-commo-ink">{site.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{site.description}</p>
        <div className="mt-4 flex h-28 items-center justify-center rounded-md border border-dashed border-white/70 bg-white/70 px-4 text-center text-sm font-semibold text-slate-500">
          {config.imagePlaceholder}
        </div>
      </div>
    </div>
  );
}

function StepHeader({
  config,
  stepIndex,
  progress,
}: {
  config: ReservationTemplateConfig;
  stepIndex: number;
  progress: number;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500">
          STEP {stepIndex + 1} / {config.steps.length}
        </span>
        <span className="text-xs font-semibold" style={{ color: config.accent }}>
          {config.templateLabel}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: config.accent }} />
      </div>
    </div>
  );
}

function ChatQuestion({ config, title, lead }: { config: ReservationTemplateConfig; title: string; lead: string }) {
  return (
    <div className="space-y-3 rounded-md bg-slate-50 p-3">
      <div className="max-w-[84%] rounded-md rounded-bl-sm bg-white p-3 shadow-sm">
        <p className="text-sm font-bold text-commo-ink">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{lead}</p>
      </div>
      <div className="ml-auto max-w-[72%] rounded-md rounded-br-sm p-3 text-white" style={{ backgroundColor: config.accent }}>
        <p className="text-sm font-semibold">選択して返信</p>
      </div>
    </div>
  );
}

function TemplateInput({
  config,
  field,
  value,
  onChange,
}: {
  config: ReservationTemplateConfig;
  field: ReservationField;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputClass =
    "mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-commo-main";

  if (field.type === "select" && field.options) {
    return (
      <div>
        <p className="text-sm font-semibold text-commo-ink">{field.label}</p>
        <div className={config.templateType === "calendar" ? "mt-2 grid grid-cols-2 gap-2" : "mt-2 grid gap-2"}>
          {field.options.map((option) => {
            const selected = value === option;
            const blocked = config.templateType === "slots" && option.includes("×");

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  if (!blocked) {
                    onChange(option);
                  }
                }}
                disabled={blocked}
                className="rounded-md border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor: selected ? config.accent : "#E2E8F0",
                  backgroundColor: selected ? `${config.accent}14` : "#FFFFFF",
                }}
              >
                <span className="block text-sm font-bold text-commo-ink">{option}</span>
                {field.optionDescriptions?.[option] ? (
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{field.optionDescriptions[option]}</span>
                ) : null}
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
      <input
        type={field.type}
        value={value}
        min={field.min}
        inputMode={field.type === "tel" ? "tel" : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className={inputClass}
        style={{ caretColor: config.accent }}
      />
    </label>
  );
}

function SummaryStrip({
  config,
  summary,
}: {
  config: ReservationTemplateConfig;
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

function ConfirmPanel({ config, values }: { config: ReservationTemplateConfig; values: Record<string, string> }) {
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

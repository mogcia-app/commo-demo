"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getReservationDemoConfig,
  type IndustryType,
  type ReservationDemoConfig,
  type ReservationField,
} from "@/lib/reservation-demos";

type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl: string;
};

const demoProfile: LineProfile = {
  userId: "demo-line-user",
  displayName: "LINE Demo User",
  pictureUrl: "",
};

export function ReserveForm({ industryType = "salon" }: { industryType?: IndustryType }) {
  const config = getReservationDemoConfig(industryType);
  const router = useRouter();
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [liffState, setLiffState] = useState("LIFFを確認しています");
  const [values, setValues] = useState<Record<string, string>>(config.defaults);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues(config.defaults);
  }, [config]);

  useEffect(() => {
    let ignore = false;

    async function initLiff() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!liffId) {
        setProfile(demoProfile);
        setLiffState("デモプロフィールで表示中");
        return;
      }

      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });

        if (!liff.isInClient()) {
          setProfile(demoProfile);
          setLiffState("ブラウザプレビュー用のデモプロフィールで表示中");
          return;
        }

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const lineProfile = await liff.getProfile();
        if (!ignore) {
          setProfile({
            userId: lineProfile.userId,
            displayName: lineProfile.displayName,
            pictureUrl: lineProfile.pictureUrl ?? "",
          });
          setLiffState("LINEプロフィールを取得しました");
        }
      } catch (cause) {
        console.error(cause);
        if (!ignore) {
          setProfile(demoProfile);
          setLiffState("LIFF初期化に失敗したためデモプロフィールで表示中");
        }
      }
    }

    initLiff();

    return () => {
      ignore = true;
    };
  }, []);

  const canSubmit = useMemo(() => {
    const requiredFieldsFilled = config.fields
      .filter((field) => field.required)
      .every((field) => values[field.key]?.trim());

    return Boolean(profile && requiredFieldsFilled && !isSubmitting);
  }, [config.fields, isSubmitting, profile, values]);

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

      router.push(`/reserve/complete?industry=${config.industryType}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "予約の作成に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-md px-4 py-5"
      style={{
        background: `linear-gradient(180deg, ${config.softAccent} 0%, rgba(255,255,255,0) 260px)`,
      }}
    >
      <ReservationHero config={config} />

      <section className="mb-4 rounded-md border border-purple-100 bg-white/80 p-4 shadow-sm">
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
          <div>
            <p className="text-sm font-semibold text-commo-ink">{profile?.displayName ?? "取得中"}</p>
            <p className="text-xs text-slate-500">{profile?.userId ?? "LINE userIdを確認しています"}</p>
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className="space-y-4 rounded-md bg-white p-5 shadow-soft">
        {config.fields.map((field) => (
          <ReservationInput
            key={field.key}
            field={field}
            value={values[field.key] ?? ""}
            accent={config.accent}
            onChange={(value) => updateValue(field.key, value)}
          />
        ))}

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-md px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
          style={{ backgroundColor: canSubmit ? config.accent : undefined }}
        >
          {isSubmitting ? "予約しています" : config.submitLabel}
        </button>
      </form>
    </main>
  );
}

function ReservationHero({ config }: { config: ReservationDemoConfig }) {
  return (
    <div className="mb-5 overflow-hidden rounded-md bg-white shadow-soft">
      <div className="relative min-h-36 p-5" style={{ backgroundColor: config.softAccent }}>
        <div className="relative z-10">
          <p className="text-sm font-semibold" style={{ color: config.accent }}>
            commo. {config.heroNote}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-commo-ink">{config.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{config.lead}</p>
        </div>
        <div
          className="absolute right-5 top-5 h-20 w-20 rounded-full opacity-20"
          style={{ backgroundColor: config.accent }}
        />
        <div
          className="absolute bottom-4 right-16 h-10 w-24 rounded-md opacity-20"
          style={{ backgroundColor: config.accent }}
        />
      </div>
    </div>
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

  return (
    <label className="block">
      <span className="text-sm font-semibold text-commo-ink">{field.label}</span>
      {field.type === "select" ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : null}

      {field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={inputClass}
        />
      ) : null}

      {field.type !== "select" && field.type !== "textarea" ? (
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
      ) : null}
    </label>
  );
}

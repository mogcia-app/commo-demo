"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLineProfile } from "@/hooks/use-line-profile";
import type { AvailableSlot, Menu, Question, Staff, Store } from "@/lib/storefront/types";
import {
  Calendar,
  CustomerForm,
  LineLoginButton,
  MenuSelector,
  OptionalModules,
  Questionnaire,
  StaffSelector,
} from "./reservation-form-parts";

type StepKey = "line" | "menu" | "staff" | "details" | "date" | "questions" | "confirm";

const stepLabels: Record<StepKey, string> = {
  line: "LINE",
  menu: "メニュー",
  staff: "スタッフ",
  details: "人数・連絡先",
  date: "日時",
  questions: "質問",
  confirm: "確認",
};

export function ReservationForm({
  store,
  menus,
  staff,
  questions,
  availableSlots,
  attribution,
}: {
  store: Store;
  menus: Menu[];
  staff: Staff[];
  questions: Question[];
  availableSlots: AvailableSlot[];
  attribution?: ReservationAttribution;
}) {
  const router = useRouter();
  const { profile, liffState } = useLineProfile({ loginRedirectPath: `/${store.slug}/reserve` });
  const steps = useMemo(() => buildSteps(store, staff, questions), [store, staff, questions]);
  const pageViewLoggedRef = useRef(false);
  const reservationStartLoggedRef = useRef(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [menuId, setMenuId] = useState(menus[0]?.id ?? "");
  const [staffId, setStaffId] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(availableSlots[0]?.date ?? "");
  const [time, setTime] = useState(availableSlots[0]?.time ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = steps[stepIndex];
  const selectedMenu = menus.find((menu) => menu.id === menuId);
  const selectedStaff = staff.find((member) => member.id === staffId);
  const customerName = displayName || profile?.displayName || "";
  const source = "liff";

  useEffect(() => {
    if (!profile || pageViewLoggedRef.current) {
      return;
    }

    pageViewLoggedRef.current = true;
    void logAnalyticsEvent(store.slug, {
      eventType: "reservation_page_view",
      source,
      lineUserId: profile.userId,
      campaignId: attribution?.campaignId,
      couponId: attribution?.couponId,
      metadata: { liffState },
    });

    if (attribution?.campaignId || attribution?.couponId) {
      void logAnalyticsEvent(store.slug, {
        eventType: "line_link_click",
        source: "line",
        lineUserId: profile.userId,
        campaignId: attribution.campaignId,
        couponId: attribution.couponId,
      });
    }
  }, [attribution?.campaignId, attribution?.couponId, liffState, profile, store.slug]);

  function updateAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function canProceed() {
    if (currentStep === "menu") return Boolean(menuId);
    if (currentStep === "details") return Boolean(customerName.trim() && phone.trim());
    if (currentStep === "date") return Boolean(date && time);
    if (currentStep === "questions") {
      return questions.every((question) => !question.required || answers[question.id]?.trim());
    }
    return true;
  }

  async function submitReservation() {
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/stores/${store.slug}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineUserId: profile?.userId ?? "demo-line-user",
          lineDisplayName: profile?.displayName ?? customerName,
          linePictureUrl: profile?.pictureUrl ?? "",
          displayName: customerName,
          phone,
          email,
          menuId,
          staffId,
          guestCount,
          date,
          time,
          answers,
          notes,
          source,
          campaignId: attribution?.campaignId,
          couponId: attribution?.couponId,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "予約の作成に失敗しました。");
      }

      const body = (await response.json()) as { reservation: { id: string } };
      const completeParams = new URLSearchParams({ reservationId: body.reservation.id });

      if (attribution?.campaignId) {
        completeParams.set("campaignId", attribution.campaignId);
      }

      if (attribution?.couponId) {
        completeParams.set("couponId", attribution.couponId);
      }

      router.push(`/${store.slug}/complete?${completeParams.toString()}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "予約の作成に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canProceed()) {
      setError("必要な項目を入力してください。");
      return;
    }

    if (currentStep === "confirm") {
      void submitReservation();
      return;
    }

    if (!reservationStartLoggedRef.current) {
      reservationStartLoggedRef.current = true;
      void logAnalyticsEvent(store.slug, {
        eventType: "reservation_start",
        source,
        lineUserId: profile?.userId ?? "demo-line-user",
        campaignId: attribution?.campaignId,
        couponId: attribution?.couponId,
        metadata: { fromStep: currentStep },
      });
    }

    setError("");
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[var(--store-radius)] bg-white p-5 shadow-sm">
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => (
          <span
            key={step}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-bold"
            style={{
              backgroundColor: index <= stepIndex ? "var(--store-secondary)" : "#F1F5F9",
              color: index <= stepIndex ? "var(--store-primary)" : "#64748B",
            }}
          >
            {stepLabels[step]}
          </span>
        ))}
      </div>

      <h2 className="text-xl font-bold">{stepLabels[currentStep]}</h2>
      <div className="mt-5">
        {currentStep === "line" ? <LineLoginButton liffState={liffState} /> : null}
        {currentStep === "menu" ? <MenuSelector menus={menus} value={menuId} onChange={setMenuId} /> : null}
        {currentStep === "staff" ? <StaffSelector staff={staff} value={staffId} onChange={setStaffId} /> : null}
        {currentStep === "details" ? (
          <div className="grid gap-5">
            <CustomerForm
              displayName={customerName}
              phone={phone}
              email={email}
              onDisplayNameChange={setDisplayName}
              onPhoneChange={setPhone}
              onEmailChange={setEmail}
            />
            <OptionalModules
              modules={store.modules}
              guestCount={guestCount}
              notes={notes}
              onGuestCountChange={setGuestCount}
              onNotesChange={setNotes}
            />
          </div>
        ) : null}
        {currentStep === "date" ? (
          <Calendar
            availableSlots={availableSlots}
            value={`${date} ${time}`}
            onChange={(nextDate, nextTime) => {
              setDate(nextDate);
              setTime(nextTime);
            }}
          />
        ) : null}
        {currentStep === "questions" ? (
          <Questionnaire questions={questions} answers={answers} onChange={updateAnswer} />
        ) : null}
        {currentStep === "confirm" ? (
          <ConfirmView
            selectedMenu={selectedMenu?.name ?? ""}
            selectedStaff={selectedStaff?.name ?? "指名なし"}
            guestCount={guestCount}
            displayName={customerName}
            phone={phone}
            email={email}
            date={date}
            time={time}
            notes={notes}
          />
        ) : null}
      </div>

      {error ? <p className="mt-4 rounded-[var(--store-radius)] bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 grid grid-cols-[0.8fr_1.2fr] gap-3">
        <button
          type="button"
          onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
          disabled={stepIndex === 0 || isSubmitting}
          className="rounded-[var(--store-radius)] border border-slate-200 px-4 py-3 text-sm font-bold disabled:opacity-40"
        >
          戻る
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-[var(--store-radius)] px-4 py-3 text-sm font-bold text-white disabled:bg-slate-300"
          style={{ backgroundColor: isSubmitting ? undefined : "var(--store-primary)" }}
        >
          {isSubmitting ? "予約しています" : currentStep === "confirm" ? "予約を確定する" : "次へ"}
        </button>
      </div>
    </form>
  );
}

type ReservationAttribution = {
  campaignId?: string;
  couponId?: string;
};

type AnalyticsEventPayload = {
  eventType: string;
  source: "line" | "liff" | "web";
  lineUserId?: string;
  customerId?: string;
  campaignId?: string;
  couponId?: string;
  reservationId?: string;
  metadata?: Record<string, unknown>;
};

async function logAnalyticsEvent(storeSlug: string, payload: AnalyticsEventPayload) {
  await fetch(`/api/stores/${storeSlug}/analytics-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function buildSteps(store: Store, staff: Staff[], questions: Question[]): StepKey[] {
  return [
    "line",
    "menu",
    ...(store.modules.showStaffSelect && staff.length ? (["staff"] as const) : []),
    "details",
    "date",
    ...(store.modules.showQuestionnaire && questions.length ? (["questions"] as const) : []),
    "confirm",
  ];
}

function ConfirmView({
  selectedMenu,
  selectedStaff,
  guestCount,
  displayName,
  phone,
  email,
  date,
  time,
  notes,
}: {
  selectedMenu: string;
  selectedStaff: string;
  guestCount: number;
  displayName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  notes: string;
}) {
  const rows = [
    ["メニュー", selectedMenu],
    ["スタッフ", selectedStaff],
    ["人数", `${guestCount}名`],
    ["お名前", displayName],
    ["電話番号", phone],
    ["メール", email || "未入力"],
    ["日時", `${date} ${time}`],
    ["備考", notes || "なし"],
  ];

  return (
    <div className="divide-y divide-slate-100 rounded-[var(--store-radius)] border border-slate-200">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[110px_1fr] gap-4 px-4 py-3 text-sm">
          <p className="font-bold" style={{ color: "var(--store-muted)" }}>
            {label}
          </p>
          <p className="font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}

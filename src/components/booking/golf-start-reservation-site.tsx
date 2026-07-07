"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLineProfile } from "@/hooks/use-line-profile";
import type { BookingSite } from "@/lib/booking-sites";
import {
  golfCourses,
  golfPlayerCounts,
  golfPlans,
  golfTheme as theme,
  type GolfPlayDate,
  type GolfCourse,
  type GolfPlan,
} from "@/lib/booking/golf-start-config";
import type { AvailableSlot, Menu } from "@/lib/storefront/types";

type GolfStep = "plan" | "schedule" | "confirm" | "customer" | "complete";

type CustomerForm = {
  name: string;
  kana: string;
  phone: string;
  email: string;
  address: string;
  companions: string;
  notes: string;
  agreed: boolean;
};

export function GolfStartReservationSite({ site }: { site: BookingSite }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLiveReservation = true;
  const campaignId = searchParams.get("campaignId")?.trim() || undefined;
  const couponId = searchParams.get("couponId")?.trim() || undefined;
  const loginRedirectPath = `${pathname}?${searchParams.toString()}`;
  const { profile } = useLineProfile({ loginRedirectPath });
  const [step, setStep] = useState<GolfStep>("plan");
  const [selectedPlanId, setSelectedPlanId] = useState(golfPlans[0].id);
  const [selectedPlayerCount, setSelectedPlayerCount] = useState(4);
  const [selectedPlayDateId, setSelectedPlayDateId] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [customer, setCustomer] = useState<CustomerForm>({
    name: "",
    kana: "",
    phone: "",
    email: "",
    address: "",
    companions: "3人",
    notes: "",
    agreed: false,
  });
  const [menus, setMenus] = useState<Menu[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCourse = golfCourses[0];
  const selectedPlan = golfPlans.find((plan) => plan.id === selectedPlanId) ?? golfPlans[0];
  const selectedPlayDate = buildGolfPlayDate(selectedPlayDateId);
  const totalPrice = selectedPlan.pricePerPerson * selectedPlayerCount;
  const reservationNumber = useMemo(() => `GOL${(selectedPlayDate.apiDate || getTodayValue()).replaceAll("-", "")}-0001`, [selectedPlayDate.apiDate]);
  const canSubmit = Boolean(
    customer.name.trim() &&
      customer.kana.trim() &&
      customer.phone.trim() &&
      customer.email.trim() &&
      customer.address.trim() &&
      customer.companions.trim() &&
      customer.agreed,
  );

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

  useEffect(() => {
    let ignore = false;

    async function loadAvailableSlots() {
      const response = await fetch("/api/available-slots");

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as { availableSlots?: AvailableSlot[] };
      const slots = body.availableSlots ?? [];

      if (ignore) {
        return;
      }

      setAvailableSlots(slots);

      const selectedSlotStillAvailable = slots.some((slot) => slot.date === selectedPlayDateId && slot.time === selectedStartTime);
      const fallbackSlot = slots[0];

      if (!selectedSlotStillAvailable && fallbackSlot) {
        setSelectedPlayDateId(fallbackSlot.date);
        setSelectedStartTime(fallbackSlot.time);
      }
    }

    void loadAvailableSlots();

    return () => {
      ignore = true;
    };
  }, [selectedPlayDateId, selectedStartTime]);

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("必須項目を入力し、利用規約に同意してください。");
      return;
    }

    if (!selectedPlayDateId || !selectedStartTime) {
      setError("プレー日とスタート時間を選択してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (isLiveReservation) {
        if (!profile) {
          throw new Error("LINEプロフィールを取得中です。少し待ってから再度お試しください。");
        }

        const selectedMenu = menus.find((menu) => menu.id === selectedPlanId) ?? menus[0];

        if (!selectedMenu) {
          throw new Error("予約メニューが見つかりません。メニュー設定を確認してください。");
        }

        const response = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuId: selectedMenu.id,
            date: selectedPlayDate.apiDate,
            time: selectedStartTime,
            lineUserId: profile.userId,
            lineDisplayName: profile.displayName,
            linePictureUrl: profile.pictureUrl,
            displayName: customer.name.trim(),
            phone: customer.phone.trim(),
            email: customer.email.trim(),
            answers: {
              bookingTemplate: site.slug,
              courseName: selectedCourse.name,
              selectedPlan: selectedPlan.name,
              playDate: selectedPlayDate.label,
              selectedStartTime,
              address: customer.address,
              companions: `${selectedPlayerCount}人`,
              notes: customer.notes,
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
      }

      setStep("complete");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "予約の作成に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6" style={{ backgroundColor: theme.background, color: theme.ink }}>
      <div className="mx-auto w-full max-w-md">
        <div>
          {step === "plan" ? (
          <PhoneFrame>
            <PlanStep
              selectedCourse={selectedCourse}
              selectedPlanId={selectedPlanId}
              selectedPlayerCount={selectedPlayerCount}
              onSelectPlan={setSelectedPlanId}
              onSelectPlayerCount={setSelectedPlayerCount}
              onNext={() => setStep("schedule")}
            />
          </PhoneFrame>
          ) : null}
          {step === "schedule" ? (
          <PhoneFrame>
            <ScheduleStep
              selectedPlayDateId={selectedPlayDateId}
              selectedStartTime={selectedStartTime}
              availableSlots={availableSlots}
              onSelectPlayDate={(date) => {
                const nextSlot = availableSlots.find((slot) => slot.date === date);
                setSelectedPlayDateId(date);
                setSelectedStartTime(nextSlot?.time ?? "");
              }}
              onSelectStartTime={setSelectedStartTime}
              onBack={() => setStep("plan")}
              onNext={() => setStep("confirm")}
            />
          </PhoneFrame>
          ) : null}
          {step === "confirm" ? (
          <PhoneFrame>
            <ConfirmStep
              selectedCourse={selectedCourse}
              selectedPlan={selectedPlan}
              selectedPlayDate={selectedPlayDate}
              selectedStartTime={selectedStartTime}
              selectedPlayerCount={selectedPlayerCount}
              totalPrice={totalPrice}
              onBack={() => setStep("schedule")}
              onNext={() => setStep("customer")}
            />
          </PhoneFrame>
          ) : null}
          {step === "customer" ? (
          <PhoneFrame>
            <CustomerStep
              customer={customer}
              error={error}
              isSubmitting={isSubmitting}
              canSubmit={canSubmit}
              onChange={setCustomer}
              onBack={() => setStep("confirm")}
              onSubmit={submitReservation}
            />
          </PhoneFrame>
          ) : null}
          {step === "complete" ? (
          <PhoneFrame>
            <CompleteStep
              reservationNumber={reservationNumber}
              selectedCourse={selectedCourse}
              selectedPlan={selectedPlan}
              selectedPlayDate={selectedPlayDate}
              selectedStartTime={selectedStartTime}
              selectedPlayerCount={selectedPlayerCount}
              totalPrice={totalPrice}
              customer={customer}
              onRestart={() => setStep("plan")}
            />
          </PhoneFrame>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <section className="min-h-[690px] overflow-hidden rounded-2xl border bg-white shadow-[0_18px_48px_rgba(43,90,43,0.10)] transition" style={{ borderColor: theme.green }}>
      {children}
    </section>
  );
}

function PhoneHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="flex h-14 items-center border-b px-4" style={{ borderColor: "#E5F0E1" }}>
      {onBack ? (
        <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition" aria-label="戻る">
          ‹
        </button>
      ) : (
        <div className="h-9 w-9" aria-hidden="true" />
      )}
      <p className="flex-1 pr-9 text-center text-sm font-bold">{title}</p>
    </div>
  );
}

function PlanStep({
  selectedCourse,
  selectedPlanId,
  selectedPlayerCount,
  onSelectPlan,
  onSelectPlayerCount,
  onNext,
}: {
  selectedCourse: GolfCourse;
  selectedPlanId: string;
  selectedPlayerCount: number;
  onSelectPlan: (planId: string) => void;
  onSelectPlayerCount: (count: number) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <PhoneHeader title="プラン選択" />
      <div className="space-y-4 p-4">
        <HeroImage label="COURSE" tall />
        <CourseSummary course={selectedCourse} />
        <div>
          <SectionTitle>プランを選択</SectionTitle>
          <div className="mt-3 space-y-2">
            {golfPlans.map((plan) => {
              const selected = selectedPlanId === plan.id;
              return (
                <button key={plan.id} type="button" onClick={() => onSelectPlan(plan.id)} className="w-full rounded-xl border p-3 text-left" style={{ borderColor: selected ? theme.green : theme.border, backgroundColor: selected ? theme.soft : theme.surface }}>
                  <p className="text-sm font-bold">{plan.name}</p>
                  <p className="mt-1 text-lg font-bold">¥{plan.pricePerPerson.toLocaleString()} / 1人</p>
                  <p className="mt-1 text-xs" style={{ color: theme.muted }}>{plan.description}</p>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <SectionTitle>人数を選択</SectionTitle>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {golfPlayerCounts.map((count) => {
              const selected = selectedPlayerCount === count;
              return (
                <button key={count} type="button" onClick={() => onSelectPlayerCount(count)} className="h-11 rounded-lg border text-sm font-bold transition" style={{ borderColor: selected ? theme.green : theme.border, backgroundColor: selected ? theme.green : theme.surface, color: selected ? "#FFFFFF" : theme.ink }}>
                  {count}人
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-xs" style={{ color: theme.muted }}>※ 表示料金は税抜きです</p>
        <PrimaryButton onClick={onNext}>次へ（日時検索へ）</PrimaryButton>
      </div>
    </div>
  );
}

function ScheduleStep({
  selectedPlayDateId,
  selectedStartTime,
  availableSlots,
  onSelectPlayDate,
  onSelectStartTime,
  onBack,
  onNext,
}: {
  selectedPlayDateId: string;
  selectedStartTime: string;
  availableSlots: AvailableSlot[];
  onSelectPlayDate: (dateId: string) => void;
  onSelectStartTime: (time: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const playDates = buildGolfPlayDates(availableSlots);
  const slotsForSelectedDate = availableSlots.filter((slot) => slot.date === selectedPlayDateId);
  const selectedMonthLabel = selectedPlayDateId ? formatMonthLabel(selectedPlayDateId) : "空き枠未設定";

  return (
    <div>
      <PhoneHeader title="日時検索" onBack={onBack} />
      <div className="space-y-4 p-4">
        <section className="rounded-2xl border bg-white p-3 text-left shadow-sm" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between gap-3 px-1">
            <h3 className="text-sm font-bold">プレー日</h3>
            <span className="rounded-full bg-[#F4FAF2] px-3 py-1 text-xs font-bold" style={{ color: theme.green }}>
              {selectedMonthLabel}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-4 rounded-2xl bg-[#F4FAF2] p-1">
            {!playDates.length ? (
              <p className="col-span-4 px-3 py-4 text-center text-xs font-semibold" style={{ color: theme.muted }}>
                選択できる日付がありません。
              </p>
            ) : null}
            {playDates.map((date) => {
              const selected = selectedPlayDateId === date.id;
              const [day, weekday] = date.shortLabel.split("\n");
              const dayNumber = day.replace("7/", "");
              return (
                <button
                  key={date.id}
                  type="button"
                  onClick={() => onSelectPlayDate(date.id)}
                  className="relative rounded-xl px-2 py-2 text-center transition"
                  style={{
                    backgroundColor: selected ? theme.surface : "transparent",
                    color: selected ? theme.greenDark : theme.ink,
                    boxShadow: selected ? "0 8px 18px rgba(47,107,47,0.12)" : "none",
                  }}
                >
                  <span className="block text-[10px] font-bold" style={{ color: selected ? theme.green : theme.muted }}>{weekday}</span>
                  <span className="mt-1 block text-lg font-bold leading-none">{dayNumber}</span>
                  <span className="mx-auto mt-2 block h-1 w-5 rounded-full" style={{ backgroundColor: selected ? theme.green : "transparent" }} />
                </button>
              );
            })}
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-4 text-left shadow-sm" style={{ borderColor: theme.border }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.green }}>Tee time</p>
              <h3 className="mt-1 text-sm font-bold">スタート時間</h3>
              <p className="mt-1 text-xs" style={{ color: theme.muted }}>30分刻みで空き状況を表示</p>
            </div>
            <div className="rounded-full bg-[#F4FAF2] px-3 py-1 text-[11px] font-bold" style={{ color: theme.green }}>
              ○ 予約可 / × 不可
            </div>
          </div>
          <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {!slotsForSelectedDate.length ? (
              <p className="rounded-xl bg-[#F4FAF2] px-3 py-4 text-center text-xs font-semibold" style={{ color: theme.muted }}>
                選択できるスタート時間がありません。
              </p>
            ) : null}
            {slotsForSelectedDate.map((slot) => {
              const selected = selectedStartTime === slot.time;
              const isMorning = Number(slot.time.split(":")[0]) < 10;
              const available = slot.available !== false && slot.remaining > 0;
              return (
                <div key={slot.time} className="grid grid-cols-[74px_1fr] items-stretch gap-2">
                  <div className="flex flex-col items-center justify-center rounded-xl bg-[#F4FAF2] px-2 py-2">
                    <span className="text-sm font-bold">{slot.time}</span>
                    <span className="mt-0.5 text-[10px]" style={{ color: theme.muted }}>{isMorning ? "午前" : "昼前"}</span>
                  </div>
                  <button
                    type="button"
                    disabled={!available}
                    onClick={() => onSelectStartTime(slot.time)}
                    className="flex min-h-14 items-center justify-between rounded-xl border px-4 text-left transition disabled:bg-[#F7F8F6]"
                    style={{ borderColor: selected ? theme.green : theme.border, backgroundColor: selected ? theme.green : theme.surface, color: selected ? "#FFFFFF" : available ? theme.ink : "#A8B0A6" }}
                    aria-label={`${slot.time} ${available ? "予約できます" : "予約できません"}`}
                  >
                    <span>
                      <span className="block text-sm font-bold">{available ? `残り${slot.remaining}枠` : "予約不可"}</span>
                      <span className="mt-0.5 block text-[11px]" style={{ color: selected ? "#E8F5E4" : available ? theme.muted : "#A8B0A6" }}>
                        {available ? "この枠を選択" : "別の時間をお選びください"}
                      </span>
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold" style={{ color: available ? theme.green : "#A8B0A6" }}>
                      {available ? "○" : "×"}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
        <PrimaryButton onClick={onNext}>次へ（予約内容確認へ）</PrimaryButton>
        <SecondaryButton onClick={onBack}>戻る</SecondaryButton>
      </div>
    </div>
  );
}

function ConfirmStep({
  selectedCourse,
  selectedPlan,
  selectedPlayDate,
  selectedStartTime,
  selectedPlayerCount,
  totalPrice,
  onBack,
  onNext,
}: {
  selectedCourse: GolfCourse;
  selectedPlan: GolfPlan;
  selectedPlayDate: GolfPlayDate;
  selectedStartTime: string;
  selectedPlayerCount: number;
  totalPrice: number;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <PhoneHeader title="予約内容確認" onBack={onBack} />
      <div className="space-y-4 p-4">
        <p className="text-xs leading-5" style={{ color: theme.muted }}>予約内容をご確認のうえ、次へお進みください。</p>
        <Card>
          <SectionTitle>ゴルフ場</SectionTitle>
          <p className="mt-3 text-sm font-bold">{selectedCourse.name}</p>
          <p className="mt-1 text-xs" style={{ color: theme.muted }}>{selectedCourse.area}</p>
          <div className="mt-4 space-y-3 text-sm">
            <DetailRow label="プレー日" value={selectedPlayDate.label} />
            <DetailRow label="スタート時間" value={selectedStartTime} />
            <DetailRow label="プラン" value={selectedPlan.name} />
            <DetailRow label="人数" value={`${selectedPlayerCount}人`} />
            <DetailRow label="合計金額" value={`¥${totalPrice.toLocaleString()}`} strong />
          </div>
        </Card>
        <PrimaryButton onClick={onNext}>次へ（お客様情報入力へ）</PrimaryButton>
        <SecondaryButton onClick={onBack}>戻る</SecondaryButton>
      </div>
    </div>
  );
}

function CustomerStep({
  customer,
  error,
  isSubmitting,
  canSubmit,
  onChange,
  onBack,
  onSubmit,
}: {
  customer: CustomerForm;
  error: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  onChange: (customer: CustomerForm) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function update(key: keyof CustomerForm, value: string | boolean) {
    onChange({ ...customer, [key]: value });
  }

  return (
    <div>
      <PhoneHeader title="お客様情報入力" onBack={onBack} />
      <form onSubmit={onSubmit} className="space-y-3 p-4">
        <p className="text-xs" style={{ color: theme.muted }}>予約に必要なお客様情報を入力してください。</p>
        <TextField label="代表者名" required value={customer.name} placeholder="山田 太郎" onChange={(value) => update("name", value)} />
        <TextField label="フリガナ" required value={customer.kana} placeholder="ヤマダ タロウ" onChange={(value) => update("kana", value)} />
        <TextField label="電話番号" required value={customer.phone} placeholder="090-1234-5678" onChange={(value) => update("phone", value)} />
        <TextField label="メールアドレス" required value={customer.email} placeholder="example@email.com" onChange={(value) => update("email", value)} />
        <TextField label="住所" required value={customer.address} placeholder="〒150-0001 東京都..." onChange={(value) => update("address", value)} />
        <TextField label="同伴者人数" required value={customer.companions} placeholder="3人" onChange={(value) => update("companions", value)} />
        <label className="block">
          <span className="text-sm font-bold">ご要望</span>
          <textarea value={customer.notes} onChange={(event) => update("notes", event.target.value)} placeholder="ご要望があればご入力ください" className="mt-2 min-h-20 w-full rounded-lg border px-3 py-3 text-sm outline-none" style={{ borderColor: theme.border }} />
        </label>
        <label className="flex items-start gap-2 text-xs" style={{ color: theme.muted }}>
          <input type="checkbox" checked={customer.agreed} onChange={(event) => update("agreed", event.target.checked)} className="mt-0.5 h-4 w-4 rounded" />
          <span>利用規約・プライバシーポリシーに同意する</span>
        </label>
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={!canSubmit || isSubmitting} className="h-12 w-full rounded-xl text-sm font-bold text-white transition disabled:bg-[#BFD3B9]" style={{ backgroundColor: canSubmit && !isSubmitting ? theme.green : undefined }}>
          {isSubmitting ? "予約しています" : "確認画面へ"}
        </button>
        <SecondaryButton onClick={onBack}>戻る</SecondaryButton>
      </form>
    </div>
  );
}

function CompleteStep({
  reservationNumber,
  selectedCourse,
  selectedPlan,
  selectedPlayDate,
  selectedStartTime,
  selectedPlayerCount,
  totalPrice,
  customer,
  onRestart,
}: {
  reservationNumber: string;
  selectedCourse: GolfCourse;
  selectedPlan: GolfPlan;
  selectedPlayDate: GolfPlayDate;
  selectedStartTime: string;
  selectedPlayerCount: number;
  totalPrice: number;
  customer: CustomerForm;
  onRestart: () => void;
}) {
  return (
    <div>
      <PhoneHeader title="予約完了" onBack={onRestart} />
      <div className="space-y-4 p-4 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 text-4xl" style={{ borderColor: theme.green, color: theme.green }}>✓</div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: theme.greenDark }}>ご予約が完了しました！</h2>
          <p className="mt-3 text-xs leading-6" style={{ color: theme.muted }}>ご登録のメールアドレスに予約確認メールをお送りしました。</p>
        </div>
        <Card>
          <DetailBlock label="予約番号" value={reservationNumber} />
          <DetailBlock label="ゴルフ場" value={selectedCourse.name} />
          <DetailBlock label="プレー日" value={selectedPlayDate.label} />
          <DetailBlock label="スタート時間" value={selectedStartTime} />
          <DetailBlock label="プラン" value={selectedPlan.name} />
          <DetailBlock label="人数" value={`${selectedPlayerCount}人`} />
          <DetailBlock label="代表者名" value={customer.name || "山田 太郎"} />
          <DetailBlock label="電話番号" value={customer.phone || "090-1234-5678"} />
          <DetailBlock label="メールアドレス" value={customer.email || "example@email.com"} />
          <DetailBlock label="合計金額" value={`¥${totalPrice.toLocaleString()}`} />
        </Card>
        <PrimaryButton onClick={onRestart}>予約一覧へ</PrimaryButton>
        <SecondaryButton onClick={onRestart}>トップページへ</SecondaryButton>
      </div>
    </div>
  );
}

function CourseSummary({ course }: { course: GolfCourse }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{course.name}</h2>
      <p className="mt-1 text-xs" style={{ color: theme.muted }}>{course.area}</p>
    </div>
  );
}

function HeroImage({ label, tall = false, compact = false }: { label: string; tall?: boolean; compact?: boolean }) {
  if (tall) {
    return (
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-[#EEF8EB]">
        <Image
          src="/golf-start.png"
          alt={label}
          fill
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-[#BFE6B8] to-[#EEF8EB] font-bold text-[#2F6B2F] ${compact ? "h-20 w-20 rounded-lg text-xs" : "aspect-video w-full rounded-xl text-xs"}`}>
      {label}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-xl border bg-white p-4 text-left" style={{ borderColor: theme.border }}>{children}</section>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-bold">{children}</h3>;
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-12 w-full rounded-xl text-sm font-bold text-white shadow-[0_14px_28px_rgba(47,107,47,0.22)]" style={{ backgroundColor: theme.green }}>{children}</button>;
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-12 w-full rounded-xl border bg-white text-sm font-bold" style={{ borderColor: theme.green, color: theme.green }}>{children}</button>;
}

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-bold" : ""}`}>
      <span style={{ color: theme.muted }}>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b py-2 last:border-b-0" style={{ borderColor: theme.border }}>
      <p className="text-xs font-bold">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function buildGolfPlayDates(slots: AvailableSlot[]): GolfPlayDate[] {
  const dates = Array.from(new Set(slots.map((slot) => slot.date))).sort();

  return dates.map(buildGolfPlayDate);
}

function buildGolfPlayDate(date: string): GolfPlayDate {
  const parsed = new Date(`${date}T00:00:00+09:00`);

  if (!date || Number.isNaN(parsed.getTime())) {
    return {
      id: "",
      label: "日付未選択",
      shortLabel: "-\n-",
      apiDate: "",
    };
  }

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return {
    id: date,
    label: `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日（${weekdays[parsed.getDay()]}）`,
    shortLabel: `${parsed.getMonth() + 1}/${parsed.getDate()}\n${weekdays[parsed.getDay()]}`,
    apiDate: date,
  };
}

function formatMonthLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00+09:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "空き枠";
  }

  return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function getTodayValue() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function TextField({ label, required, value, placeholder, onChange }: { label: string; required?: boolean; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">
        {label}
        {required ? <span className="ml-1 text-xs" style={{ color: theme.green }}>必須</span> : null}
      </span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition" style={{ borderColor: theme.border }} />
    </label>
  );
}

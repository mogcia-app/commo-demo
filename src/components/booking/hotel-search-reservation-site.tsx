"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLineProfile } from "@/hooks/use-line-profile";
import type { BookingSite } from "@/lib/booking-sites";
import type { AvailableSlot, Menu } from "@/lib/storefront/types";
import { LineAuthStatus } from "./line-auth-status";

type HotelStep = "search" | "detail" | "confirm" | "customer" | "complete";

type CustomerForm = {
  name: string;
  kana: string;
  phone: string;
  email: string;
  address: string;
  guests: string;
  notes: string;
  agreed: boolean;
};

type HotelPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  labels: string[];
};

const theme = {
  background: "#F5F8F7",
  surface: "#FFFFFF",
  border: "#D8E4E7",
  soft: "#EEF5F4",
  pink: "#2F5D7C",
  pinkDark: "#24475F",
  green: "#48B879",
  ink: "#24313A",
  muted: "#687780",
};

const searchDefaults = {
  area: "東京, 日本",
  guests: "大人2名 / 1部屋",
};

const hotel = {
  name: "ホテルサニートーキョー",
  area: "東京都 新宿区",
  address: "東京都 新宿区西新宿1-2-3",
  rating: "4.5",
  reviews: "865件",
  imageLabel: "HOTEL",
};

const fallbackPlans: HotelPlan[] = [
  {
    id: "standard",
    name: "スタンダードプラン",
    description: "シンプルでお得な人気プラン",
    price: 12800,
    labels: ["朝食付き", "キャンセル無料"],
  },
  {
    id: "superior",
    name: "スーペリアプラン",
    description: "広めのお部屋で快適ステイ",
    price: 16800,
    labels: ["朝食付き", "キャンセル無料"],
  },
  {
    id: "deluxe",
    name: "デラックスプラン",
    description: "眺望の良い上層階ルーム",
    price: 22800,
    labels: ["朝食・ラウンジ付き"],
  },
];

function buildHotelPlans(menus: Menu[]): HotelPlan[] {
  if (!menus.length) {
    return fallbackPlans;
  }

  return menus.map((menu) => ({
    id: menu.id,
    name: menu.name,
    description: menu.description || "予約ページに表示するプランです。",
    price: menu.price ?? parsePrice(menu.priceLabel) ?? 0,
    labels: buildPlanLabels(menu),
  }));
}

function buildPlanLabels(menu: Menu) {
  const labels = [menu.category === "room" ? "宿泊プラン" : menu.category, `${Math.round(menu.durationMinutes / 60)}時間`].filter(Boolean);

  return labels.length ? labels : ["LINE予約"];
}

function parsePrice(priceLabel: string) {
  const numeric = Number(priceLabel.replace(/[^\d]/g, ""));

  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

export function HotelSearchReservationSite({ site }: { site: BookingSite }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLiveReservation = true;
  const campaignId = searchParams.get("campaignId")?.trim() || undefined;
  const couponId = searchParams.get("couponId")?.trim() || undefined;
  const initialStep = searchParams.get("step") === "complete" ? "complete" : "search";
  const search = searchParams.toString();
  const loginRedirectPath = search ? `${pathname}?${search}` : pathname;
  const { profile, liffState, authVerified } = useLineProfile({ loginRedirectPath });
  const [step, setStep] = useState<HotelStep>(initialStep);
  const [selectedPlanId, setSelectedPlanId] = useState(fallbackPlans[0].id);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customer, setCustomer] = useState<CustomerForm>({
    name: "",
    kana: "",
    phone: "",
    email: "",
    address: "",
    guests: "大人2名 / 1部屋",
    notes: "",
    agreed: false,
  });
  const [menus, setMenus] = useState<Menu[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayPlans = useMemo(() => buildHotelPlans(menus), [menus]);
  const selectedPlan = displayPlans.find((plan) => plan.id === selectedPlanId) ?? displayPlans[0];
  const reservationNumber = useMemo(() => `R-${(selectedDate || getTodayValue()).replaceAll("-", "")}-123456`, [selectedDate]);
  const canSubmit = Boolean(
    customer.name.trim() &&
      customer.kana.trim() &&
      customer.phone.trim() &&
      customer.email.trim() &&
      customer.address.trim() &&
      customer.guests.trim() &&
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
    if (!displayPlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(displayPlans[0].id);
    }
  }, [displayPlans, selectedPlanId]);

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

      const selectedSlotStillAvailable = slots.some((slot) => slot.date === selectedDate && slot.time === selectedTime);
      const fallbackSlot = slots[0];

      if (!selectedSlotStillAvailable && fallbackSlot) {
        setSelectedDate(fallbackSlot.date);
        setSelectedTime(fallbackSlot.time);
      }
    }

    void loadAvailableSlots();

    return () => {
      ignore = true;
    };
  }, [selectedDate, selectedTime]);

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("必須項目を入力し、利用規約に同意してください。");
      return;
    }

    if (!selectedDate || !selectedTime) {
      setError("宿泊日とチェックイン時間を選択してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (isLiveReservation) {
        if (!profile) {
          throw new Error("LINEプロフィールを取得中です。少し待ってから再度お試しください。");
        }

        const selectedMenu = menus.find((menu) => menu.id === selectedPlan.id) ?? menus[0];

        if (!selectedMenu) {
          throw new Error("予約メニューが見つかりません。メニュー設定を確認してください。");
        }

        const response = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuId: selectedMenu.id,
            date: selectedDate,
            time: selectedTime,
            lineUserId: profile.userId,
            lineDisplayName: profile.displayName,
            linePictureUrl: profile.pictureUrl,
            displayName: customer.name.trim(),
            phone: customer.phone.trim(),
            email: customer.email.trim(),
            answers: {
              bookingTemplate: site.slug,
              hotelName: hotel.name,
              selectedPlan: selectedPlan.name,
              address: customer.address,
              guests: customer.guests,
              checkInTime: selectedTime,
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
        <LineAuthStatus verified={authVerified} state={liffState} />
        <div>
          {step === "search" ? (
          <PhoneFrame>
            <SearchStep
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              availableSlots={availableSlots}
              onSelectDate={(date) => {
                const nextSlot = availableSlots.find((slot) => slot.date === date);
                setSelectedDate(date);
                setSelectedTime(nextSlot?.time ?? "");
              }}
              onSelectTime={(time) => {
                setSelectedTime(time);
              }}
              onNext={() => setStep("detail")}
            />
          </PhoneFrame>
          ) : null}
          {step === "detail" ? (
          <PhoneFrame>
            <DetailStep plans={displayPlans} selectedPlanId={selectedPlanId} onSelectPlan={setSelectedPlanId} onBack={() => setStep("search")} onNext={() => setStep("confirm")} />
          </PhoneFrame>
          ) : null}
          {step === "confirm" ? (
          <PhoneFrame>
            <ConfirmStep
              selectedPlan={selectedPlan}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onBack={() => setStep("detail")}
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
              selectedPlan={selectedPlan}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              customer={customer}
              onRestart={() => setStep("search")}
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
    <section
      className="min-h-[690px] overflow-hidden rounded-2xl border bg-white shadow-[0_18px_48px_rgba(123,65,88,0.10)] transition"
      style={{ borderColor: theme.pink }}
    >
      {children}
    </section>
  );
}

function PhoneHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="flex h-14 items-center border-b px-4" style={{ borderColor: "#E2EBEE" }}>
      <button type="button" onClick={onBack} disabled={!onBack} className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition disabled:opacity-30" aria-label="戻る">
        ‹
      </button>
      <p className="flex-1 pr-9 text-center text-sm font-bold">{title}</p>
    </div>
  );
}

function SearchStep({
  selectedDate,
  selectedTime,
  availableSlots,
  onSelectDate,
  onSelectTime,
  onNext,
}: {
  selectedDate: string;
  selectedTime: string;
  availableSlots: AvailableSlot[];
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onNext: () => void;
}) {
  const availableDates = buildAvailableDates(availableSlots);
  const slotsForSelectedDate = availableSlots.filter((slot) => slot.date === selectedDate);

  return (
    <div>
      <div className="space-y-3 p-4">
        <HotelIntro />
        <SelectField label="チェックイン" value={selectedDate} options={availableDates} icon="□" onChange={onSelectDate} />
        <SelectField label="チェックイン時間" value={selectedTime} options={slotsForSelectedDate.map((slot) => ({ value: slot.time, label: formatSlotLabel(slot) }))} icon="○" onChange={onSelectTime} />
        <SearchField label="チェックアウト" value={selectedDate ? formatJapaneseDate(addDays(selectedDate, 1)) : "日付を選択してください"} icon="□" />
        <SearchField label="宿泊数" value="1泊" icon="◑" />
        <SearchField label="人数・部屋数" value={searchDefaults.guests} icon="♙" />
        {!availableSlots.length ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">現在選択できる空き枠がありません。</p> : null}
        <PrimaryButton onClick={onNext}>検索する</PrimaryButton>
      </div>
    </div>
  );
}

function HotelIntro() {
  return (
    <section className="bg-white text-left">
      <HeroImage label="HOTEL IMAGE" tall />
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.pink }}>
          Hotel stay
        </p>
        <h2 className="mt-2 text-lg font-bold">{hotel.name}</h2>
        <p className="mt-2 text-xs leading-5" style={{ color: theme.muted }}>
          宿泊日と人数を選び、そのままプラン予約まで進めます。
        </p>
        <p className="mt-2 text-xs font-semibold" style={{ color: theme.muted }}>
          {hotel.area} / {hotel.address}
        </p>
      </div>
    </section>
  );
}

function DetailStep({
  plans,
  selectedPlanId,
  onSelectPlan,
  onBack,
  onNext,
}: {
  plans: HotelPlan[];
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];

  return (
    <div>
      <PhoneHeader title="ホテル詳細" onBack={onBack} />
      <div className="space-y-4 p-4">
        <HeroImage label="HOTEL IMAGE" tall />
        <div>
          <h2 className="text-lg font-bold">{hotel.name}</h2>
          <p className="mt-1 text-xs text-amber-500">★★★★★ <span style={{ color: theme.muted }}>{hotel.rating}（{hotel.reviews}）</span></p>
          <p className="mt-1 text-xs" style={{ color: theme.muted }}>{hotel.address}</p>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center text-[11px]" style={{ color: theme.muted }}>
          {["Wi-Fi", "朝食", "大浴場", "駐車場", "24H"].map((item) => <span key={item}>{item}</span>)}
        </div>
        <div>
          <SectionTitle>プラン一覧</SectionTitle>
          <div className="mt-3 space-y-2">
            {plans.map((plan) => {
              const selected = selectedPlanId === plan.id;
              return (
                <button key={plan.id} type="button" onClick={() => onSelectPlan(plan.id)} className="flex w-full gap-3 rounded-xl border p-3 text-left" style={{ borderColor: selected ? theme.pink : theme.border, backgroundColor: selected ? "#F1F7F8" : theme.surface }}>
                  <HeroImage label="PLAN" compact />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{plan.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {plan.labels.map((label) => <span key={label} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">{label}</span>)}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: theme.muted }}>{plan.description}</p>
                    <p className="mt-1 text-base font-bold" style={{ color: theme.pink }}>¥{plan.price.toLocaleString()}〜</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-end justify-between rounded-xl p-3" style={{ backgroundColor: theme.soft }}>
          <div>
            <p className="text-lg font-bold" style={{ color: theme.pink }}>¥{selectedPlan.price.toLocaleString()}〜</p>
            <p className="text-[11px]" style={{ color: theme.muted }}>税込・サービス料込</p>
          </div>
          <button type="button" onClick={onNext} className="rounded-full px-4 py-3 text-xs font-bold text-white" style={{ backgroundColor: theme.pink }}>
            このプランで予約へ
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmStep({
  selectedPlan,
  selectedDate,
  selectedTime,
  onBack,
  onNext,
}: {
  selectedPlan: HotelPlan;
  selectedDate: string;
  selectedTime: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const serviceFee = Math.round(selectedPlan.price * 0.1);
  const tax = Math.round(selectedPlan.price * 0.1);

  return (
    <div>
      <PhoneHeader title="予約内容の確認" onBack={onBack} />
      <div className="space-y-4 p-4">
        <Card>
          <SectionTitle>選択したホテル・プラン</SectionTitle>
          <div className="mt-3 flex gap-3">
            <HeroImage label="ROOM" compact />
            <div>
              <p className="text-sm font-bold">{hotel.name}</p>
              <p className="mt-1 text-xs">{selectedPlan.name}</p>
              <div className="mt-2 flex gap-1">
                {selectedPlan.labels.map((label) => <span key={label} className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">{label}</span>)}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <DetailRow label="チェックイン" value={`${formatJapaneseDate(selectedDate)} ${selectedTime}〜`} />
            <DetailRow label="チェックアウト" value={`${formatJapaneseDate(addDays(selectedDate, 1))} 〜11:00`} />
            <DetailRow label="宿泊者" value="大人2名 / 1部屋" />
          </div>
        </Card>
        <Card>
          <SectionTitle>料金内訳</SectionTitle>
          <div className="mt-3 space-y-2 text-sm">
            <DetailRow label="宿泊料金（1泊）" value={`¥${(selectedPlan.price - serviceFee - tax).toLocaleString()}`} />
            <DetailRow label="サービス料（10%）" value={`¥${serviceFee.toLocaleString()}`} />
            <DetailRow label="消費税（10%）" value={`¥${tax.toLocaleString()}`} />
            <div className="border-t pt-3" style={{ borderColor: theme.border }}>
              <DetailRow label="合計（税込）" value={`¥${selectedPlan.price.toLocaleString()}`} strong />
            </div>
          </div>
        </Card>
        <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">キャンセル無料：2026年7月18日 23:59まで料金は発生しません。</div>
        <PrimaryButton onClick={onNext}>次へ</PrimaryButton>
        <SecondaryButton onClick={onBack}>戻って変更する</SecondaryButton>
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
      <PhoneHeader title="お客様情報の入力" onBack={onBack} />
      <form onSubmit={onSubmit} className="space-y-3 p-4">
        <p className="text-xs" style={{ color: theme.muted }}>宿泊代表者の情報を入力してください。</p>
        <TextField label="代表者名" required value={customer.name} placeholder="例）山田 太郎" onChange={(value) => update("name", value)} />
        <TextField label="フリガナ" required value={customer.kana} placeholder="例）ヤマダ タロウ" onChange={(value) => update("kana", value)} />
        <TextField label="電話番号" required value={customer.phone} placeholder="例）090-1234-5678" onChange={(value) => update("phone", value)} />
        <TextField label="メールアドレス" required value={customer.email} placeholder="例）example@email.com" onChange={(value) => update("email", value)} />
        <TextField label="住所" required value={customer.address} placeholder="例）東京都新宿区..." onChange={(value) => update("address", value)} />
        <TextField label="宿泊者人数" required value={customer.guests} placeholder="例）大人2名 / 1部屋" onChange={(value) => update("guests", value)} />
        <label className="block">
          <span className="text-sm font-bold">ご要望・連絡事項</span>
          <textarea value={customer.notes} onChange={(event) => update("notes", event.target.value)} placeholder="ご要望があればご記入ください" className="mt-2 min-h-20 w-full rounded-lg border px-3 py-3 text-sm outline-none" style={{ borderColor: theme.border }} />
        </label>
        <label className="flex items-start gap-2 text-xs" style={{ color: theme.muted }}>
          <input type="checkbox" checked={customer.agreed} onChange={(event) => update("agreed", event.target.checked)} className="mt-0.5 h-4 w-4 rounded" />
          <span>利用規約・プライバシーポリシーに同意する</span>
        </label>
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={!canSubmit || isSubmitting} className="h-12 w-full rounded-xl text-sm font-bold text-white transition disabled:bg-[#B9CAD2]" style={{ backgroundColor: canSubmit && !isSubmitting ? theme.pink : undefined }}>
          {isSubmitting ? "予約しています" : "予約を確定する"}
        </button>
      </form>
    </div>
  );
}

function CompleteStep({
  reservationNumber,
  selectedPlan,
  selectedDate,
  selectedTime,
  customer,
  onRestart,
}: {
  reservationNumber: string;
  selectedPlan: HotelPlan;
  selectedDate: string;
  selectedTime: string;
  customer: CustomerForm;
  onRestart: () => void;
}) {
  return (
    <div>
      <PhoneHeader title="予約完了" onBack={onRestart} />
      <div className="space-y-4 p-4 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl text-white" style={{ backgroundColor: "#48C79A" }}>✓</div>
        <div>
          <h2 className="text-lg font-bold">ご予約が完了しました！</h2>
          <p className="mt-3 text-xs leading-6" style={{ color: theme.muted }}>ご登録のメールアドレスに予約確認メールを送信しました。</p>
        </div>
        <Card>
          <DetailBlock label="予約番号" value={reservationNumber} />
          <DetailBlock label="ホテル" value={hotel.name} />
          <DetailBlock label="プラン" value={selectedPlan.name} />
          <DetailBlock label="チェックイン" value={`${formatJapaneseDate(selectedDate)} ${selectedTime}〜`} />
          <DetailBlock label="チェックアウト" value={`${formatJapaneseDate(addDays(selectedDate, 1))} 〜11:00`} />
          <DetailBlock label="代表者名" value={customer.name || "山田 太郎"} />
          <DetailBlock label="電話番号" value={customer.phone || "090-1234-5678"} />
          <DetailBlock label="メールアドレス" value={customer.email || "example@email.com"} />
          <DetailBlock label="合計金額" value={`¥${selectedPlan.price.toLocaleString()}（税込）`} />
        </Card>
        <PrimaryButton onClick={onRestart}>予約一覧へ</PrimaryButton>
        <SecondaryButton onClick={onRestart}>トップページへ</SecondaryButton>
      </div>
    </div>
  );
}

function SearchField({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold">{label}</p>
      <div className="flex h-12 items-center gap-3 rounded-xl border px-3 text-sm" style={{ borderColor: theme.border }}>
        <span style={{ color: theme.pink }}>{icon}</span>
        <span>{value}</span>
        <span className="ml-auto">›</span>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  icon,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  icon: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <p className="mb-1 text-xs font-bold">{label}</p>
      <div className="flex h-12 items-center gap-3 rounded-xl border px-3 text-sm" style={{ borderColor: theme.border }}>
        <span style={{ color: theme.pink }}>{icon}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
        >
          {!options.length ? <option value="">空き枠なし</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function TextField({ label, required, value, placeholder, onChange }: { label: string; required?: boolean; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">
        {label}
        {required ? <span className="ml-1 text-xs" style={{ color: theme.pink }}>必須</span> : null}
      </span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition" style={{ borderColor: theme.border }} />
    </label>
  );
}

function buildAvailableDates(slots: AvailableSlot[]) {
  const dates = Array.from(new Set(slots.map((slot) => slot.date))).sort();

  return dates.map((date) => ({
    value: date,
    label: formatJapaneseDate(date),
  }));
}

function formatSlotLabel(slot: AvailableSlot) {
  return slot.remaining <= 2 ? `${slot.time} 残り${slot.remaining}` : `${slot.time} 空きあり`;
}

function formatJapaneseDate(date: string) {
  if (!date) {
    return "日付未選択";
  }

  const parsed = new Date(`${date}T00:00:00+09:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日（${weekdays[parsed.getDay()]}）`;
}

function addDays(date: string, days: number) {
  if (!date) {
    return "";
  }

  const parsed = new Date(`${date}T00:00:00+09:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  parsed.setDate(parsed.getDate() + days);

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function getTodayValue() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function HeroImage({ label, tall = false, compact = false }: { label: string; tall?: boolean; compact?: boolean }) {
  if (tall) {
    return (
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-[#F7FAF9]">
        <Image src="/hotel-search.png" alt={label} fill sizes="(max-width: 768px) 100vw, 448px" className="object-cover" />
      </div>
    );
  }

  return (
    <div className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-[#DDE9EC] to-[#F7FAF9] font-bold text-[#2F5D7C] ${compact ? "h-20 w-20 rounded-lg text-xs" : "aspect-video w-full rounded-xl text-xs"}`}>
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
  return <button type="button" onClick={onClick} className="h-12 w-full rounded-xl text-sm font-bold text-white shadow-[0_14px_28px_rgba(47,93,124,0.22)]" style={{ backgroundColor: theme.pink }}>{children}</button>;
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-12 w-full rounded-xl border bg-white text-sm font-bold" style={{ borderColor: theme.pink, color: theme.pink }}>{children}</button>;
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

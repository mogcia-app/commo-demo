"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLineProfile } from "@/hooks/use-line-profile";
import type { BookingSite } from "@/lib/booking-sites";
import type { AvailableSlot, Menu } from "@/lib/storefront/types";

type CalendarStep = "menu" | "datetime" | "confirm" | "customer" | "complete";

type CustomerForm = {
  name: string;
  kana: string;
  phone: string;
  email: string;
  notes: string;
  agreed: boolean;
};

type StaffOption = {
  id: string;
  name: string;
  role: string;
  fee: string;
};

type DemoMenu = {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
};

const storeProfile = {
  name: "Lumiere Salon",
  category: "Hair salon / Spa",
  address: "表参道駅 徒歩4分",
  description: "髪と頭皮をやさしく整える、落ち着いた雰囲気のプライベートサロンです。",
};

const demoMenus: DemoMenu[] = [
  {
    id: "cut",
    name: "カット",
    price: "¥5,500",
    duration: "約60分",
    description: "骨格や雰囲気に合わせて整えるベーシックカットです。",
  },
  {
    id: "cut_color",
    name: "カット＋カラー",
    price: "¥9,900",
    duration: "約120分",
    description: "透明感カラーと似合わせカットの定番メニューです。",
  },
  {
    id: "color_treatment",
    name: "カラー＋トリートメント",
    price: "¥11,000",
    duration: "約110分",
    description: "カラー後の質感まで整える、艶重視のケアメニューです。",
  },
  {
    id: "head_spa",
    name: "ヘッドスパ",
    price: "¥6,600",
    duration: "約60分",
    description: "頭皮を整えながら、ゆったりリフレッシュできます。",
  },
];

const staffOptions: StaffOption[] = [
  { id: "none", name: "指名なし", role: "おまかせ", fee: "¥0" },
  { id: "mika", name: "Mika", role: "Stylist", fee: "¥550" },
  { id: "ren", name: "Ren", role: "Care specialist", fee: "¥550" },
  { id: "aoi", name: "Aoi", role: "Top stylist", fee: "¥1,100" },
];

const weekLabels = ["日", "月", "火", "水", "木", "金", "土"];
const brown = "#735942";

export function CalendarReservationSite({ site }: { site: BookingSite }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLiveReservation = true;
  const campaignId = searchParams.get("campaignId")?.trim() || undefined;
  const couponId = searchParams.get("couponId")?.trim() || undefined;
  const loginRedirectPath = `${pathname}?${searchParams.toString()}`;
  const { profile } = useLineProfile({ loginRedirectPath });
  const [step, setStep] = useState<CalendarStep>("menu");
  const [selectedMenuId, setSelectedMenuId] = useState(demoMenus[0].id);
  const [selectedDate, setSelectedDate] = useState(getTodayValue());
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState(staffOptions[0].id);
  const [customer, setCustomer] = useState<CustomerForm>({
    name: "",
    kana: "",
    phone: "",
    email: "",
    notes: "",
    agreed: false,
  });
  const [menus, setMenus] = useState<Menu[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDemoMenu = demoMenus.find((menu) => menu.id === selectedMenuId) ?? demoMenus[0];
  const selectedDateLabel = useMemo(() => formatJapaneseDate(selectedDate), [selectedDate]);
  const selectedStaff = staffOptions.find((staff) => staff.id === selectedStaffId) ?? staffOptions[0];
  const canSubmit = Boolean(customer.name.trim() && customer.kana.trim() && customer.phone.trim() && customer.email.trim() && customer.agreed);

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

      const firstSlotForSelectedDate = slots.find((slot) => slot.date === selectedDate);
      const selectedSlotStillAvailable = slots.some((slot) => slot.date === selectedDate && slot.time === selectedTime);
      const fallbackSlot = firstSlotForSelectedDate ?? slots[0];

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
      setError("予約日時を選択してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (isLiveReservation) {
        if (!profile) {
          throw new Error("LINEプロフィールを取得中です。少し待ってから再度お試しください。");
        }

        const selectedMenu = menus.find((menu) => menu.id === selectedMenuId) ?? menus[0];

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
              selectedMenu: selectedDemoMenu.name,
              selectedStaff: selectedStaff.name,
              selectedDate,
              selectedTime,
              paymentMethod: "現地払い",
              kana: customer.kana,
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
    <main className="min-h-screen bg-[#F7F3EE] px-4 py-5 text-[#2E2924]">
      <div className="mx-auto w-full max-w-md">
        {step !== "complete" ? <FlowHeader step={step} onBack={() => setStep(previousStep(step))} /> : null}

        {step === "menu" ? (
          <MenuStep
            selectedMenuId={selectedMenuId}
            onMenuChange={setSelectedMenuId}
            onNext={() => setStep("datetime")}
          />
        ) : null}

        {step === "datetime" ? (
          <DateTimeStep
            selectedMenu={selectedDemoMenu}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            selectedStaffId={selectedStaffId}
            availableSlots={availableSlots}
            onStaffChange={setSelectedStaffId}
            onDateChange={setSelectedDate}
            onTimeChange={setSelectedTime}
            onNext={() => setStep("confirm")}
          />
        ) : null}

        {step === "confirm" ? (
          <ConfirmStep
            selectedDateLabel={selectedDateLabel}
            selectedTime={selectedTime}
            selectedStaff={selectedStaff}
            selectedMenu={selectedDemoMenu}
            onNext={() => setStep("customer")}
            onBack={() => setStep("datetime")}
            onMenuBack={() => setStep("menu")}
          />
        ) : null}

        {step === "customer" ? (
          <CustomerStep
            customer={customer}
            error={error}
            isSubmitting={isSubmitting}
            canSubmit={canSubmit}
            onChange={setCustomer}
            onSubmit={submitReservation}
          />
        ) : null}

        {step === "complete" ? (
          <CompleteStep
            selectedDateLabel={selectedDateLabel}
            selectedTime={selectedTime}
            selectedStaff={selectedStaff}
            selectedMenu={selectedDemoMenu}
            onRestart={() => setStep("menu")}
          />
        ) : null}
      </div>
    </main>
  );
}

function FlowHeader({ step, onBack }: { step: CalendarStep; onBack: () => void }) {
  const title = {
    menu: "メニューを選択",
    datetime: "日付・時間を選択",
    confirm: "予約内容の確認",
    customer: "お客様情報の入力",
    complete: "予約完了",
  }[step];

  return (
    <header className="mb-4 overflow-hidden rounded-2xl border border-[#E6DCD1] bg-white shadow-[0_18px_48px_rgba(79,63,47,0.10)]">
      <div className="flex h-14 items-center border-b border-[#EEE7DF] px-4">
        <button
          type="button"
          onClick={onBack}
          disabled={step === "menu"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#6D5A47] transition disabled:opacity-30"
          aria-label="戻る"
        >
          ‹
        </button>
        <p className="flex-1 pr-9 text-center text-sm font-bold">{title}</p>
      </div>
      <div className="grid grid-cols-5 gap-2 px-4 py-3">
        {(["menu", "datetime", "confirm", "customer", "complete"] as CalendarStep[]).map((item, index) => (
          <div key={item} className="h-1.5 rounded-full" style={{ backgroundColor: stepOrder(step) >= index ? brown : "#E8DED3" }} />
        ))}
      </div>
    </header>
  );
}

function MenuStep({
  selectedMenuId,
  onMenuChange,
  onNext,
}: {
  selectedMenuId: string;
  onMenuChange: (menuId: string) => void;
  onNext: () => void;
}) {
  return (
    <section className="space-y-4">
      <StoreHero />
      <Card>
        <SectionTitle>ご希望のメニューを選択してください</SectionTitle>
        <div className="mt-4 space-y-3">
          {demoMenus.map((menu) => {
            const selected = selectedMenuId === menu.id;

            return (
              <button
                key={menu.id}
                type="button"
                onClick={() => onMenuChange(menu.id)}
                className="flex w-full gap-4 rounded-2xl border p-3 text-left transition"
                style={{
                  borderColor: selected ? brown : "#E6DCD1",
                  backgroundColor: selected ? "#F2ECE5" : "#FFFFFF",
                }}
              >
                <MenuImagePlaceholder className="h-28 w-28 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{menu.name}</span>
                  <span className="mt-1 block text-sm font-semibold">{menu.price}（税込）</span>
                  <span className="mt-1 block text-xs text-[#6F6257]">所要時間：{menu.duration}</span>
                  <span className="mt-2 block text-xs leading-5 text-[#7A6C5F]">{menu.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>
      <PrimaryButton onClick={onNext}>日付・時間の選択へ</PrimaryButton>
    </section>
  );
}

function StoreHero() {
  return (
    <Card className="overflow-hidden p-0">
      <StoreHeroImage />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A7562]">{storeProfile.category}</p>
            <h1 className="mt-2 text-xl font-bold text-[#2E2924]">{storeProfile.name}</h1>
          </div>
          <span className="rounded-full bg-[#F2ECE5] px-3 py-1 text-xs font-bold text-[#735942]">予約受付中</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#6F6257]">{storeProfile.description}</p>
        <p className="mt-3 text-xs font-semibold text-[#7A6C5F]">{storeProfile.address}</p>
      </div>
    </Card>
  );
}

function DateTimeStep({
  selectedMenu,
  selectedDate,
  selectedTime,
  selectedStaffId,
  availableSlots,
  onStaffChange,
  onDateChange,
  onTimeChange,
  onNext,
}: {
  selectedMenu: DemoMenu;
  selectedDate: string;
  selectedTime: string;
  selectedStaffId: string;
  availableSlots: AvailableSlot[];
  onStaffChange: (staffId: string) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onNext: () => void;
}) {
  const selectedDateLabel = formatJapaneseDate(selectedDate);
  const slotsForSelectedDate = availableSlots.filter((slot) => slot.date === selectedDate);

  return (
    <section className="space-y-4">
      <MenuCard menu={selectedMenu} />
      <StaffSelect selectedStaffId={selectedStaffId} onChange={onStaffChange} />
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <SectionTitle>日付を選択してください</SectionTitle>
            <p className="mt-2 text-xs text-[#7A6C5F]">月表示から希望日を選べます</p>
          </div>
          <div className="rounded-xl bg-[#F2ECE5] px-3 py-2 text-right">
            <p className="text-[10px] font-bold text-[#8A7562]">選択中</p>
            <p className="mt-0.5 text-xs font-bold text-[#3F352D]">{selectedDateLabel}</p>
          </div>
        </div>
        <MonthCalendar selectedDate={selectedDate} availableSlots={availableSlots} onSelect={onDateChange} />
      </Card>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <SectionTitle>時間を選択してください</SectionTitle>
            <p className="mt-2 text-xs text-[#7A6C5F]">
              {selectedTime ? `${selectedTime}〜${endTime(selectedTime, selectedMenu.duration)}で予約` : "空き枠を選択してください"}
            </p>
          </div>
          {selectedTime ? <span className="rounded-full bg-[#735942] px-3 py-1 text-xs font-bold text-white">{selectedTime}</span> : null}
        </div>
        <TimeSlotPicker selectedTime={selectedTime} slots={slotsForSelectedDate} onTimeChange={onTimeChange} />
      </Card>
      <PrimaryButton onClick={onNext}>この日時で進む</PrimaryButton>
    </section>
  );
}

function ConfirmStep({
  selectedMenu,
  selectedDateLabel,
  selectedTime,
  selectedStaff,
  onNext,
  onBack,
  onMenuBack,
}: {
  selectedMenu: DemoMenu;
  selectedDateLabel: string;
  selectedTime: string;
  selectedStaff: StaffOption;
  onNext: () => void;
  onBack: () => void;
  onMenuBack: () => void;
}) {
  return (
    <section className="space-y-4">
      <Card>
        <SectionTitle>ご予約内容</SectionTitle>
        <StoreSummary />
        <MenuSummary menu={selectedMenu} />
        <div className="mt-5 space-y-3 text-sm">
          <InfoRow icon="□" label={selectedDateLabel} />
          <InfoRow icon="○" label={`${selectedTime}〜${endTime(selectedTime, selectedMenu.duration)}`} />
          <InfoRow icon="◇" label={selectedStaff.name} />
          <InfoRow icon="¥" label="現地払い" />
        </div>
      </Card>
      <Card>
        <div className="space-y-3 text-sm">
          <PriceRow label="メニュー料金" value={selectedMenu.price} />
          <PriceRow label="指名料" value={selectedStaff.fee} />
          <PriceRow label="お支払い方法" value="現地払い" />
          <div className="border-t border-[#EEE7DF] pt-3">
            <PriceRow label="合計（税込）" value={selectedMenu.price} strong />
          </div>
        </div>
      </Card>
      <Card>
        <SectionTitle>注意事項</SectionTitle>
        <ul className="mt-3 space-y-2 text-xs leading-5 text-[#6F6257]">
          <li>・予約の変更、キャンセルは前日18:00までにお願いいたします。</li>
          <li>・遅刻される場合は必ずご連絡をお願いいたします。</li>
        </ul>
      </Card>
      <PrimaryButton onClick={onNext}>お客様情報の入力へ</PrimaryButton>
      <SecondaryButton onClick={onBack}>日付・時間を選び直す</SecondaryButton>
      <SecondaryButton onClick={onMenuBack}>メニューを選び直す</SecondaryButton>
    </section>
  );
}

function CustomerStep({
  customer,
  error,
  isSubmitting,
  canSubmit,
  onChange,
  onSubmit,
}: {
  customer: CustomerForm;
  error: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  onChange: (customer: CustomerForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function update(key: keyof CustomerForm, value: string | boolean) {
    onChange({ ...customer, [key]: value });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <div className="space-y-4">
          <TextField label="お名前（必須）" value={customer.name} placeholder="例）山田 太郎" onChange={(value) => update("name", value)} />
          <TextField label="フリガナ（必須）" value={customer.kana} placeholder="例）ヤマダ タロウ" onChange={(value) => update("kana", value)} />
          <TextField label="電話番号（必須）" value={customer.phone} placeholder="例）090-1234-5678" onChange={(value) => update("phone", value)} />
          <TextField label="メールアドレス（必須）" value={customer.email} placeholder="例）example@email.com" onChange={(value) => update("email", value)} />
          <label className="block">
            <span className="text-sm font-bold">ご要望・ご質問など（任意）</span>
            <textarea
              value={customer.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="ご要望などがございましたらご記入ください"
              className="mt-2 min-h-28 w-full rounded-lg border border-[#DED3C7] bg-white px-3 py-3 text-sm outline-none transition focus:border-[#735942]"
            />
          </label>
          <label className="flex items-start gap-2 text-xs text-[#5F5145]">
            <input
              type="checkbox"
              checked={customer.agreed}
              onChange={(event) => update("agreed", event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#DED3C7]"
            />
            <span>利用規約・プライバシーポリシーに同意する</span>
          </label>
        </div>
      </Card>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="h-14 w-full rounded-xl bg-[#735942] text-sm font-bold text-white shadow-[0_14px_28px_rgba(115,89,66,0.22)] transition disabled:bg-[#C9BFB5]"
      >
        {isSubmitting ? "予約しています" : "予約を確定する"}
      </button>
    </form>
  );
}

function CompleteStep({
  selectedMenu,
  selectedDateLabel,
  selectedTime,
  selectedStaff,
  onRestart,
}: {
  selectedMenu: DemoMenu;
  selectedDateLabel: string;
  selectedTime: string;
  selectedStaff: StaffOption;
  onRestart: () => void;
}) {
  const router = useRouter();

  return (
    <section className="space-y-4 pt-8">
      <Card className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#735942] text-4xl text-[#735942]">✓</div>
        <h1 className="mt-6 text-xl font-bold">ご予約が完了しました</h1>
        <p className="mt-4 text-sm leading-6 text-[#6F6257]">
          ご予約ありがとうございます。
          <br />
          ご登録のメールアドレスに予約確認メールを送信しました。
        </p>
      </Card>
      <Card>
        <SectionTitle>ご予約内容</SectionTitle>
        <StoreSummary />
        <MenuSummary menu={selectedMenu} />
        <div className="mt-5 space-y-3 text-sm">
          <InfoRow icon="□" label={selectedDateLabel} />
          <InfoRow icon="○" label={`${selectedTime}〜${endTime(selectedTime, selectedMenu.duration)}`} />
          <InfoRow icon="◇" label={selectedStaff.name} />
          <InfoRow icon="¥" label="現地払い" />
        </div>
      </Card>
      <SecondaryButton onClick={onRestart}>カレンダーに追加</SecondaryButton>
      <PrimaryButton onClick={() => router.push("/booking")}>予約一覧へ</PrimaryButton>
      <SecondaryButton onClick={() => router.push("/booking/calendar")}>トップページへ</SecondaryButton>
    </section>
  );
}

function MonthCalendar({
  selectedDate,
  availableSlots,
  onSelect,
}: {
  selectedDate: string;
  availableSlots: AvailableSlot[];
  onSelect: (date: string) => void;
}) {
  const selectedMonth = getMonthValue(selectedDate);
  const days = buildCalendarDays(selectedMonth.year, selectedMonth.month);
  const remainingByDate = new Map<string, number>();

  for (const slot of availableSlots) {
    remainingByDate.set(slot.date, (remainingByDate.get(slot.date) ?? 0) + slot.remaining);
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-1">
        <button type="button" className="h-9 w-9 rounded-full text-xl text-[#6D5A47]">
          ‹
        </button>
        <p className="text-sm font-bold">
          {selectedMonth.year}年{selectedMonth.month + 1}月
        </p>
        <button type="button" className="h-9 w-9 rounded-full text-xl text-[#6D5A47]">
          ›
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-xs font-bold text-[#7F7163]">
        {weekLabels.map((label) => (
          <span key={label} className="py-2">
            {label}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
        {days.map((day, index) => {
          const date = formatDateValue(selectedMonth.year, selectedMonth.month, day.value);
          const selected = selectedDate === date;
          const remaining = remainingByDate.get(date) ?? 0;
          const disabled = !day.current || remaining <= 0;
          const limited = remaining > 0 && remaining <= 2;

          return (
            <button
              key={`${day.value}-${index}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              className="mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-2xl font-medium transition disabled:text-[#C9BFB5]"
              style={{
                backgroundColor: selected ? brown : "transparent",
                color: selected ? "#FFFFFF" : disabled ? undefined : "#3E352D",
              }}
            >
              <span>{day.value}</span>
              {day.current && !disabled ? (
                <span className="mt-0.5 h-1 w-1 rounded-full" style={{ backgroundColor: selected ? "#FFFFFF" : limited ? "#C9A45D" : "#8B735D" }} />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-center gap-4 text-[11px] text-[#7F7163]">
        <span>● 空きあり</span>
        <span className="text-[#9A7A34]">● 残りわずか</span>
      </div>
    </div>
  );
}

function TimeSlotPicker({
  selectedTime,
  slots,
  onTimeChange,
}: {
  selectedTime: string;
  slots: AvailableSlot[];
  onTimeChange: (time: string) => void;
}) {
  const groups = groupSlotsByTime(slots);

  if (!slots.length) {
    return <p className="mt-4 rounded-xl bg-[#F5F1EC] px-3 py-4 text-center text-xs font-semibold text-[#7A6C5F]">選択できる空き枠がありません。</p>;
  }

  return (
    <div className="mt-4 space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-bold text-[#7A6C5F]">{group.label}</p>
          <div className="grid grid-cols-3 gap-2">
            {group.slots.map((slot) => {
              const selected = selectedTime === slot.time;
              const disabled = slot.remaining <= 0 || slot.available === false;
              const limited = slot.remaining > 0 && slot.remaining <= 2;

              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={disabled}
                  onClick={() => onTimeChange(slot.time)}
                  className="min-h-14 rounded-xl border px-2 py-2 text-sm font-semibold transition disabled:bg-[#F5F1EC] disabled:text-[#B8AA9D]"
                  style={{
                    borderColor: selected ? brown : limited ? "#D6B879" : "#DED3C7",
                    backgroundColor: selected ? brown : "#FFFFFF",
                    color: selected ? "#FFFFFF" : "#473C32",
                  }}
                >
                  <span className="block">{disabled ? "-" : slot.time}</span>
                  <span className="mt-1 block text-[10px] font-medium opacity-75">
                    {disabled ? "満席" : limited ? `残り${slot.remaining}` : "空きあり"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuCard({ menu }: { menu: DemoMenu }) {
  return (
    <Card>
      <SectionTitle>ご希望のメニュー</SectionTitle>
      <MenuSummary menu={menu} />
    </Card>
  );
}

function StaffSelect({ selectedStaffId, onChange }: { selectedStaffId: string; onChange: (staffId: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedStaff = staffOptions.find((staff) => staff.id === selectedStaffId) ?? staffOptions[0];

  return (
    <Card>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isOpen}
      >
        <span>
          <SectionTitle>スタッフ指名</SectionTitle>
          <span className="mt-2 block text-xs text-[#6F6257]">
            選択中：{selectedStaff.name} / 指名料 {selectedStaff.fee}
          </span>
        </span>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F2ECE5] text-lg text-[#735942] transition-transform duration-300"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ⌄
        </span>
      </button>

      <div className={`grid transition-all duration-300 ease-out ${isOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="mb-4 h-px bg-[#EEE7DF]" />
          <p className="mb-3 text-xs leading-5 text-[#7A6C5F]">希望がある場合のみ選択してください。指名なしでも予約できます。</p>
          <div className="grid grid-cols-2 gap-2">
          {staffOptions.map((staff) => {
            const selected = selectedStaffId === staff.id;

            return (
              <button
                key={staff.id}
                type="button"
                onClick={() => {
                  onChange(staff.id);
                  setIsOpen(false);
                }}
                className="rounded-xl border p-3 text-left transition"
                style={{
                  borderColor: selected ? brown : "#DED3C7",
                  backgroundColor: selected ? "#F2ECE5" : "#FFFFFF",
                }}
              >
                <span className="block text-sm font-bold">{staff.name}</span>
                <span className="mt-1 block text-[11px] text-[#6F6257]">{staff.role}</span>
                <span className="mt-2 block text-xs font-semibold" style={{ color: selected ? brown : "#6F6257" }}>
                  指名料 {staff.fee}
                </span>
              </button>
            );
          })}
        </div>
        </div>
      </div>
    </Card>
  );
}

function MenuSummary({ menu }: { menu: DemoMenu }) {
  return (
    <div className="mt-4 flex gap-3">
      <MenuImagePlaceholder className="h-24 w-24 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{menu.name}</p>
        <p className="mt-1 text-sm font-semibold">{menu.price}（税込）</p>
        <p className="mt-1 text-xs text-[#6F6257]">所要時間：{menu.duration}</p>
      </div>
    </div>
  );
}

function StoreSummary() {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[#E6DCD1] bg-[#FBF8F4]">
      <div className="relative aspect-video w-full overflow-hidden bg-[#EFE6DC]">
        <Image src="/calendar.png" alt={storeProfile.name} fill sizes="(max-width: 768px) 100vw, 448px" className="object-cover" />
      </div>
      <div className="p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A7562]">{storeProfile.category}</p>
        <p className="mt-1 text-sm font-bold text-[#2E2924]">{storeProfile.name}</p>
        <p className="mt-1 text-xs text-[#6F6257]">{storeProfile.address}</p>
      </div>
    </div>
  );
}

function MenuImagePlaceholder({ className }: { className: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center border border-dashed border-[#D7C8B8] bg-[#F3EDE6] text-xs font-bold text-[#9A8775] ${className}`}
    >
      ここに画像
    </span>
  );
}

function StoreHeroImage() {
  return (
    <div className="relative aspect-video w-full overflow-hidden border-b border-[#E6DCD1] bg-[#EFE6DC]">
      <Image src="/calendar.png" alt="Lumiere Salon" fill priority sizes="(max-width: 768px) 100vw, 448px" className="object-cover" />
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#E6DCD1] bg-white p-5 shadow-[0_18px_48px_rgba(79,63,47,0.08)] ${className}`}>{children}</section>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-bold">{children}</h2>;
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-14 w-full rounded-xl bg-[#735942] text-sm font-bold text-white shadow-[0_14px_28px_rgba(115,89,66,0.22)] transition hover:bg-[#604933]"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="h-14 w-full rounded-xl border border-[#BCAEA0] bg-white text-sm font-bold text-[#3F352D] transition hover:bg-[#FBF8F4]">
      {children}
    </button>
  );
}

function InfoRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-3 text-[#3F352D]">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2ECE5] text-xs text-[#735942]">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function PriceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-lg border border-[#DED3C7] bg-white px-3 text-sm outline-none transition focus:border-[#735942]"
      />
    </label>
  );
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const currentMonthLength = new Date(year, month + 1, 0).getDate();
  const previousMonthLength = new Date(year, month, 0).getDate();
  const previous = Array.from({ length: firstDay }, (_, index) => previousMonthLength - firstDay + index + 1);
  const current = Array.from({ length: currentMonthLength }, (_, index) => index + 1);
  const nextLength = Math.max(42 - previous.length - current.length, 0);
  const next = Array.from({ length: nextLength }, (_, index) => index + 1);

  return [
    ...previous.map((value) => ({ value, current: false })),
    ...current.map((value) => ({ value, current: true })),
    ...next.map((value) => ({ value, current: false })),
  ];
}

function groupSlotsByTime(slots: AvailableSlot[]) {
  const sortedSlots = [...slots].sort((a, b) => a.time.localeCompare(b.time));

  return [
    { label: "午前", slots: sortedSlots.filter((slot) => getHour(slot.time) < 12) },
    { label: "午後", slots: sortedSlots.filter((slot) => getHour(slot.time) >= 12 && getHour(slot.time) < 17) },
    { label: "夕方", slots: sortedSlots.filter((slot) => getHour(slot.time) >= 17) },
  ].filter((group) => group.slots.length);
}

function getHour(time: string) {
  return Number(time.split(":")[0] ?? 0);
}

function getMonthValue(date: string) {
  const parsed = new Date(`${date}T00:00:00+09:00`);

  if (Number.isNaN(parsed.getTime())) {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  }

  return { year: parsed.getFullYear(), month: parsed.getMonth() };
}

function formatDateValue(year: number, month: number, date: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

function getTodayValue() {
  const now = new Date();
  return formatDateValue(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatJapaneseDate(date: string) {
  const parsed = new Date(`${date}T00:00:00+09:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日（${weekdays[parsed.getDay()]}）`;
}

function endTime(time: string, duration: string) {
  const [hour, minute] = time.split(":").map(Number);
  const durationMinutes = Number(duration.match(/\d+/)?.[0] ?? 120);
  const totalMinutes = hour * 60 + minute + durationMinutes;
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;
  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}

function stepOrder(step: CalendarStep) {
  return { menu: 0, datetime: 1, confirm: 2, customer: 3, complete: 4 }[step];
}

function previousStep(step: CalendarStep): CalendarStep {
  if (step === "customer") return "confirm";
  if (step === "confirm") return "datetime";
  if (step === "datetime") return "menu";
  return "menu";
}

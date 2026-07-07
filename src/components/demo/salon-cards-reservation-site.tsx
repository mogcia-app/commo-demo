"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLineProfile } from "@/hooks/use-line-profile";
import type { DemoSite } from "@/lib/demo-sites";
import {
  salonDates,
  salonFullTimes,
  salonMenus,
  salonSearchConditions,
  salons,
  salonStaff,
  salonTheme as theme,
  salonTimes,
  type Salon,
  type SalonMenu,
  type SalonStaff,
} from "@/lib/demo/salon-cards-config";
import type { Menu } from "@/lib/storefront/types";

type SalonStep = "search" | "booking" | "customer" | "complete";

type CustomerForm = {
  name: string;
  kana: string;
  phone: string;
  email: string;
  visitCount: string;
  notes: string;
  agreed: boolean;
};

export function SalonCardsReservationSite({ site }: { site: DemoSite }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLiveReservation = true;
  const campaignId = searchParams.get("campaignId")?.trim() || undefined;
  const couponId = searchParams.get("couponId")?.trim() || undefined;
  const initialStep = searchParams.get("step") === "complete" ? "complete" : "search";
  const loginRedirectPath = `${pathname}?${searchParams.toString()}`;
  const { profile } = useLineProfile({ loginRedirectPath });
  const [step, setStep] = useState<SalonStep>(initialStep);
  const [selectedMenuId, setSelectedMenuId] = useState(salonMenus[0].id);
  const [selectedStaffId, setSelectedStaffId] = useState(salonStaff[0].id);
  const [selectedDate, setSelectedDate] = useState(salonDates[0]);
  const [selectedTime, setSelectedTime] = useState("14:00");
  const [customer, setCustomer] = useState<CustomerForm>({
    name: "",
    kana: "",
    phone: "",
    email: "",
    visitCount: "初めて",
    notes: "",
    agreed: false,
  });
  const [menus, setMenus] = useState<Menu[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSalon = salons[0];
  const selectedMenu = salonMenus.find((menu) => menu.id === selectedMenuId) ?? salonMenus[0];
  const selectedStaff = salonStaff.find((staff) => staff.id === selectedStaffId) ?? salonStaff[0];
  const reservationNumber = useMemo(() => `HPB${salonSearchConditions.apiDate.replaceAll("-", "")}-123456`, []);
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

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("必須項目を入力し、利用規約に同意してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (isLiveReservation) {
        if (!profile) {
          throw new Error("LINEプロフィールを取得中です。少し待ってから再度お試しください。");
        }

        const selectedLiveMenu = menus.find((menu) => menu.id === selectedMenuId) ?? menus[0];

        if (!selectedLiveMenu) {
          throw new Error("予約メニューが見つかりません。メニュー設定を確認してください。");
        }

        const response = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuId: selectedLiveMenu.id,
            date: salonSearchConditions.apiDate,
            time: selectedTime,
            lineUserId: profile.userId,
            lineDisplayName: profile.displayName,
            linePictureUrl: profile.pictureUrl,
            displayName: customer.name.trim(),
            phone: customer.phone.trim(),
            email: customer.email.trim(),
            answers: {
              bookingTemplate: site.slug,
              salonName: selectedSalon.name,
              selectedMenu: selectedMenu.name,
              selectedStaff: selectedStaff.name,
              selectedDate,
              selectedTime,
              kana: customer.kana,
              visitCount: customer.visitCount,
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
    <main className="min-h-screen px-4 py-6" style={{ backgroundColor: "#FFF9FB", color: theme.ink }}>
      <div className="mx-auto w-full max-w-md">
        <StepRail currentStep={step} />
        <div className="mt-6">
          {step === "search" ? (
          <PhoneFrame>
            <SearchStep
              selectedDate={selectedDate}
              selectedMenuId={selectedMenuId}
              onSelectDate={setSelectedDate}
              onSelectMenu={setSelectedMenuId}
              onNext={() => setStep("booking")}
            />
          </PhoneFrame>
          ) : null}
          {step === "booking" ? (
          <PhoneFrame>
            <BookingStep
              selectedMenu={selectedMenu}
              selectedStaffId={selectedStaffId}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectStaff={setSelectedStaffId}
              onSelectTime={setSelectedTime}
              onBack={() => setStep("search")}
              onNext={() => setStep("customer")}
            />
          </PhoneFrame>
          ) : null}
          {step === "customer" ? (
          <PhoneFrame>
            <CustomerStep customer={customer} error={error} isSubmitting={isSubmitting} canSubmit={canSubmit} onChange={setCustomer} onBack={() => setStep("booking")} onSubmit={submitReservation} />
          </PhoneFrame>
          ) : null}
          {step === "complete" ? (
          <PhoneFrame>
            <CompleteStep reservationNumber={reservationNumber} selectedSalon={selectedSalon} selectedMenu={selectedMenu} selectedStaff={selectedStaff} selectedDate={selectedDate} selectedTime={selectedTime} customer={customer} onRestart={() => setStep("search")} />
          </PhoneFrame>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function StepRail({ currentStep }: { currentStep: SalonStep }) {
  const steps: Array<{ key: SalonStep; label: string }> = [
    { key: "search", label: "予約内容選択" },
    { key: "booking", label: "日時選択" },
    { key: "customer", label: "お客様情報入力" },
    { key: "complete", label: "予約完了" },
  ];
  const currentIndex = steps.findIndex((step) => step.key === currentStep);

  return (
    <div className="mt-6 hidden grid-cols-4 items-start gap-3 md:grid">
      {steps.map((step, index) => (
        <div key={step.key} className="text-center">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: index <= currentIndex ? theme.pink : "#E9C7D2" }}>
            {index + 1}
          </div>
          <p className="mt-3 text-xs font-semibold">{step.label}</p>
        </div>
      ))}
    </div>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <section className="min-h-[700px] overflow-hidden rounded-2xl border bg-white shadow-[0_18px_48px_rgba(177,45,93,0.10)] transition" style={{ borderColor: theme.pink }}>
      {children}
    </section>
  );
}

function PhoneHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="flex h-14 items-center border-b px-4" style={{ borderColor: "#F7DDE6" }}>
      <button type="button" onClick={onBack} disabled={!onBack} className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition disabled:opacity-30" aria-label="戻る">‹</button>
      <p className="flex-1 pr-9 text-center text-sm font-bold">{title}</p>
    </div>
  );
}

function SearchStep({
  selectedDate,
  selectedMenuId,
  onSelectDate,
  onSelectMenu,
  onNext,
}: {
  selectedDate: string;
  selectedMenuId: string;
  onSelectDate: (date: string) => void;
  onSelectMenu: (menuId: string) => void;
  onNext: () => void;
}) {
  const [openField, setOpenField] = useState<"date" | "menu" | null>(null);
  const selectedSearchMenu = salonMenus.find((menu) => menu.id === selectedMenuId) ?? salonMenus[0];

  return (
    <div>
      <div className="space-y-4 p-4">
        <SalonIntro />
        <SearchSelect
          label="日時"
          value={selectedDate}
          open={openField === "date"}
          options={salonDates.map((date) => ({ label: date, value: date }))}
          onToggle={() => setOpenField((field) => (field === "date" ? null : "date"))}
          onSelect={(date) => {
            onSelectDate(date);
            setOpenField(null);
          }}
        />
        <SearchSelect
          label="メニュー"
          value={selectedSearchMenu.name}
          open={openField === "menu"}
          options={salonMenus.map((menu) => ({ label: menu.name, value: menu.id }))}
          onToggle={() => setOpenField((field) => (field === "menu" ? null : "menu"))}
          onSelect={(menuId) => {
            onSelectMenu(menuId);
            setOpenField(null);
          }}
        />
        <PrimaryButton onClick={onNext}>この条件で検索する</PrimaryButton>
      </div>
    </div>
  );
}

function SalonIntro() {
  const salon = salons[0];

  return (
    <Card>
      <ImageBox label="SALON IMAGE" wide />
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.pink }}>
          Beauty salon
        </p>
        <h2 className="mt-2 text-lg font-bold">{salon.name}</h2>
        <p className="mt-2 text-xs leading-5" style={{ color: theme.muted }}>
          {salon.intro}
        </p>
        <p className="mt-2 text-xs font-semibold" style={{ color: theme.muted }}>
          {salon.area} / {salon.access}
        </p>
      </div>
    </Card>
  );
}

function BookingStep({ selectedMenu, selectedStaffId, selectedDate, selectedTime, onSelectStaff, onSelectTime, onBack, onNext }: { selectedMenu: SalonMenu; selectedStaffId: string; selectedDate: string; selectedTime: string; onSelectStaff: (id: string) => void; onSelectTime: (time: string) => void; onBack: () => void; onNext: () => void }) {
  return (
    <div>
      <PhoneHeader title="日時選択" onBack={onBack} />
      <div className="space-y-4 p-4">
        <Card>
          <p className="text-xs font-bold">選択中のメニュー</p>
          <p className="mt-2 text-sm font-bold">{selectedMenu.name}</p>
          <p className="mt-1 text-lg font-bold">¥{selectedMenu.salePrice.toLocaleString()}</p>
        </Card>
        <div>
          <SectionTitle>スタッフを選択</SectionTitle>
          <div className="mt-3 flex gap-3 overflow-x-auto">
            {salonStaff.map((staff) => <button key={staff.id} type="button" onClick={() => onSelectStaff(staff.id)}><StaffAvatar staff={staff} selected={selectedStaffId === staff.id} /></button>)}
          </div>
        </div>
        <Card>
          <p className="text-xs font-bold">選択中の日付</p>
          <p className="mt-2 text-sm font-bold">{selectedDate}</p>
        </Card>
        <div>
          <SectionTitle>時間を選択</SectionTitle>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {salonTimes.map((time) => {
              const disabled = salonFullTimes.has(time);
              return <button key={time} type="button" disabled={disabled} onClick={() => onSelectTime(time)} className="h-10 rounded-lg border text-xs font-bold disabled:bg-[#F7EEF2] disabled:text-[#C8AAB5]" style={{ borderColor: selectedTime === time ? theme.pink : theme.border, backgroundColor: selectedTime === time ? theme.pink : theme.surface, color: selectedTime === time ? "#FFFFFF" : theme.ink }}>{disabled ? "-" : time}</button>;
            })}
          </div>
        </div>
        <PrimaryButton onClick={onNext}>次へ（お客様情報入力へ）</PrimaryButton>
      </div>
    </div>
  );
}

function CustomerStep({ customer, error, isSubmitting, canSubmit, onChange, onBack, onSubmit }: { customer: CustomerForm; error: string; isSubmitting: boolean; canSubmit: boolean; onChange: (customer: CustomerForm) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  function update(key: keyof CustomerForm, value: string | boolean) {
    onChange({ ...customer, [key]: value });
  }

  return (
    <div>
      <PhoneHeader title="お客様情報入力" onBack={onBack} />
      <form onSubmit={onSubmit} className="space-y-3 p-4">
        <TextField label="氏名" required value={customer.name} placeholder="山田 花子" onChange={(value) => update("name", value)} />
        <TextField label="フリガナ" required value={customer.kana} placeholder="ヤマダ ハナコ" onChange={(value) => update("kana", value)} />
        <TextField label="電話番号" required value={customer.phone} placeholder="090-1234-5678" onChange={(value) => update("phone", value)} />
        <TextField label="メールアドレス" required value={customer.email} placeholder="hanako@example.com" onChange={(value) => update("email", value)} />
        <div>
          <p className="mb-2 text-sm font-bold">来店回数</p>
          <div className="grid grid-cols-3 gap-2">
            {["初めて", "2回目", "3回目以上"].map((item) => <button key={item} type="button" onClick={() => update("visitCount", item)} className="rounded-lg border px-2 py-2 text-xs font-bold" style={{ borderColor: customer.visitCount === item ? theme.pink : theme.border, color: customer.visitCount === item ? theme.pink : theme.ink }}>{item}</button>)}
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-bold">ご要望</span>
          <textarea value={customer.notes} onChange={(event) => update("notes", event.target.value)} placeholder="要望があればご記入ください" className="mt-2 min-h-24 w-full rounded-lg border px-3 py-3 text-sm outline-none" style={{ borderColor: theme.border }} />
        </label>
        <label className="flex items-start gap-2 text-xs" style={{ color: theme.muted }}>
          <input type="checkbox" checked={customer.agreed} onChange={(event) => update("agreed", event.target.checked)} className="mt-0.5 h-4 w-4 rounded" />
          <span>利用規約・プライバシーポリシーに同意する</span>
        </label>
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={!canSubmit || isSubmitting} className="h-12 w-full rounded-xl text-sm font-bold text-white transition disabled:bg-[#E7BDCA]" style={{ backgroundColor: canSubmit && !isSubmitting ? theme.pink : undefined }}>{isSubmitting ? "予約しています" : "予約内容を確認する"}</button>
      </form>
    </div>
  );
}

function CompleteStep({ reservationNumber, selectedSalon, selectedMenu, selectedStaff, selectedDate, selectedTime, customer, onRestart }: { reservationNumber: string; selectedSalon: Salon; selectedMenu: SalonMenu; selectedStaff: SalonStaff; selectedDate: string; selectedTime: string; customer: CustomerForm; onRestart: () => void }) {
  return (
    <div>
      <PhoneHeader title="予約完了" onBack={onRestart} />
      <div className="space-y-4 p-4 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 text-4xl" style={{ borderColor: theme.pink, color: theme.pink }}>✓</div>
        <h2 className="text-lg font-bold">ご予約が完了しました！</h2>
        <Card>
          <DetailBlock label="予約番号" value={reservationNumber} />
          <DetailBlock label="店舗名" value={selectedSalon.name} />
          <DetailBlock label="メニュー" value={selectedMenu.name} />
          <DetailBlock label="担当スタッフ" value={selectedStaff.name} />
          <DetailBlock label="日時" value={`${selectedDate} ${selectedTime}〜`} />
          <DetailBlock label="料金" value={`¥${selectedMenu.salePrice.toLocaleString()}`} />
          <DetailBlock label="お客様情報" value={`${customer.name || "山田 花子"}\n${customer.phone || "090-1234-5678"}\n${customer.email || "hanako@example.com"}`} />
        </Card>
        <PrimaryButton onClick={onRestart}>予約一覧へ</PrimaryButton>
        <SecondaryButton onClick={onRestart}>トップへ戻る</SecondaryButton>
      </div>
    </div>
  );
}

function SearchSelect({
  label,
  value,
  open,
  options,
  onToggle,
  onSelect,
}: {
  label: string;
  value: string;
  open: boolean;
  options: Array<{ label: string; value: string }>;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold">{label}</p>
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition"
        style={{ borderColor: open ? theme.pink : theme.border, backgroundColor: open ? theme.soft : theme.surface }}
      >
        <span className="min-w-0 flex-1">{value}</span>
        <span className="shrink-0 transition-transform" style={{ color: theme.pink, transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
          ›
        </span>
      </button>
      {open ? (
        <div className="mt-2 space-y-2 rounded-xl border bg-white p-2" style={{ borderColor: theme.border }}>
          {options.map((option) => {
            const selected = option.label === value || option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition"
                style={{ backgroundColor: selected ? theme.pink : "#FFF7FA", color: selected ? "#FFFFFF" : theme.ink }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function StaffAvatar({ staff, selected = false }: { staff: SalonStaff; selected?: boolean }) {
  return <div className="w-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border text-xs font-bold" style={{ borderColor: selected ? theme.pink : theme.border, backgroundColor: selected ? theme.soft : "#F8F2F4", color: theme.pink }}>{staff.imageLabel}</div><p className="mt-1 truncate text-[11px] font-bold">{staff.name}</p></div>;
}

function ImageBox({ label, wide = false, small = false }: { label: string; wide?: boolean; small?: boolean }) {
  if (wide) {
    return (
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-[#FFF3F7]">
        <Image src="/calendar.png" alt={label} fill sizes="(max-width: 768px) 100vw, 448px" className="object-cover" />
      </div>
    );
  }

  return <div className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-[#F8D7E2] to-[#FFF3F7] font-bold text-[#C23867] ${small ? "h-16 w-16 rounded-lg text-xs" : "h-24 w-24 rounded-lg text-xs"}`}>{label}</div>;
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-xl border bg-white p-4 text-left" style={{ borderColor: theme.border }}>{children}</section>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-bold">{children}</h3>;
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-12 w-full rounded-xl text-sm font-bold text-white shadow-[0_14px_28px_rgba(231,56,111,0.22)]" style={{ backgroundColor: theme.pink }}>{children}</button>;
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-12 w-full rounded-xl border bg-white text-sm font-bold" style={{ borderColor: theme.pink, color: theme.pink }}>{children}</button>;
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return <div className="border-b py-2 last:border-b-0" style={{ borderColor: theme.border }}><p className="text-xs font-bold">{label}</p><p className="mt-1 whitespace-pre-line text-sm">{value}</p></div>;
}

function TextField({ label, required, value, placeholder, onChange }: { label: string; required?: boolean; value: string; placeholder: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-sm font-bold">{label}{required ? <span className="ml-1 text-xs" style={{ color: theme.pink }}>必須</span> : null}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition" style={{ borderColor: theme.border }} /></label>;
}

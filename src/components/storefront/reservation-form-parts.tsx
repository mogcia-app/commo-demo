import type { AvailableSlot, Menu, Question, Staff, StoreModules } from "@/lib/storefront/types";

export function MenuSelector({
  menus,
  value,
  onChange,
}: {
  menus: Menu[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {menus.map((menu) => {
        const selected = value === menu.id;

        return (
          <button
            key={menu.id}
            type="button"
            onClick={() => onChange(menu.id)}
            className="rounded-[var(--store-radius)] border bg-white p-4 text-left transition"
            style={{
              borderColor: selected ? "var(--store-primary)" : "#E2E8F0",
              boxShadow: selected ? "0 0 0 2px var(--store-secondary)" : undefined,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{menu.name}</p>
                <p className="mt-1 text-sm leading-6" style={{ color: "var(--store-muted)" }}>
                  {menu.description}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold">{menu.priceLabel}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function StaffSelector({
  staff,
  value,
  onChange,
}: {
  staff: Staff[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange("")}
        className="rounded-[var(--store-radius)] border bg-white p-4 text-left"
        style={{ borderColor: value ? "#E2E8F0" : "var(--store-primary)" }}
      >
        <p className="font-bold">指名なし</p>
        <p className="mt-1 text-sm" style={{ color: "var(--store-muted)" }}>
          空き状況に合わせて店舗が担当します。
        </p>
      </button>
      {staff.map((member) => (
        <button
          key={member.id}
          type="button"
          onClick={() => onChange(member.id)}
          className="rounded-[var(--store-radius)] border bg-white p-4 text-left"
          style={{ borderColor: value === member.id ? "var(--store-primary)" : "#E2E8F0" }}
        >
          <p className="text-xs font-bold" style={{ color: "var(--store-primary)" }}>
            {member.role}
          </p>
          <p className="mt-1 font-bold">{member.name}</p>
          <p className="mt-1 text-sm leading-6" style={{ color: "var(--store-muted)" }}>
            {member.profile}
          </p>
        </button>
      ))}
    </div>
  );
}

export function Calendar({
  availableSlots,
  value,
  onChange,
  compact = false,
}: {
  availableSlots: AvailableSlot[];
  value?: string;
  onChange?: (date: string, time: string) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="mb-4 rounded-[var(--store-radius)] bg-white p-4 shadow-sm">
        <p className="text-sm font-bold">直近の空き枠</p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {availableSlots.map((slot) => (
            <span
              key={`${slot.date}-${slot.time}`}
              className="shrink-0 rounded-full px-3 py-2 text-xs font-bold"
              style={{ backgroundColor: "var(--store-secondary)", color: "var(--store-primary)" }}
            >
              {slot.date} {slot.time}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {availableSlots.map((slot) => {
        const key = `${slot.date} ${slot.time}`;
        const selected = value === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange?.(slot.date, slot.time)}
            className="rounded-[var(--store-radius)] border bg-white p-4 text-left"
            style={{ borderColor: selected ? "var(--store-primary)" : "#E2E8F0" }}
          >
            <p className="font-bold">
              {slot.date} {slot.time}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--store-muted)" }}>
              残り {slot.remaining} 枠
            </p>
          </button>
        );
      })}
    </div>
  );
}

export function CustomerForm({
  displayName,
  phone,
  email,
  onDisplayNameChange,
  onPhoneChange,
  onEmailChange,
}: {
  displayName: string;
  phone: string;
  email: string;
  onDisplayNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onEmailChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <LabeledInput label="お名前" value={displayName} onChange={onDisplayNameChange} />
      <LabeledInput label="電話番号" value={phone} onChange={onPhoneChange} inputMode="tel" />
      <LabeledInput label="メールアドレス" value={email} onChange={onEmailChange} inputMode="email" />
    </div>
  );
}

export function Questionnaire({
  questions,
  answers,
  onChange,
}: {
  questions: Question[];
  answers: Record<string, string>;
  onChange: (questionId: string, value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {questions.map((question) => (
        <label key={question.id} className="block">
          <span className="text-sm font-bold">
            {question.label}
            {question.required ? <span style={{ color: "var(--store-primary)" }}> *</span> : null}
          </span>
          {question.type === "select" ? (
            <select
              value={answers[question.id] ?? ""}
              onChange={(event) => onChange(question.id, event.target.value)}
              className="mt-2 w-full rounded-[var(--store-radius)] border border-slate-200 bg-white px-3 py-3 outline-none"
            >
              <option value="">選択してください</option>
              {question.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : question.type === "textarea" ? (
            <textarea
              value={answers[question.id] ?? ""}
              onChange={(event) => onChange(question.id, event.target.value)}
              className="mt-2 min-h-28 w-full rounded-[var(--store-radius)] border border-slate-200 bg-white px-3 py-3 outline-none"
            />
          ) : (
            <input
              value={answers[question.id] ?? ""}
              onChange={(event) => onChange(question.id, event.target.value)}
              className="mt-2 w-full rounded-[var(--store-radius)] border border-slate-200 bg-white px-3 py-3 outline-none"
            />
          )}
        </label>
      ))}
    </div>
  );
}

export function LineLoginButton({ liffState }: { liffState: string }) {
  return (
    <div className="rounded-[var(--store-radius)] bg-white p-4 shadow-sm">
      <p className="text-sm font-bold">LINE認証</p>
      <p className="mt-1 text-sm" style={{ color: "var(--store-muted)" }}>
        {liffState}
      </p>
    </div>
  );
}

export function OptionalModules({
  modules,
  guestCount,
  notes,
  onGuestCountChange,
  onNotesChange,
}: {
  modules: StoreModules;
  guestCount: number;
  notes: string;
  onGuestCountChange: (value: number) => void;
  onNotesChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {modules.showGuestCount ? (
        <label className="block">
          <span className="text-sm font-bold">人数</span>
          <input
            type="number"
            min={1}
            max={20}
            value={guestCount}
            onChange={(event) => onGuestCountChange(Number(event.target.value))}
            className="mt-2 w-full rounded-[var(--store-radius)] border border-slate-200 bg-white px-3 py-3 outline-none"
          />
        </label>
      ) : null}
      {modules.showNotes ? (
        <label className="block">
          <span className="text-sm font-bold">備考</span>
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            className="mt-2 min-h-24 w-full rounded-[var(--store-radius)] border border-slate-200 bg-white px-3 py-3 outline-none"
          />
        </label>
      ) : null}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "tel" | "email";
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        className="mt-2 w-full rounded-[var(--store-radius)] border border-slate-200 bg-white px-3 py-3 outline-none"
      />
    </label>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLineProfile } from "@/hooks/use-line-profile";
import { ageGroupOptions, hotelPurposeOptions, prefectureOptions } from "@/lib/survey-taxonomy";

type SurveyAnswer = {
  name: string;
  ageGroup: string;
  purpose: string;
  prefecture: string;
  interests: string[];
  usageCount: string;
  weekdayNeeds: string;
  comment: string;
};

const interestOptions = ["朝食付きプラン", "スパ・サウナ", "レイトチェックアウト", "ファミリー向け客室", "記念日特典", "平日限定割引"];
const usageCountOptions = ["初めて", "年1回程度", "年2〜3回", "年4回以上", "法人・定期利用"];
const weekdayNeedsOptions = ["平日に泊まりたい", "平日の日帰り利用に興味あり", "平日限定プランなら検討したい", "週末・祝日が中心", "まだ決まっていない"];

export function SurveyForm() {
  const { profile, idToken, authVerified, authVerificationError, liffState } = useLineProfile({ loginRedirectPath: "/demo" });
  const [answer, setAnswer] = useState<SurveyAnswer>({
    name: "",
    ageGroup: "",
    purpose: "",
    prefecture: "",
    interests: [],
    usageCount: "",
    weekdayNeeds: "",
    comment: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedResponseId, setSavedResponseId] = useState("");

  useEffect(() => {
    if (!profile?.userId || !idToken || !authVerified) {
      return;
    }

    void fetch("/api/survey-open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineUserId: profile.userId,
        lineDisplayName: profile.displayName,
        linePictureUrl: profile.pictureUrl,
        idToken,
        source: "liff",
      }),
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as { alreadyAnswered?: boolean; latestSurveyResponseId?: string };

        if (response.ok && body.alreadyAnswered) {
          setAlreadyAnswered(true);
          setSavedResponseId(body.latestSurveyResponseId ?? "");
        }
      })
      .catch(() => undefined);
  }, [authVerified, idToken, profile?.displayName, profile?.pictureUrl, profile?.userId]);

  const answeredRequiredCount = useMemo(() => {
    return [answer.name, answer.ageGroup, answer.purpose, answer.prefecture, answer.usageCount, answer.weekdayNeeds].filter(Boolean).length;
  }, [answer.ageGroup, answer.name, answer.prefecture, answer.purpose, answer.usageCount, answer.weekdayNeeds]);

  const progress = Math.round((answeredRequiredCount / 6) * 100);

  function updateAnswer<K extends keyof SurveyAnswer>(key: K, value: SurveyAnswer[K]) {
    setAnswer((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function toggleInterest(interest: string) {
    setAnswer((current) => {
      const selected = current.interests.includes(interest);

      return {
        ...current,
        interests: selected ? current.interests.filter((item) => item !== interest) : [...current.interests, interest],
      };
    });
    setError("");
  }

  async function submitSurvey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authVerified || !idToken) {
      setError(authVerificationError || "公式LINEの友だち追加とLINE認証を確認できませんでした。");
      return;
    }

    if (!answer.name.trim() || !answer.ageGroup || !answer.purpose || !answer.prefecture || !answer.usageCount || !answer.weekdayNeeds) {
      setError("必須項目をすべて選択してください。");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/survey-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...answer,
          name: answer.name.trim(),
          comment: answer.comment.trim(),
          area: answer.prefecture,
          lineUserId: profile?.userId,
          lineDisplayName: profile?.displayName,
          linePictureUrl: profile?.pictureUrl,
          idToken,
          source: profile?.userId ? "liff" : "web",
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; surveyResponse?: { id?: string } };

      if (!response.ok) {
        throw new Error(body.error ?? "アンケート回答の保存に失敗しました。");
      }

      setSavedResponseId(body.surveyResponse?.id ?? "");
      setSubmitted(true);
      setAlreadyAnswered(false);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "アンケート回答の保存に失敗しました。";
      setError(message);

      if (message.includes("すでに回答済み")) {
        setAlreadyAnswered(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted || alreadyAnswered) {
    return (
      <section className="rounded-md border border-emerald-200 bg-white p-6 shadow-soft">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">✓</div>
        <p className="mt-5 text-sm font-bold text-emerald-700">{alreadyAnswered ? "回答済みです" : "回答を受け付けました"}</p>
        <h2 className="mt-2 text-2xl font-bold text-commo-ink">ご協力ありがとうございます</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {alreadyAnswered ? "アンケートはすでに回答済みです。回答内容に合わせておすすめプランをご案内します。" : "回答内容を保存しました。"}
        </p>
        {savedResponseId ? <p className="mt-2 text-xs font-semibold text-slate-500">回答ID: {savedResponseId}</p> : null}
        {!alreadyAnswered ? (
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <SummaryItem label="お名前" value={answer.name} />
            <SummaryItem label="年代" value={answer.ageGroup} />
            <SummaryItem label="利用目的" value={answer.purpose} />
            <SummaryItem label="お住まい" value={answer.prefecture} />
            <SummaryItem label="利用回数" value={answer.usageCount} />
            <SummaryItem label="平日ニーズ" value={answer.weekdayNeeds} />
          </dl>
        ) : null}
      </section>
    );
  }

  return (
    <form onSubmit={submitSurvey} className="rounded-md border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-commo-hover">所要時間 約1分</p>
          <h2 className="mt-1 text-2xl font-bold text-commo-ink">ホテル利用アンケート</h2>
        </div>
        <div className="min-w-32 text-right">
          <p className="text-xs font-semibold text-slate-500">必須回答 {answeredRequiredCount}/6</p>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-commo-main transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-7">
        <label className="block">
          <span className="text-base font-bold text-commo-ink">お名前 <span className="text-rose-500">*</span></span>
          <input
            value={answer.name}
            onChange={(event) => updateAnswer("name", event.target.value)}
            placeholder="例：山田 太郎"
            className="mt-3 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-commo-ink outline-none transition placeholder:text-slate-400 focus:border-commo-main focus:ring-4 focus:ring-purple-100"
          />
        </label>

        <fieldset>
          <legend className="text-base font-bold text-commo-ink">年代 <span className="text-rose-500">*</span></legend>
          <SelectField value={answer.ageGroup} options={ageGroupOptions} onChange={(value) => updateAnswer("ageGroup", value)} />
        </fieldset>

        <fieldset>
          <legend className="text-base font-bold text-commo-ink">ホテルの主な利用目的 <span className="text-rose-500">*</span></legend>
          <RadioGrid name="purpose" options={hotelPurposeOptions} value={answer.purpose} onChange={(value) => updateAnswer("purpose", value)} />
        </fieldset>

        <fieldset>
          <legend className="text-base font-bold text-commo-ink">どこから来ましたか？ <span className="text-rose-500">*</span></legend>
          <SelectField value={answer.prefecture} options={prefectureOptions} onChange={(value) => updateAnswer("prefecture", value)} />
        </fieldset>

        <fieldset>
          <legend className="text-base font-bold text-commo-ink">興味関心</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {interestOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggleInterest(option)}
                className={`rounded-md border px-4 py-2 text-sm font-bold transition ${
                  answer.interests.includes(option)
                    ? "border-commo-main bg-commo-main text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-commo-main hover:text-commo-hover"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-base font-bold text-commo-ink">ホテルの利用回数 <span className="text-rose-500">*</span></legend>
          <RadioGrid name="usageCount" options={usageCountOptions} value={answer.usageCount} onChange={(value) => updateAnswer("usageCount", value)} />
        </fieldset>

        <fieldset>
          <legend className="text-base font-bold text-commo-ink">平日ニーズ <span className="text-rose-500">*</span></legend>
          <SelectField value={answer.weekdayNeeds} options={weekdayNeedsOptions} onChange={(value) => updateAnswer("weekdayNeeds", value)} />
        </fieldset>

        <label className="block">
          <span className="text-base font-bold text-commo-ink">ご意見・ご要望</span>
          <textarea
            value={answer.comment}
            onChange={(event) => updateAnswer("comment", event.target.value)}
            placeholder="宿泊プラン、客室、レストランなどについて"
            rows={4}
            className="mt-3 w-full resize-none rounded-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-commo-ink outline-none transition placeholder:text-slate-400 focus:border-commo-main focus:ring-4 focus:ring-purple-100"
          />
        </label>
      </div>

      {error ? <p className="mt-5 rounded-md bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      {!authVerified ? (
        <p className="mt-5 rounded-md bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {authVerificationError || liffState || "公式LINEの友だち追加とLINE認証を確認しています。"}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">送信すると、回答内容をFirestoreへ保存します。</p>
        <button type="submit" disabled={isSubmitting || !authVerified || !idToken} className="rounded-md bg-commo-main px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-commo-hover disabled:cursor-not-allowed disabled:bg-slate-300">
          {isSubmitting ? "保存中..." : "回答を送信"}
        </button>
      </div>
    </form>
  );
}

function RadioGrid({ name, options, value, onChange }: { name: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label key={option} className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition has-[:checked]:border-commo-main has-[:checked]:bg-commo-soft has-[:checked]:text-commo-hover">
          <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} className="h-4 w-4 accent-commo-main" />
          {option}
        </label>
      ))}
    </div>
  );
}

function SelectField({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-3 w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-commo-ink outline-none transition focus:border-commo-main focus:ring-4 focus:ring-purple-100"
    >
      <option value="">選択してください</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-all font-bold text-commo-ink">{value}</dd>
    </div>
  );
}

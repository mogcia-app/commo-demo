"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { fetchAdminMenus, saveAdminMenus, type AdminMenu } from "@/lib/admin-api";

const emptyMenu: AdminMenu = {
  id: "",
  name: "",
  description: "",
  price: undefined,
  priceLabel: "",
  durationMinutes: 60,
  category: "room",
  imageUrl: "",
  enabled: true,
  sortOrder: 0,
};

export function MenuEditor() {
  const [menus, setMenus] = useState<AdminMenu[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const activeCount = useMemo(() => menus.filter((menu) => menu.enabled !== false).length, [menus]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError("");
      setMessage("");

      try {
        const result = await fetchAdminMenus();

        if (!ignore) {
          setMenus(result.menus);
        }
      } catch (cause) {
        if (!ignore) {
          setError(cause instanceof Error ? cause.message : "メニューの取得に失敗しました。");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  async function onSave() {
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await saveAdminMenus(menus);
      setMenus(result.menus);
      setMessage("メニューを保存しました。予約ページにも反映されます。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "メニューの保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }

  function updateMenu(index: number, patch: Partial<AdminMenu>) {
    setMenus((current) => current.map((menu, menuIndex) => (menuIndex === index ? { ...menu, ...patch } : menu)));
  }

  function addMenu() {
    setMenus((current) => [
      ...current,
      {
        ...emptyMenu,
        id: "",
        sortOrder: current.length,
      },
    ]);
  }

  function removeMenu(index: number) {
    setMenus((current) => current.filter((_, menuIndex) => menuIndex !== index));
  }

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-commo-ink">メニュー管理</h1>
          <p className="mt-1 text-sm text-slate-500">予約ページで表示するプラン名、料金、所要時間を管理します。</p>
        </div>
        <Link
          href="/hotel-search"
          className="rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover"
        >
          予約ページ
        </Link>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addMenu}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-commo-main"
          >
            メニューを追加
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="rounded-md bg-commo-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-commo-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            保存
          </button>
          <p className="text-sm font-semibold text-slate-500">表示中 {activeCount} 件</p>
        </div>

        {isLoading ? <p className="mt-4 text-sm text-slate-500">読み込み中です</p> : null}
        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold text-slate-500">
                <th className="border-b border-slate-200 px-3 py-2">表示</th>
                <th className="border-b border-slate-200 px-3 py-2">メニュー名</th>
                <th className="border-b border-slate-200 px-3 py-2">表示価格</th>
                <th className="border-b border-slate-200 px-3 py-2">数値価格</th>
                <th className="border-b border-slate-200 px-3 py-2">所要時間</th>
                <th className="border-b border-slate-200 px-3 py-2">カテゴリ</th>
                <th className="border-b border-slate-200 px-3 py-2">説明</th>
                <th className="border-b border-slate-200 px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((menu, index) => (
                <tr key={`${menu.id || "new"}-${index}`}>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={menu.enabled !== false}
                      onChange={(event) => updateMenu(index, { enabled: event.target.checked })}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <input
                      value={menu.name}
                      onChange={(event) => updateMenu(index, { name: event.target.value })}
                      className="w-44 rounded-md border border-slate-200 px-3 py-2"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <input
                      value={menu.priceLabel}
                      onChange={(event) => updateMenu(index, { priceLabel: event.target.value })}
                      className="w-32 rounded-md border border-slate-200 px-3 py-2"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <input
                      type="number"
                      min={0}
                      value={menu.price ?? ""}
                      onChange={(event) => updateMenu(index, { price: event.target.value ? Number(event.target.value) : undefined })}
                      className="w-28 rounded-md border border-slate-200 px-3 py-2"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <input
                      type="number"
                      min={1}
                      value={menu.durationMinutes}
                      onChange={(event) => updateMenu(index, { durationMinutes: Number(event.target.value) })}
                      className="w-24 rounded-md border border-slate-200 px-3 py-2"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <input
                      value={menu.category}
                      onChange={(event) => updateMenu(index, { category: event.target.value })}
                      className="w-28 rounded-md border border-slate-200 px-3 py-2"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <textarea
                      value={menu.description}
                      onChange={(event) => updateMenu(index, { description: event.target.value })}
                      className="min-h-20 w-64 rounded-md border border-slate-200 px-3 py-2"
                    />
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <button
                      type="button"
                      onClick={() => removeMenu(index)}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-300 hover:text-red-700"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

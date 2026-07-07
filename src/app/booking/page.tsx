import Link from "next/link";
import { redirect } from "next/navigation";
import { demoSites, getDemoSiteBySlug, getDemoSiteConfig } from "@/lib/demo-sites";

const templateKeys = ["template", "templateType", "pattern"];

type DemoPageSearchParams = Record<string, string | string[] | undefined>;

export default async function DemoPage({
  searchParams,
}: {
  searchParams?: Promise<DemoPageSearchParams>;
}) {
  const currentParams = await searchParams;
  const statePath = getFirstValue(currentParams?.["liff.state"]);
  const stateDestination = getStateDestination(statePath);

  if (stateDestination) {
    redirect(stateDestination);
  }

  const stateParams = getStateParams(statePath);
  const siteSlug = getFirstParam(currentParams, templateKeys) ?? getFirstParamFromUrlSearchParams(stateParams, templateKeys);
  const site = siteSlug ? getDemoSiteBySlug(siteSlug) : null;

  if (site) {
    redirect(`/booking/${site.slug}`);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto w-full max-w-6xl px-5 py-8">
        <p className="text-sm font-semibold text-commo-main">commo. booking</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-commo-ink">予約サイト</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          公式LINEのリッチメニューから直接開く予約ページです。
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {demoSites.map((site) => {
            const config = getDemoSiteConfig(site);

            return (
              <Link
                key={site.slug}
                href={`/booking/${site.slug}`}
                className="group overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-commo-main hover:shadow-soft"
              >
                <div className="p-5" style={{ backgroundColor: config.softAccent }}>
                  <p className="text-sm font-semibold" style={{ color: config.accent }}>
                    {config.templateLabel}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-commo-ink">{site.title}</h2>
                  <div className="mt-4 flex h-24 items-center justify-center rounded-md bg-white/75 px-3 text-center text-xs font-semibold text-slate-500">
                    {config.imagePlaceholder}
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-6 text-slate-600">{site.description}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-500">{config.steps.length}ステップ</p>
                  <span
                    className="mt-5 inline-flex rounded-md px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: config.accent }}
                  >
                    予約サイトを開く
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function getFirstParam(searchParams: DemoPageSearchParams | undefined, keys: string[]) {
  for (const key of keys) {
    const value = getFirstValue(searchParams?.[key])?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function getFirstParamFromUrlSearchParams(searchParams: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key)?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getStateDestination(statePath: string | undefined) {
  if (!statePath?.startsWith("/booking/")) {
    return null;
  }

  return statePath.split("?")[0];
}

function getStateParams(statePath: string | undefined) {
  if (!statePath) {
    return new URLSearchParams();
  }

  const queryIndex = statePath.indexOf("?");

  if (queryIndex === -1) {
    return new URLSearchParams(statePath.startsWith("/") ? "" : statePath);
  }

  return new URLSearchParams(statePath.slice(queryIndex + 1));
}

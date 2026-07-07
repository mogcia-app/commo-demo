import { NextResponse } from "next/server";
import { getQuestionsForStore, getStoreBySlug } from "@/lib/storefront/store-service";

export async function GET(_request: Request, { params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);

  if (!store) {
    return NextResponse.json({ error: "店舗が見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ questions: await getQuestionsForStore(store.id) });
}

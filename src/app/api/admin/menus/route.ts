import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb, requireAdminUser } from "@/lib/firebase/admin";
import { mockMenus } from "@/lib/storefront/mock-data";
import type { Menu } from "@/lib/storefront/types";

type AdminMenuRequest = {
  menus?: AdminMenuInput[];
};

type AdminMenuInput = {
  id?: string;
  name?: string;
  description?: string;
  price?: number | string;
  priceLabel?: string;
  durationMinutes?: number | string;
  category?: string;
  imageUrl?: string;
  enabled?: boolean;
  sortOrder?: number;
};

export async function GET(request: Request) {
  await requireAdminUser(request);

  return NextResponse.json({ menus: await getAdminMenus() });
}

export async function PUT(request: Request) {
  await requireAdminUser(request);

  const body = (await request.json().catch(() => ({}))) as AdminMenuRequest;

  if (!Array.isArray(body.menus)) {
    return NextResponse.json({ error: "menusが不正です。" }, { status: 400 });
  }

  const menus = body.menus.map(normalizeMenuInput);
  const invalidMenu = menus.find((menu) => !menu.name || !menu.priceLabel || !Number.isFinite(menu.durationMinutes) || menu.durationMinutes <= 0);

  if (invalidMenu) {
    return NextResponse.json({ error: "メニュー名、表示価格、所要時間を入力してください。" }, { status: 400 });
  }

  const db = getAdminDb();
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  const existingSnapshot = await db.collection("menus").get();
  const savedIds = new Set<string>();

  menus.forEach((menu, index) => {
    const id = menu.id || createMenuId(menu.name, index);
    savedIds.add(id);
    const ref = db.collection("menus").doc(id);

    batch.set(
      ref,
      {
        name: menu.name,
        description: menu.description,
        price: menu.price,
        priceLabel: menu.priceLabel,
        durationMinutes: menu.durationMinutes,
        category: menu.category,
        imageUrl: menu.imageUrl,
        enabled: menu.enabled,
        sortOrder: index,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true },
    );
  });

  existingSnapshot.docs.forEach((doc) => {
    if (!savedIds.has(doc.id)) {
      batch.delete(doc.ref);
    }
  });

  await batch.commit();

  return NextResponse.json({ menus: await getAdminMenus() });
}

async function getAdminMenus(): Promise<Menu[]> {
  const snapshot = await getAdminDb().collection("menus").orderBy("sortOrder", "asc").get();

  if (snapshot.empty) {
    return mockMenus.map((menu, index) => ({ ...menu, storeId: "default", sortOrder: index, enabled: true }));
  }

  return snapshot.docs.map((doc, index) => buildMenu(doc.id, doc.data(), index));
}

function normalizeMenuInput(input: AdminMenuInput) {
  const price = typeof input.price === "number" ? input.price : Number(String(input.price ?? "").replaceAll(",", ""));
  const durationMinutes = Number(input.durationMinutes);

  return {
    id: input.id?.trim(),
    name: input.name?.trim() ?? "",
    description: input.description?.trim() ?? "",
    price: Number.isFinite(price) ? price : undefined,
    priceLabel: input.priceLabel?.trim() ?? "",
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 0,
    category: input.category?.trim() || "menu",
    imageUrl: input.imageUrl?.trim() ?? "",
    enabled: input.enabled ?? true,
  };
}

function buildMenu(id: string, data: FirebaseFirestore.DocumentData, fallbackSortOrder: number): Menu {
  const price = typeof data.price === "number" ? data.price : Number(data.price);
  const durationMinutes = Number(data.durationMinutes);

  return {
    id,
    storeId: "default",
    name: typeof data.name === "string" ? data.name : "名称未設定メニュー",
    description: typeof data.description === "string" ? data.description : "",
    price: Number.isFinite(price) ? price : undefined,
    priceLabel: typeof data.priceLabel === "string" ? data.priceLabel : "",
    durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 60,
    imageUrl: typeof data.imageUrl === "string" && data.imageUrl ? data.imageUrl : undefined,
    category: typeof data.category === "string" ? data.category : "menu",
    enabled: data.enabled !== false,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : fallbackSortOrder,
  };
}

function createMenuId(name: string, index: number) {
  return `menu_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || index + 1}`;
}

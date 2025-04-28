import { catalogApi } from "../integrations/square";
import { db } from "../db";
import { menu_items } from "../../shared/schema";   // ← this path is correct


export async function syncCatalog() {
  console.log("Syncing Square catalog → Postgres …");
  const resp = await catalogApi.listCatalog({
    types: ["ITEM", "ITEM_VARIATION", "CATEGORY"],
  });
  const objs = resp.result.objects ?? [];

  const categories = Object.fromEntries(
    objs
      .filter((o) => o.type === "CATEGORY")
      .map((c) => [c.id, c.categoryData?.name ?? "Misc"])
  );

  const rows = objs
    .filter((o) => o.type === "ITEM_VARIATION")
    .map((v) => {
      const itemObj = objs.find((o) => o.id === v.itemVariationData?.itemId);
      const catName = categories[itemObj?.itemData?.categoryId] || "Misc";
      return {
        square_id: v.id,
        name: v.itemVariationData?.name,
        price_cents: v.itemVariationData?.priceMoney?.amount ?? 0,
        category: catName,
        station: catName === "Drinks" ? "Bar" : "Kitchen",
        cook_seconds: 300,
        active: true,
      };
    });

  await db.transaction(async (tx) => {
    for (const r of rows) {
      await tx
        .insert(menu_items)
        .values(r)
        .onConflictDoUpdate({ target: menu_items.square_id, set: r });
    }
  });

  console.log("Sync complete:", rows.length, "menu items");
}

if (import.meta.url.endsWith("syncSquareCatalog.ts")) {
  syncCatalog().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

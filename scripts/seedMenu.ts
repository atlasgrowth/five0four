// scripts/seedMenuFromJson.ts
import fs from "fs";
import { db } from "../server/db";
import { menu_items } from "../shared/schema";

(async () => {
  const raw = JSON.parse(fs.readFileSync("sandbox_catalog.json", "utf8"));

  // build category map
  const cats: Record<string, string> = {};
  for (const o of raw.objects) {
    if (o.type === "CATEGORY") cats[o.id] = o.category_data?.name ?? "Misc";
  }

  const rows = raw.objects
    .filter((o: any) => o.type === "ITEM_VARIATION")
    .map((v: any) => {
      const item = raw.objects.find((o: any) => o.id === v.item_variation_data.item_id);
      const cat = cats[item?.item_data?.category_id] || "Misc";
      return {
        square_id: v.id,
        name: v.item_variation_data.name,
        price_cents: v.item_variation_data.price_money.amount,
        category: cat,
        station: cat === "Drinks" ? "Bar" : "Kitchen",
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
  console.log("Seeded", rows.length, "rows");
  process.exit(0);
})();

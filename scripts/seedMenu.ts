
// scripts/seedMenu.ts
import fs from "fs";
import { db } from "../server/db";
import { menu_items } from "../shared/schema";

(async () => {
  try {
    if (!fs.existsSync("sandbox_catalog.json")) {
      console.error("Error: sandbox_catalog.json file not found");
      process.exit(1);
    }

    const rawData = fs.readFileSync("sandbox_catalog.json", "utf8");
    const raw = JSON.parse(rawData);

    if (!raw.objects || !Array.isArray(raw.objects) || raw.objects.length === 0) {
      console.warn("Warning: No catalog objects found in sandbox_catalog.json");
      process.exit(0);
    }

    // build category map
    const cats: Record<string, string> = {};
    for (const o of raw.objects) {
      if (o.type === "CATEGORY") {
        cats[o.id] = o.category_data?.name ?? "Misc";
      }
    }

    const rows = raw.objects
      .filter((o: any) => o.type === "ITEM_VARIATION")
      .map((v: any) => {
        const item = raw.objects.find((o: any) => o.id === v.item_variation_data?.item_id);
        const cat = cats[item?.item_data?.category_id] || "Misc";
        return {
          square_id: v.id,
          name: v.item_variation_data?.name,
          price_cents: v.item_variation_data?.price_money?.amount ?? 0,
          category: cat,
          station: cat === "Drinks" ? "Bar" : "Kitchen",
          cook_seconds: 300,
          active: true,
        };
      });

    if (rows.length === 0) {
      console.warn("Warning: No menu items to seed");
      process.exit(0);
    }

    await db.transaction(async (tx) => {
      for (const r of rows) {
        await tx
          .insert(menu_items)
          .values(r)
          .onConflictDoUpdate({ target: menu_items.square_id, set: r });
      }
    });
    
    console.log("Seeded", rows.length, "menu items");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding menu:", error);
    process.exit(1);
  }
})();

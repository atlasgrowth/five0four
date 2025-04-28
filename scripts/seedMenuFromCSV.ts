import fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../server/db";
import { menu_items } from "../shared/schema";
import crypto from "crypto";

const rows = parse(fs.readFileSync("scripts/menu_creole_tavern.csv"), {
  columns: true, skip_empty_lines: true,
});

async function seed() {
  await db.transaction(async tx => {
    for (const r of rows) {
      await tx.insert(menu_items).values({
        square_id: r.SKU || crypto.randomUUID(),   // placeholder
        name:      r.Name,
        description: r.Description,
        category:  r.Category,
        price_cents: Math.round(parseFloat(r.Price) * 100),
        station:   r.Category === "Drinks" ? "Bar" : "Kitchen",
        cook_seconds: 300,
        active: true,
      });
    }
  });
  console.log("Seeded", rows.length, "rows");
  process.exit(0);
}

seed().catch(console.error);
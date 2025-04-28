import fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../server/db";
import { menu_items } from "../shared/schema";
import crypto from "crypto";
import { sql } from "drizzle-orm";

const rows = parse(fs.readFileSync("scripts/menu_fixed.csv"), {
  columns: true, 
  skip_empty_lines: true,
  delimiter: ',',
  cast: true,
  trim: true
});

async function seed() {
  console.log(`Processing ${rows.length} menu items from CSV`);
  
  await db.transaction(async tx => {
    // Clear existing menu items for a fresh start
    await tx.delete(menu_items).execute();
    
    // Insert all menu items from CSV
    for(const r of rows) {
      await tx.insert(menu_items).values({
        square_id: r.SKU || crypto.randomUUID(),
        name: r.Name,
        description: r.Description || null,
        category: r.Category,
        price_cents: Math.round(parseFloat(r.Price) * 100),
        station: r.Category === "Drinks" ? "Bar" : "Kitchen",
        cook_seconds: parseInt(r.PrepSeconds, 10) || 300,
        active: true
      });
    }
  });
  
  console.log(`Successfully seeded ${rows.length} menu items with prep times`);
  process.exit(0);
}

seed().catch(err => {
  console.error("Error seeding menu:", err);
  process.exit(1);
});
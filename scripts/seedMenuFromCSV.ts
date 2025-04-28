import fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "../server/db";
import { menu_items } from "../shared/schema";
import crypto from "crypto";
import { sql } from "drizzle-orm";

// Read CSV file and handle it line by line to fix formatting issues
const csvContent = fs.readFileSync("scripts/menu_creole_tavern.csv", "utf-8");
const lines = csvContent.split("\n");
const header = lines[0];
const rowsRaw = [];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  
  const line = lines[i];
  // Process menu items
  const fields = {};
  
  // Extract fields using regex patterns
  const nameMatch = line.match(/^([^,]+),/);
  fields.Name = nameMatch ? nameMatch[1] : "";
  
  // Category is typically before the "Regular" field
  const categoryMatch = line.match(/,([^,]+),Regular,/);
  fields.Category = categoryMatch ? categoryMatch[1] : "";
  
  // Price comes after empty SKU field
  const priceMatch = line.match(/,Regular,+,([0-9.]+),/);
  fields.Price = priceMatch ? priceMatch[1] : "0";
  
  // PrepSeconds is at the end of the line
  const prepMatch = line.match(/,([0-9]+)$/);
  fields.PrepSeconds = prepMatch ? prepMatch[1] : "300";
  
  // Description is what remains between name and category
  const descStart = line.indexOf(',') + 1;
  const descEnd = line.lastIndexOf(',' + fields.Category + ',');
  
  if (descStart > 0 && descEnd > descStart) {
    fields.Description = line.substring(descStart, descEnd);
  } else {
    fields.Description = "";
  }
  
  rowsRaw.push(fields);
}

// For debugging
console.log(`Processed ${rowsRaw.length} menu items`);

const rows = rowsRaw;

const namesLC = rows.map((r: any) => r.Name.toLowerCase());

async function seed() {
  await db.transaction(async tx => {
    for(const r of rows) {
      const nameLC = r.Name.toLowerCase();
      const existing = await tx.select().from(menu_items)
                     .where(sql`LOWER(${menu_items.name}) = ${nameLC}`);
      const row = {
        name: r.Name,
        description: r.Description || null,
        category: r.Category,
        price_cents: Math.round(parseFloat(r.Price) * 100),
        station: r.Category === "Drinks" ? "Bar" : "Kitchen",
        cook_seconds: parseInt(r.PrepSeconds, 10) || 300,
        active: true,
      };
      
      if(existing.length) {
        await tx.update(menu_items).set(row)
                .where(sql`LOWER(${menu_items.name}) = ${nameLC}`);
      } else {
        await tx.insert(menu_items).values({
          ...row,
          square_id: r.SKU || crypto.randomUUID()
        });
      }
    }
    
    // Remove items not in the CSV
    await tx.delete(menu_items)
            .where(sql`LOWER(${menu_items.name}) NOT IN (${namesLC.map(n => `'${n}'`).join(",")})`);
  });
  
  console.log("Seeded", rows.length, "rows with prep times");
  process.exit(0);
}

seed().catch(console.error);
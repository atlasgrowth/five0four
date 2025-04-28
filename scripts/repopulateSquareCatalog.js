
// scripts/repopulateSquareCatalog.js
import { randomUUID } from "node:crypto";
import fs from "fs";

const token = process.env.SQUARE_SANDBOX_TOKEN;
const ver   = "2025-04-16";
if (!token) throw new Error("Missing SQUARE_SANDBOX_TOKEN");

// First clear existing catalog
async function clearCatalog() {
  console.log("Checking for existing catalog items...");
  
  try {
    const listRes = await fetch(
      "https://connect.squareupsandbox.com/v2/catalog/list?types=ITEM,ITEM_VARIATION,CATEGORY",
      {
        headers: {
          "Square-Version": ver,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    
    const listJson = await listRes.json();
    const existingIds = (listJson.objects || []).map((o) => o.id);
    
    if (existingIds.length > 0) {
      console.log(`Found ${existingIds.length} existing objects. Deleting them first...`);
      
      const batchRes = await fetch(
        "https://connect.squareupsandbox.com/v2/catalog/batch-delete",
        {
          method: "POST",
          headers: {
            "Square-Version": ver,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            object_ids: existingIds,
          }),
        }
      );
      
      const batchJson = await batchRes.json();
      console.log(`Deleted ${existingIds.length} objects:`, batchJson.errors || "Success");
    } else {
      console.log("No existing catalog items found.");
    }
  } catch (error) {
    console.error("Error clearing catalog:", error);
  }
}

// --- Inline CSV: Name,Category,Price (no header commas at line ends) ---
const csv = `Name,Category,Price
Boudin Balls,Shareables,12.50
504 Wings,Shareables,14.00
Cajun Crawfish Pies,Shareables,13.00
Smoked Tuna Dip with Cajun Fried Crackers,Shareables,15.00
Pineapple Fried Shrimp with Sriracha Sesame Salad,Shareables,14.00
Clubhouse Nachos,Shareables,15.50
Chips & Salsa,Shareables,6.00
Bowl of Queso,Shareables,8.00
Chips & Queso,Shareables,9.50
The Hangover,Burgers,18.00
The Classic Ride,Burgers,17.00
Electric Blue,Burgers,18.50
Impossible Burger,Burgers,17.00
504 12" Pizza,Pizzas & Flatbreads,17.00
Cheesy Garlic Bread,Pizzas & Flatbreads,12.50
Crazy Cajun Flatbread,Pizzas & Flatbreads,22.50
Barbecue Chicken Pizza,Pizzas & Flatbreads,21.00
Street Party Tacos 'Al Pastor',Handhelds,16.00
Crispy Fried Chicken Tenders,Handhelds,16.00
Steak Frites,Entrees,38.00
Filet Mignon Frites,Entrees,46.00
Shrimp Monique,Entrees,24.00
Gulf Catch Creole,Entrees,26.50
Golden Fried Seafood Platter,Entrees,23.00
Make It a Double Seafood Platter,Entrees,46.00
Sand Wedge Salad,Salads,13.00
Classic Caesar Salad,Salads,12.00
Strawberries & Goat Cheese Salad,Salads,14.00
Gumbo (Cup),Soups,8.00
Gumbo (Bowl),Soups,12.00
Garlic Grilled Vegetables,Sides,7.00
Crispy Kettle Fries,Sides,6.00
House Green Salad,Sides,8.00
The Big Kid Burger,Kids,12.00
Kids Fried Chicken Tenders,Kids,12.00
On the Green Pie,Desserts,8.00
Very Berry Cheesecake,Desserts,9.00
Pecan Chocolate Chip Bread Pudding,Desserts,12.00
`;

function parseRows(txt) {
  return txt
    .trim()
    .split("\n")
    .slice(1)
    .map((l) => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/));
}

async function createCatalog() {
  const rows = parseRows(csv);
  
  // Use a Set to track unique items by name to prevent duplicates
  const processedItems = new Set();
  
  // Build category objects + items+variations
  const catMap = {};
  const objects = [];

  for (const [name, category, price] of rows) {
    // Skip if this item has already been processed
    if (processedItems.has(name)) {
      console.log(`Skipping duplicate item: ${name}`);
      continue;
    }
    
    processedItems.add(name);
    
    if (!catMap[category]) {
      const catId = `#${randomUUID()}`;
      catMap[category] = catId;
      objects.push({
        id: catId,
        type: "CATEGORY",
        category_data: { name: category },
      });
    }

    const itemId = `#${randomUUID()}`;
    objects.push({
      id: itemId,
      type: "ITEM",
      item_data: {
        name,
        category_id: catMap[category],
        description: "",
      },
    });

    objects.push({
      id: `#${randomUUID()}`,
      type: "ITEM_VARIATION",
      item_variation_data: {
        item_id: itemId,
        name: "Regular",
        price_money: {
          amount: Math.round(parseFloat(price) * 100),
          currency: "USD",
        },
      },
    });
  }

  console.log(`Creating ${objects.length} catalog objects for ${processedItems.size} unique menu items...`);
  
  // Send batch-upsert
  const resp = await fetch(
    "https://connect.squareupsandbox.com/v2/catalog/batch-upsert",
    {
      method: "POST",
      headers: {
        "Square-Version": ver,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: randomUUID(),
        batches: [{ objects }],
      }),
    }
  );

  const data = await resp.json();
  console.log("HTTP", resp.status, data.errors || `Upserted ${data.objects?.length} objects`);
}

// Main execution
(async function main() {
  await clearCatalog();
  await createCatalog();
})();

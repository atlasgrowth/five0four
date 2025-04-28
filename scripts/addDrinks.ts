import { db } from "../server/db";
import { menu_items } from "../shared/schema";
import crypto from "crypto";

async function addDrinks() {
  const drinks = [
    { name: "Iced Tea", description: "Southern sweet or unsweet", category: "Drinks", price_cents: 350, cook_seconds: 60 },
    { name: "Lemonade", description: "Fresh-squeezed with mint", category: "Drinks", price_cents: 350, cook_seconds: 90 },
    { name: "Craft Root Beer", description: "Local craft root beer", category: "Drinks", price_cents: 450, cook_seconds: 30 },
    { name: "Arnold Palmer", description: "Half iced tea, half lemonade", category: "Drinks", price_cents: 350, cook_seconds: 60 },
    { name: "Classic Margarita", description: "Tequila, fresh lime, triple sec", category: "Drinks", price_cents: 1200, cook_seconds: 120 },
    { name: "Mojito", description: "Rum, mint, lime, soda", category: "Drinks", price_cents: 1100, cook_seconds: 180 },
    { name: "Bloody Mary", description: "House-seasoned with pickled garnish", category: "Drinks", price_cents: 1100, cook_seconds: 180 },
    { name: "Moscow Mule", description: "Vodka, ginger beer, lime", category: "Drinks", price_cents: 1200, cook_seconds: 120 },
    { name: "Old Fashioned", description: "Bourbon, bitters, sugar, orange", category: "Drinks", price_cents: 1300, cook_seconds: 180 },
    { name: "Draft Beer (Local)", description: "Seasonal craft selection", category: "Drinks", price_cents: 700, cook_seconds: 60 },
    { name: "Draft Beer (Import)", description: "Premium imported beer", category: "Drinks", price_cents: 800, cook_seconds: 60 },
    { name: "House Wine", description: "Red or white, by the glass", category: "Drinks", price_cents: 900, cook_seconds: 90 },
  ];

  await db.transaction(async tx => {
    for(const drink of drinks) {
      await tx.insert(menu_items).values({
        square_id: crypto.randomUUID(),
        name: drink.name,
        description: drink.description,
        category: drink.category,
        price_cents: drink.price_cents,
        station: "Bar", // All drinks go to the bar station
        cook_seconds: drink.cook_seconds,
        active: true
      });
    }
  });
  
  console.log(`Added ${drinks.length} drink items to the menu`);
  process.exit(0);
}

addDrinks().catch(err => {
  console.error("Error adding drinks:", err);
  process.exit(1);
});
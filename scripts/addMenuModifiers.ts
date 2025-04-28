import { db } from "../server/db";
import { menu_items, menu_modifiers } from "../shared/schema";
import { eq, like } from "drizzle-orm";

async function addMenuModifiers() {
  // First, let's get the IDs for our menu items that need modifiers
  const wingsResult = await db.select().from(menu_items).where(like(menu_items.name, '%Wings%'));
  const pizzaResult = await db.select().from(menu_items).where(like(menu_items.name, '%Pizza%'));
  const steakResult = await db.select().from(menu_items).where(like(menu_items.name, '%Steak%'));
  
  if (wingsResult.length === 0 || pizzaResult.length === 0 || steakResult.length === 0) {
    console.error("Could not find all required menu items for modifiers");
    return;
  }
  
  const wingsId = wingsResult[0].id;
  const pizzaId = pizzaResult[0].id;
  const steakId = steakResult[0].id;
  
  console.log(`Found menu items: Wings (ID: ${wingsId}), Pizza (ID: ${pizzaId}), Steak (ID: ${steakId})`);
  
  try {
    await db.transaction(async tx => {
      // Clear existing modifiers first to avoid duplicates
      await tx.delete(menu_modifiers);
      
      // Add sauce modifiers for wings
      const sauceModifiers = [
        { menu_item_id: wingsId, group_name: "Sauce", name: "Buffalo", price_delta_cents: 0 },
        { menu_item_id: wingsId, group_name: "Sauce", name: "BBQ", price_delta_cents: 0 },
        { menu_item_id: wingsId, group_name: "Sauce", name: "Garlic-Parmesan", price_delta_cents: 0 }
      ];
      
      // Add toppings for pizza
      const toppingModifiers = [
        { menu_item_id: pizzaId, group_name: "Topping", name: "Cheese", price_delta_cents: 0 },
        { menu_item_id: pizzaId, group_name: "Topping", name: "Pepperoni", price_delta_cents: 200 },
        { menu_item_id: pizzaId, group_name: "Topping", name: "Sausage", price_delta_cents: 200 },
        { menu_item_id: pizzaId, group_name: "Topping", name: "Mushrooms", price_delta_cents: 150 }
      ];
      
      // Add temperature for steak
      const tempModifiers = [
        { menu_item_id: steakId, group_name: "Temperature", name: "Rare", price_delta_cents: 0 },
        { menu_item_id: steakId, group_name: "Temperature", name: "Medium Rare", price_delta_cents: 0 },
        { menu_item_id: steakId, group_name: "Temperature", name: "Medium", price_delta_cents: 0 },
        { menu_item_id: steakId, group_name: "Temperature", name: "Medium Well", price_delta_cents: 0 },
        { menu_item_id: steakId, group_name: "Temperature", name: "Well Done", price_delta_cents: 0 }
      ];
      
      // Insert all modifiers
      for (const mod of [...sauceModifiers, ...toppingModifiers, ...tempModifiers]) {
        await tx.insert(menu_modifiers).values(mod);
      }
    });
    
    console.log("Successfully added menu modifiers");
  } catch (error) {
    console.error("Error adding modifiers:", error);
  }
  
  process.exit(0);
}

addMenuModifiers().catch(error => {
  console.error("Failed to add modifiers:", error);
  process.exit(1);
});
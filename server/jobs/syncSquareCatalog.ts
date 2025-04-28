
import { log } from "../vite";
import { storage } from "../storage";
import { sq } from "../routes";
import { eq } from "drizzle-orm";
import { menu_items } from "../../shared/schema";
import { db } from "../db";

async function syncCatalog() {
  try {
    log("Starting Square catalog sync...");
    
    // Get catalog from Square
    const response = await sq.catalog.listCatalog(undefined, "ITEM");
    
    if (!response.result.objects) {
      log("No catalog items found in Square");
      return;
    }
    
    const catalogItems = response.result.objects;
    log(`Found ${catalogItems.length} items in Square catalog`);
    
    // Process each catalog item
    for (const item of catalogItems) {
      if (!item.itemData) continue;
      
      const name = item.itemData.name;
      if (!name) continue;
      
      // Find variations with price data
      const variations = item.itemData.variations;
      if (!variations || variations.length === 0) continue;
      
      // Use the first variation's price
      const variation = variations[0];
      if (!variation.itemVariationData || !variation.itemVariationData.priceMoney) continue;
      
      const price = variation.itemVariationData.priceMoney.amount || 0;
      
      // Determine category based on item data
      let category = 'Other';
      if (item.itemData.categoryId) {
        // Get category name if available
        // In a real scenario, you'd fetch categories too and map IDs to names
        category = item.itemData.categoryId;
      }
      
      // Check if menu item already exists
      const existingItem = await db.select().from(menu_items).where(eq(menu_items.name, name)).limit(1);
      
      if (existingItem.length > 0) {
        // Update existing item
        await db.update(menu_items)
          .set({ 
            price_cents: price,
            category: category,
            description: item.itemData.description || '',
            image_url: item.itemData.imageUrl || '',
            active: true
          })
          .where(eq(menu_items.name, name));
        
        log(`Updated menu item: ${name}`);
      } else {
        // Create new item
        await storage.createMenuItem({
          name: name,
          price_cents: price,
          category: category,
          description: item.itemData.description || '',
          image_url: item.itemData.imageUrl || '',
          station: determineStation(category),
          active: true
        });
        
        log(`Created new menu item: ${name}`);
      }
    }
    
    log("Square catalog sync completed successfully");
  } catch (error) {
    log(`Error syncing catalog: ${error instanceof Error ? error.message : String(error)}`, 'error');
  }
}

// Helper function to determine station based on category
function determineStation(category: string): 'Kitchen' | 'Bar' {
  const barCategories = ['Drinks', 'Cocktails', 'Beer', 'Wine', 'Spirits'];
  return barCategories.some(c => category.includes(c)) ? 'Bar' : 'Kitchen';
}

// Execute the sync
syncCatalog().catch(error => {
  log(`Fatal error in catalog sync: ${error instanceof Error ? error.message : String(error)}`, 'error');
  process.exit(1);
});

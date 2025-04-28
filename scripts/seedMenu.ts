import { parse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db';
import { menu_items } from '../shared/schema';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cook times in seconds by category
const COOK_SECONDS_BY_CATEGORY = {
  'Shareables': 420,
  'Burgers': 600,
  'Pizzas': 720,
  'Handhelds': 480,
  'Entrees': 900,
  'Salads': 180,
  'Soups': 180,
  'Sides': 120,
  'Kids': 420,
  'Desserts': 180,
  // Default values for other categories
  'Breakfast': 480,
  'Mains': 600,
  'Starters': 420,
  'Beverages': 60,
  'default': 300
};

// Interface for CSV row
interface MenuCSVRow {
  id: string; // Square ID
  name: string;
  price: string; // Will need to be parsed to cents
  category: string;
}

function getCookTimeByCategory(category: string): number {
  // Check for partial matches (e.g., "Salad" should match "Salads")
  const normalizedCategory = category.toLowerCase();
  
  for (const [key, value] of Object.entries(COOK_SECONDS_BY_CATEGORY)) {
    if (normalizedCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedCategory)) {
      return value;
    }
  }
  
  return COOK_SECONDS_BY_CATEGORY.default;
}

function getStationByCategory(category: string): string {
  // Drinks/Beverages go to Bar, everything else to Kitchen
  return category.toLowerCase().includes('beverage') || 
         category.toLowerCase().includes('drink') ? 
         'Bar' : 'Kitchen';
}

async function main() {
  console.log('Starting menu seed...');
  
  const csvFilePath = path.join(__dirname, 'creole_tavern_full_menu_square.csv');
  
  // Check if CSV file exists
  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }
  
  // Read and parse CSV file
  const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
  
  // Parse CSV
  const parser = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  const records: MenuCSVRow[] = [];
  
  for await (const record of parser) {
    records.push(record);
  }
  
  console.log(`Found ${records.length} menu items in CSV`);
  
  // Transform records to menu items format
  const menuItems = records.map(record => ({
    square_id: record.id,
    name: record.name,
    // Convert price to cents (assuming format like $10.99)
    price_cents: parseInt((parseFloat(record.price.replace('$', '')) * 100).toFixed(0)),
    category: record.category,
    cook_seconds: getCookTimeByCategory(record.category),
    station: getStationByCategory(record.category),
    active: true
  }));
  
  // Insert to database
  try {
    // Clear existing menu items first
    await db.delete(menu_items);
    console.log('Cleared existing menu items');
    
    // Insert new menu items
    const result = await db.insert(menu_items).values(menuItems);
    console.log(`Successfully inserted ${menuItems.length} menu items`);
    
    console.log('Menu seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    // Exit without trying to close the pool explicitly
    // The pool is managed by the @neondatabase/serverless driver
    process.exit(0);
  });

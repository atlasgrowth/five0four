import fs from "fs";
import { db } from "../server/db";
import { menu_items } from "../shared/schema";
import crypto from "crypto";
import { eq, sql } from "drizzle-orm";

async function seed() {
  // Hardcoded menu items with prep times from the provided CSV
  const menuItems = [
    { name: "Boudin Balls", description: "Crispy Louisiana boudin balls with Creole-mustard aioli & sticky Crystal glaze", category: "Shareables", price_cents: 1250, cook_seconds: 420 },
    { name: "504 Wings", description: "Crispy sauced wings—Buffalo / BBQ / Garlic-Parmesan—with ranch or blue cheese", category: "Shareables", price_cents: 1400, cook_seconds: 720 },
    { name: "Cajun Crawfish Pies", description: "Mini pies stuffed with crawfish étouffée & Creole sauce", category: "Shareables", price_cents: 1300, cook_seconds: 480 },
    { name: "Smoked Tuna Dip with Cajun Fried Crackers", description: "House-smoked Gulf tuna dip with fried crackers & sweet pickles", category: "Shareables", price_cents: 1500, cook_seconds: 420 },
    { name: "Pineapple Fried Shrimp with Sriracha Sesame Salad", description: "Sweet-hot fried shrimp over sesame salad", category: "Shareables", price_cents: 1400, cook_seconds: 480 },
    { name: "Clubhouse Nachos", description: "House chips with pepper-jack queso, black beans, salsa, jalapeños & sour-cream", category: "Shareables", price_cents: 1550, cook_seconds: 540 },
    { name: "Chips & Salsa", description: "Fresh-fried chips with house salsa", category: "Shareables", price_cents: 600, cook_seconds: 240 },
    { name: "Bowl of Queso", description: "Pepper-jack queso with pico", category: "Shareables", price_cents: 800, cook_seconds: 240 },
    { name: "Chips & Queso", description: "Fresh chips served with pepper-jack queso", category: "Shareables", price_cents: 950, cook_seconds: 300 },
    { name: "The Hangover", description: "8-oz smashburger with white cheddar, bacon & fried egg", category: "Burgers", price_cents: 1800, cook_seconds: 780 },
    { name: "The Classic Ride", description: "Seasoned patty with choice of cheese, grilled onions & LTO", category: "Burgers", price_cents: 1700, cook_seconds: 660 },
    { name: "Electric Blue", description: "Burger with bacon jam, blue cheese & applewood bacon", category: "Burgers", price_cents: 1850, cook_seconds: 780 },
    { name: "Impossible Burger", description: "Plant-based patty with veggie cheddar & vegan aioli", category: "Burgers", price_cents: 1700, cook_seconds: 660 },
    { name: "504 12-inch Pizza", description: "Cheese / pepperoni / sausage on a 12-inch crispy crust", category: "Pizzas & Flatbreads", price_cents: 1700, cook_seconds: 720 },
    { name: "Cheesy Garlic Bread", description: "Grilled flatbread with garlic butter & cheese blend", category: "Pizzas & Flatbreads", price_cents: 1250, cook_seconds: 480 },
    { name: "Crazy Cajun Flatbread", description: "Crawfish, andouille, peppers & Cajun cream sauce", category: "Pizzas & Flatbreads", price_cents: 2250, cook_seconds: 660 },
    { name: "Barbecue Chicken Pizza", description: "Grilled chicken, bacon, red onion & tangy BBQ sauce", category: "Pizzas & Flatbreads", price_cents: 2100, cook_seconds: 720 },
    { name: "Street Party Tacos 'Al Pastor'", description: "3 flour tortillas, achiote pork, pineapple salsa", category: "Handhelds", price_cents: 1600, cook_seconds: 600 },
    { name: "Crispy Fried Chicken Tenders", description: "Hand-breaded tenders with fries & honey-mustard", category: "Handhelds", price_cents: 1600, cook_seconds: 660 },
    { name: "Steak Frites", description: "12-oz strip, herb butter, fries, béarnaise aioli", category: "Entrees", price_cents: 3800, cook_seconds: 900 },
    { name: "Filet Mignon Frites", description: "8-oz filet upgrade to steak frites", category: "Entrees", price_cents: 4600, cook_seconds: 960 },
    { name: "Shrimp Monique", description: "Bronzed Gulf shrimp, cajun alfredo pasta, vegetables, toast", category: "Entrees", price_cents: 2400, cook_seconds: 720 },
    { name: "Gulf Catch Creole", description: "Fresh fish, Creole sauce, jasmine rice, vegetables", category: "Entrees", price_cents: 2650, cook_seconds: 840 },
    { name: "Golden Fried Seafood Platter", description: "Shrimp, catch of day, fries, slaw, hushpuppies", category: "Entrees", price_cents: 2300, cook_seconds: 780 },
    { name: "Make It a Double Seafood Platter", description: "Twice the seafood for twice the fun", category: "Entrees", price_cents: 4600, cook_seconds: 840 },
    { name: "Sand Wedge Salad", description: "Bacon, tomato, blue cheese, red onion, iceberg", category: "Salads", price_cents: 1300, cook_seconds: 300 },
    { name: "Classic Caesar Salad", description: "Romaine, parmesan, house-made dressing & croutons", category: "Salads", price_cents: 1200, cook_seconds: 300 },
    { name: "Strawberries & Goat Cheese Salad", description: "Mixed greens, candied pecans, strawberry-balsamic", category: "Salads", price_cents: 1400, cook_seconds: 360 },
    { name: "Gumbo (Cup)", description: "New Orleans-style gumbo with andouille, chicken & rice", category: "Soups", price_cents: 800, cook_seconds: 240 },
    { name: "Gumbo (Bowl)", description: "New Orleans-style gumbo with andouille, chicken & rice", category: "Soups", price_cents: 1200, cook_seconds: 240 },
    { name: "Garlic Grilled Vegetables", description: "Seasonal vegetables tossed with garlic oil", category: "Sides", price_cents: 700, cook_seconds: 420 },
    { name: "Crispy Kettle Fries", description: "House-seasoned kettle chips", category: "Sides", price_cents: 600, cook_seconds: 300 },
    { name: "House Green Salad", description: "Mixed greens, cucumber, tomato, choice of dressing", category: "Sides", price_cents: 800, cook_seconds: 300 },
    { name: "The Big Kid Burger", description: "Kid-sized burger with fries", category: "Kids", price_cents: 1200, cook_seconds: 480 },
    { name: "Kids Fried Chicken Tenders", description: "Hand-breaded tenders with fries", category: "Kids", price_cents: 1200, cook_seconds: 480 },
    { name: "Very Berry Cheesecake", description: "New York-style with berry compote", category: "Desserts", price_cents: 900, cook_seconds: 300 },
    { name: "Pecan Chocolate Chip Bread Pudding", description: "House-made bread pudding with rum sauce", category: "Desserts", price_cents: 1200, cook_seconds: 360 },
    { name: "On the Green Pie", description: "Fried hand-pie with seasonal filling", category: "Desserts", price_cents: 800, cook_seconds: 300 },
  ];

  // Get names for later comparison
  const namesLC = menuItems.map(item => item.name.toLowerCase());

  await db.transaction(async tx => {
    // Clear existing menu items
    await tx.delete(menu_items);
    
    // Insert new menu items with proper prep times
    for (const item of menuItems) {
      await tx.insert(menu_items).values({
        square_id: crypto.randomUUID(),
        name: item.name,
        description: item.description,
        category: item.category,
        price_cents: item.price_cents,
        station: item.category === "Drinks" ? "Bar" : "Kitchen",
        cook_seconds: item.cook_seconds,
        active: true
      });
    }
  });
  
  console.log(`Seeded ${menuItems.length} menu items with prep times`);
  process.exit(0);
}

seed().catch(err => {
  console.error("Error seeding menu:", err);
  process.exit(1);
});
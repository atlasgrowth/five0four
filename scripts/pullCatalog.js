
// scripts/pullCatalog.js
import fs from "fs";

const token = process.env.SQUARE_SANDBOX_TOKEN;
const ver = "2025-04-16";

if (!token) {
  console.error("Error: SQUARE_SANDBOX_TOKEN not set");
  process.exit(1);
}

async function fetchCatalog() {
  try {
    const res = await fetch(
      "https://connect.squareupsandbox.com/v2/catalog/list?types=ITEM,ITEM_VARIATION,CATEGORY",
      { 
        headers: { 
          "Square-Version": ver, 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        } 
      }
    );
    
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    
    const json = await res.json();
    
    if (!json.objects) {
      console.warn("Warning: No catalog objects returned from Square API");
      json.objects = []; // Ensure objects property exists even if empty
    }
    
    fs.writeFileSync("sandbox_catalog.json", JSON.stringify(json, null, 2));
    console.log("Wrote", json.objects.length, "objects to sandbox_catalog.json");
  } catch (error) {
    console.error("Error fetching catalog:", error);
    process.exit(1);
  }
}

fetchCatalog();

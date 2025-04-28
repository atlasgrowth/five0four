// scripts/pullCatalog.js
import fs from "fs";
const token = process.env.SQUARE_SANDBOX_TOKEN;
const ver   = "2025-04-16";

const res = await fetch(
  "https://connect.squareupsandbox.com/v2/catalog/list?types=ITEM,ITEM_VARIATION,CATEGORY",
  { headers:{ "Square-Version":ver, Authorization:`Bearer ${token}` } }
);
const json = await res.json();
fs.writeFileSync("sandbox_catalog.json", JSON.stringify(json, null, 2));
console.log("Wrote", json.objects?.length, "objects to sandbox_catalog.json");


// scripts/squareCatalogReset.js
import { randomUUID } from "node:crypto";

// --- CONFIG ---
const token = process.env.SQUARE_SANDBOX_TOKEN;
const ver   = "2025-04-16";
if (!token) throw new Error("SQUARE_SANDBOX_TOKEN not set");

// --- 1) List existing catalog objects ---
async function resetCatalog() {
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
  console.log("Found", existingIds.length, "existing objects");

  // --- 2) Batch-delete them if any ---
  if (existingIds.length) {
    const batchRes = await fetch(
      "https://connect.squareupsandbox.com/v2/catalog/batch-delete",
      {
        method: "POST",
        headers: {
          "Square-Version": ver,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ object_ids: existingIds }),
      }
    );
    const batchJson = await batchRes.json();
    console.log("Deleted", existingIds.length, "objects:", batchJson);
  }
}

resetCatalog().catch(console.error);

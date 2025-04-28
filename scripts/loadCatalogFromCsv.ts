// scripts/loadCatalogFromCsv.ts

import fs from "fs";
import { parse } from "csv-parse/sync";
import crypto from "crypto";
import { SquareClient, SquareEnvironment } from "square";

// 1. Path to your real CSV
const csvPath = "scripts/menu_creole_tavern.csv";

// 2. Initialize Square client correctly
const sq = new SquareClient({
  environment: SquareEnvironment.Sandbox,
  accessToken: process.env.SQUARE_SANDBOX_TOKEN!,
});
const catalogApi = sq.catalogApi;

// 3. Read & parse CSV
const csv = fs.readFileSync(csvPath, "utf8");
const rows = parse(csv, { columns: true, skip_empty_lines: true });

// 4. Build ITEM + ITEM_VARIATION objects
const objects = rows.flatMap((r: any) => {
  const itemId = `#${crypto.randomUUID()}`;
  return [
    { id: itemId, type: "ITEM", itemData: { name: r.Name, description: r.Description } },
    {
      id: `#${crypto.randomUUID()}`,
      type: "ITEM_VARIATION",
      itemVariationData: {
        itemId,
        name: r["Variation Name"] || "Regular",
        priceMoney: { amount: Math.round(parseFloat(r.Price) * 100), currency: "USD" },
      },
    },
  ];
});

// 5. Upsert to Square
(async () => {
  const { result } = await catalogApi.batchUpsertCatalogObjects({
    idempotencyKey: crypto.randomUUID(),
    batches: [{ objects }],
  });
  console.log("Upserted", result.objects?.length, "objects to Square Sandbox");
})();

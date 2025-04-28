// server/routes/menu.ts
import { Router } from "express";
import { db } from "../db";
import { menu_items } from "../../shared/schema";
import { asc, eq } from "drizzle-orm";

export const menuRouter = Router();

menuRouter.get("/api/menu", async (_req, res) => {
  const rows = await db
    .select()
    .from(menu_items)
    .where(eq(menu_items.active, true))
    .orderBy(asc(menu_items.category), asc(menu_items.name));
  res.json(rows);
});
// shared/schema.ts
import { pgTable, text, integer, boolean, serial } from "drizzle-orm/pg-core";

export const menu_items = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  square_id: text("square_id").unique().notNull(),
  name: text("name").notNull(),
  price_cents: integer("price_cents").notNull(),
  category: text("category").notNull(),
  station: text("station").notNull(),
  cook_seconds: integer("cook_seconds").notNull(),
  active: boolean("active").default(true),
});

import { pgTable, text, serial, integer, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const menu_items = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  square_id: text("square_id").unique().notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price_cents: integer("price_cents").notNull(),
  cook_seconds: integer("cook_seconds").notNull(),
  station: text("station").default("Kitchen"),
  active: boolean("active").default(true)
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  floor: integer("floor").notNull(),
  bay: integer("bay").notNull(),
  status: text("status").default("OPEN"),
  square_order_id: text("square_order_id")
});

export const order_items = pgTable("order_items", {
  order_id: uuid("order_id").references(() => orders.id),
  menu_item_id: integer("menu_item_id").references(() => menu_items.id),
  qty: integer("qty").notNull()
});

// Schema validation
export const menuItemSchema = createInsertSchema(menu_items).omit({ id: true });
export const orderSchema = createInsertSchema(orders).omit({ id: true, square_order_id: true });
export const orderItemSchema = createInsertSchema(order_items);

// Types
export type MenuItem = typeof menu_items.$inferSelect;
export type InsertMenuItem = z.infer<typeof menuItemSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof orderSchema>;
export type OrderItem = typeof order_items.$inferSelect;
export type InsertOrderItem = z.infer<typeof orderItemSchema>;

// shared/schema.ts
import { pgTable, text, integer, boolean, serial, uuid, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const menu_items = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  square_id: text("square_id").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price_cents: integer("price_cents").notNull(),
  category: text("category").notNull(),
  station: text("station").notNull(),
  cook_seconds: integer("cook_seconds").notNull(),
  active: boolean("active").default(true),
});

export const menu_modifiers = pgTable("menu_modifiers", {
  id: serial("id").primaryKey(),
  menu_item_id: integer("menu_item_id").references(() => menu_items.id).notNull(),
  group_name: text("group_name").notNull(),
  name: text("name").notNull(),
  price_delta_cents: integer("price_delta_cents").default(0),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  floor: integer("floor").notNull(),
  bay: integer("bay").notNull(),
  status: text("status").default("NEW"),
  square_order_id: text("square_order_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  timer_end: timestamp("timer_end"),
});

export const order_items = pgTable("order_items", {
  order_id: uuid("order_id").references(() => orders.id),
  menu_item_id: integer("menu_item_id").references(() => menu_items.id),
  qty: integer("qty").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.order_id, t.menu_item_id] }),
}));

export const order_modifiers = pgTable("order_modifiers", {
  id: serial("id").primaryKey(),
  order_id: uuid("order_id").references(() => orders.id).notNull(),
  menu_item_id: integer("menu_item_id").references(() => menu_items.id).notNull(),
  modifier_id: integer("modifier_id").references(() => menu_modifiers.id).notNull(),
});

// Schema validation
export const menuItemSchema = createInsertSchema(menu_items).omit({ id: true });
export const menuModifierSchema = createInsertSchema(menu_modifiers).omit({ id: true });
export const orderSchema = createInsertSchema(orders).omit({ id: true, square_order_id: true, created_at: true, timer_end: true });
export const orderItemSchema = createInsertSchema(order_items);
export const orderModifierSchema = createInsertSchema(order_modifiers).omit({ id: true });

// Types
export type MenuItem = typeof menu_items.$inferSelect;
export type InsertMenuItem = z.infer<typeof menuItemSchema>;
export type MenuModifier = typeof menu_modifiers.$inferSelect;
export type InsertMenuModifier = z.infer<typeof menuModifierSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof orderSchema>;
export type OrderItem = typeof order_items.$inferSelect;
export type OrderModifier = typeof order_modifiers.$inferSelect;
export type InsertOrderModifier = z.infer<typeof orderModifierSchema>;

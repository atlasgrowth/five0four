import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "./db";
import { menu_items, orders, order_items, type MenuItem, type InsertMenuItem, type Order, type InsertOrder, type OrderItem } from "@shared/schema";

export interface IStorage {
  // Menu operations
  getActiveMenuItems(): Promise<MenuItem[]>;
  getMenuItemById(id: number): Promise<MenuItem | undefined>;
  
  // Order operations
  createOrder(order: InsertOrder, items: { id: number; qty: number }[]): Promise<Order>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrdersByFloor(floor: number): Promise<(Order & { items: (OrderItem & MenuItem & { total_cook_seconds: number })[] })[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderSquareId(id: string, squareOrderId: string): Promise<Order | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Menu operations
  async getActiveMenuItems(): Promise<MenuItem[]> {
    return db.select().from(menu_items).where(eq(menu_items.active, true));
  }

  async getMenuItemById(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menu_items).where(eq(menu_items.id, id));
    return item;
  }

  // Order operations
  async createOrder(orderData: InsertOrder, orderItems: { id: number; qty: number }[]): Promise<Order> {
    // Start a transaction to create both order and order_items
    return db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values(orderData).returning();

      // Insert order items
      if (orderItems.length > 0) {
        await tx.insert(order_items).values(
          orderItems.map(item => ({
            order_id: order.id,
            menu_item_id: item.id,
            qty: item.qty
          }))
        );
      }

      return order;
    });
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByFloor(floor: number): Promise<(Order & { items: (OrderItem & MenuItem & { total_cook_seconds: number })[] })[]> {
    // Get orders for a specific floor
    const result = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.floor, floor),
        eq(orders.status, "PAID")
      ))
      .orderBy(desc(orders.id));

    // For each order, get the order items and menu item details
    const ordersWithItems = await Promise.all(
      result.map(async (order) => {
        const items = await db
          .select({
            ...order_items,
            ...menu_items,
            total_cook_seconds: sql`${menu_items.cook_seconds} * ${order_items.qty}`.as('total_cook_seconds')
          })
          .from(order_items)
          .innerJoin(menu_items, eq(order_items.menu_item_id, menu_items.id))
          .where(eq(order_items.order_id, order.id));

        return {
          ...order,
          items
        };
      })
    );

    return ordersWithItems;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async updateOrderSquareId(id: string, squareOrderId: string): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ square_order_id: squareOrderId })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }
}

export const storage = new DatabaseStorage();

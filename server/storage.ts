import { eq, and, sql, desc, ne, asc } from "drizzle-orm";
import { db } from "./db";
import { 
  menu_items, 
  orders, 
  order_items, 
  menu_modifiers,
  order_modifiers,
  type MenuItem, 
  type MenuModifier,
  type Order, 
  type InsertOrder, 
  type OrderItem 
} from "@shared/schema";

// Constants for kitchen order timing
export const PREP_BUFFER = 120; // 2 minutes of prep time
export const EXPO_BUFFER = 180; // 3 minutes for expo

// Type for order items with total cook time and modifiers
export type OrderItemWithDetails = OrderItem & MenuItem & { 
  total_cook_seconds: number;
  modifiers?: MenuModifier[];
};

export interface IStorage {
  // Menu operations
  getActiveMenuItems(): Promise<MenuItem[]>;
  getMenuItemById(id: number): Promise<MenuItem | undefined>;
  getModifiersForMenuItem(menuItemId: number): Promise<MenuModifier[]>;
  
  // Order operations
  createOrder(
    order: InsertOrder, 
    items: { id: number; qty: number; modifiers?: number[] }[]
  ): Promise<Order>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrderWithDetails(id: string): Promise<(Order & { items: OrderItemWithDetails[] }) | undefined>;
  getOrdersByFloor(floor: number): Promise<(Order & { items: OrderItemWithDetails[] })[]>;
  getActiveOrders(): Promise<(Order & { items: OrderItemWithDetails[] })[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderSquareId(id: string, squareOrderId: string): Promise<Order | undefined>;
  updateOrderTimerEnd(id: string, timerEnd: Date): Promise<Order | undefined>;
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
  
  async getModifiersForMenuItem(menuItemId: number): Promise<MenuModifier[]> {
    return db
      .select()
      .from(menu_modifiers)
      .where(eq(menu_modifiers.menu_item_id, menuItemId))
      .orderBy(menu_modifiers.group_name, menu_modifiers.name);
  }

  // Order operations
  async createOrder(
    orderData: InsertOrder, 
    orderItems: { id: number; qty: number; modifiers?: number[] }[]
  ): Promise<Order> {
    // Start a transaction to create both order and order_items
    return db.transaction(async (tx) => {
      // Find the max cook time among items for timer calculation
      let maxCookSeconds = 0;
      for (const item of orderItems) {
        const menuItem = await this.getMenuItemById(item.id);
        if (menuItem && menuItem.cook_seconds > maxCookSeconds) {
          maxCookSeconds = menuItem.cook_seconds;
        }
      }
      
      // Calculate timer_end (now + maxCookSeconds + PREP_BUFFER + EXPO_BUFFER)
      const now = new Date();
      const timerEnd = new Date(now.getTime() + (maxCookSeconds + PREP_BUFFER + EXPO_BUFFER) * 1000);
      
      // Insert the order with timer_end
      const [order] = await tx.insert(orders).values({
        ...orderData,
        status: "NEW", // Always start as NEW
        timer_end: timerEnd
      }).returning();

      // Insert order items
      if (orderItems.length > 0) {
        await tx.insert(order_items).values(
          orderItems.map(item => ({
            order_id: order.id,
            menu_item_id: item.id,
            qty: item.qty
          }))
        );
        
        // Insert any modifiers for each order item
        for (const item of orderItems) {
          if (item.modifiers && item.modifiers.length > 0) {
            await tx.insert(order_modifiers).values(
              item.modifiers.map(modifierId => ({
                order_id: order.id,
                menu_item_id: item.id,
                modifier_id: modifierId
              }))
            );
          }
        }
      }

      return order;
    });
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }
  
  async getOrderWithDetails(id: string): Promise<(Order & { items: OrderItemWithDetails[] }) | undefined> {
    const order = await this.getOrderById(id);
    if (!order) return undefined;
    
    const items = await db
      .select({
        ...order_items,
        ...menu_items,
        total_cook_seconds: sql`${menu_items.cook_seconds} * ${order_items.qty}`.as('total_cook_seconds')
      })
      .from(order_items)
      .innerJoin(menu_items, eq(order_items.menu_item_id, menu_items.id))
      .where(eq(order_items.order_id, id));
    
    // Get modifiers for each item
    const itemsWithModifiers = await Promise.all(
      items.map(async (item) => {
        const modifierRows = await db
          .select({
            ...menu_modifiers
          })
          .from(order_modifiers)
          .innerJoin(
            menu_modifiers,
            eq(order_modifiers.modifier_id, menu_modifiers.id)
          )
          .where(
            and(
              eq(order_modifiers.order_id, id),
              eq(order_modifiers.menu_item_id, item.menu_item_id)
            )
          );
        
        return {
          ...item,
          modifiers: modifierRows,
        };
      })
    );
    
    return {
      ...order,
      items: itemsWithModifiers,
    };
  }

  async getOrdersByFloor(floor: number): Promise<(Order & { items: OrderItemWithDetails[] })[]> {
    // Get orders for a specific floor
    const result = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.floor, floor),
        ne(orders.status, "PICKED_UP"),
        ne(orders.status, "CANCELLED")
      ))
      .orderBy(desc(orders.id));

    return this.populateOrderItems(result);
  }
  
  async getActiveOrders(): Promise<(Order & { items: OrderItemWithDetails[] })[]> {
    const results = await db
      .select()
      .from(orders)
      .where(
        and(
          ne(orders.status, "PICKED_UP"),
          ne(orders.status, "CANCELLED")
        )
      )
      .orderBy(
        asc(orders.status),
        desc(orders.id)
      );
    
    return this.populateOrderItems(results);
  }
  
  private async populateOrderItems(ordersList: Order[]): Promise<(Order & { items: OrderItemWithDetails[] })[]> {
    // For each order, get the order items and menu item details
    const ordersWithItems = await Promise.all(
      ordersList.map(async (order) => {
        const items = await db
          .select({
            ...order_items,
            ...menu_items,
            total_cook_seconds: sql`${menu_items.cook_seconds} * ${order_items.qty}`.as('total_cook_seconds')
          })
          .from(order_items)
          .innerJoin(menu_items, eq(order_items.menu_item_id, menu_items.id))
          .where(eq(order_items.order_id, order.id));
        
        // Get modifiers for each item
        const itemsWithModifiers = await Promise.all(
          items.map(async (item) => {
            const modifierRows = await db
              .select({
                ...menu_modifiers
              })
              .from(order_modifiers)
              .innerJoin(
                menu_modifiers,
                eq(order_modifiers.modifier_id, menu_modifiers.id)
              )
              .where(
                and(
                  eq(order_modifiers.order_id, order.id),
                  eq(order_modifiers.menu_item_id, item.menu_item_id)
                )
              );
            
            return {
              ...item,
              modifiers: modifierRows,
            };
          })
        );

        return {
          ...order,
          items: itemsWithModifiers,
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
  
  async updateOrderTimerEnd(id: string, timerEnd: Date): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ timer_end: timerEnd })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }
}

export const storage = new DatabaseStorage();

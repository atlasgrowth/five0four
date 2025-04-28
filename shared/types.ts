import { z } from 'zod';
import { MenuItem, Order, OrderItem } from './schema';

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Menu by category
export interface MenuByCategory {
  [category: string]: MenuItem[];
}

// Cart item type
export interface CartItem {
  id: number;
  name: string;
  price_cents: number;
  qty: number;
}

// Extended item type for order details
export interface OrderItemWithModifiers extends OrderItem, MenuItem {
  total_cook_seconds: number;
  modifiers?: MenuModifier[];  
}

// Order with items
export interface OrderWithItems extends Order {
  items: OrderItemWithModifiers[];
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'init-orders' | 'new-ticket' | 'status-update' | 'picked-up';
  data: {
    orders?: OrderWithItems[];
    [key: string]: any;
  };
}

// Create order payload schema
export const createOrderSchema = z.object({
  floor: z.number().int().min(1).max(3),
  bay: z.number().int().min(1).max(25),
  items: z.array(z.object({
    id: z.number().int().positive(),
    qty: z.number().int().positive()
  }))
});

export type CreateOrderPayload = z.infer<typeof createOrderSchema>;

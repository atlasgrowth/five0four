import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { SquareClient } from "square";
import { log } from "./vite";
import { setupWebSocketServer, broadcastToRoom, WSMessage } from "./wsHub";
import { createOrderSchema } from "@shared/types";

// Square client setup
export const sq = new SquareClient({
  token: process.env.SQUARE_SANDBOX_TOKEN || '',
  environment: process.env.SQUARE_ENV === 'production' 
    ? 'production'
    : 'sandbox'
});

// Square API clients
export const catalogApi = sq.catalog;

// Mock Square Orders API for development/testing
function createMockOrdersApi() {
  return {
    createOrder: async ({ order }: any) => ({ 
      result: { order: { id: `MOCK_${Date.now()}` } } 
    })
  };
}

// Use real Square API if token is available, otherwise use mock
export const ordersApi = process.env.SQUARE_SANDBOX_TOKEN
  ? sq.orders
  : createMockOrdersApi();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket server
  setupWebSocketServer(httpServer);

  // API Routes
  // Get menu items grouped by category
  app.get('/api/menu', async (_req: Request, res: Response) => {
    try {
      const menuItems = await storage.getActiveMenuItems();
      
      // Group by category
      const menuByCategory = menuItems.reduce((acc: {[key: string]: any[]}, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {});
      
      res.json({ 
        success: true, 
        data: menuByCategory
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });
  
  // Get modifiers for a menu item
  app.get('/api/menu/:id/modifiers', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const menuItemId = parseInt(id, 10);
      
      if (isNaN(menuItemId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid menu item ID' 
        });
      }
      
      const modifiers = await storage.getModifiersForMenuItem(menuItemId);
      
      // Group modifiers by group_name
      const modifiersByGroup = modifiers.reduce((acc: {[key: string]: any[]}, mod) => {
        if (!acc[mod.group_name]) {
          acc[mod.group_name] = [];
        }
        acc[mod.group_name].push(mod);
        return acc;
      }, {});
      
      res.json({ 
        success: true, 
        data: modifiersByGroup 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Create new order
  app.post('/api/orders', async (req: Request, res: Response) => {
    try {
      // Parse and validate the order data
      const { floor, bay, items } = createOrderSchema.parse(req.body);
      
      // Check if items exist
      if (items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Order must have at least one item'
        });
      }

      // Create order in database
      const order = await storage.createOrder(
        { floor, bay },
        items
      );
      
      // Get the full order details with items
      const orderWithDetails = await storage.getOrderWithDetails(order.id);
      
      if (!orderWithDetails) {
        return res.status(500).json({
          success: false,
          error: 'Failed to retrieve order details'
        });
      }
      
      // Broadcast new ticket to kitchen
      broadcastToRoom('kitchen', {
        type: 'new-ticket',
        data: orderWithDetails
      } as WSMessage);

      // Create order in Square (stubbed if no token)
      try {
        // Prepare line items for the order
        const lineItems = await Promise.all(items.map(async (item) => {
          const menuItem = await storage.getMenuItemById(item.id);
          return {
            name: menuItem?.name || `Item #${item.id}`,
            quantity: `${item.qty}`,
            basePriceMoney: {
              amount: menuItem?.price_cents || 0,
              currency: 'USD'
            }
          };
        }));
        
        // Create order in Square
        const squareResponse = await (ordersApi as any).createOrder({
          order: {
            locationId: process.env.SQUARE_SANDBOX_LOCATION || '',
            lineItems
          }
        });

        // Handle both response formats (mock and real Square API)
        const squareOrderId = 'result' in squareResponse 
          ? squareResponse.result.order?.id 
          : squareResponse?.order?.id;
        if (squareOrderId) {
          await storage.updateOrderSquareId(order.id, squareOrderId);
        }
      } catch (squareError: any) {
        // Log Square error but continue with order creation
        log(`Square API error: ${squareError.message}`, 'error');
      }

      res.status(201).json({
        success: true,
        data: order
      });
    } catch (error: any) {
      res.status(error.status === 400 ? 400 : 500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Square webhook endpoint for payment updates
  app.post('/square/webhook', async (req: Request, res: Response) => {
    // In production, verify the Square signature header
    // const signature = req.headers['x-square-signature'];
    // if (!signature || !verifySquareSignature(signature, req.body)) {
    //   return res.status(401).json({ success: false, error: 'Invalid signature' });
    // }

    try {
      // Process webhook
      const event = req.body;
      
      if (event.type === 'payment.created') {
        const orderId = event.data?.object?.payment?.order_id;
        if (orderId) {
          // Find order with this Square order ID and update status to COOKING
          const order = await storage.updateOrderStatus(orderId, 'COOKING');
          
          if (order) {
            // Get full order details
            const orderWithDetails = await storage.getOrderWithDetails(order.id);
            
            if (orderWithDetails) {
              // Broadcast status update to kitchen and expo
              broadcastToRoom('kitchen', {
                type: 'status-update',
                data: orderWithDetails
              } as WSMessage);
              
              broadcastToRoom('expo', {
                type: 'status-update',
                data: orderWithDetails
              } as WSMessage);
            }
          }
        }
      }
      
      res.json({ success: true });
    } catch (error: any) {
      log(`Webhook error: ${error.message}`, 'error');
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update order status route (for kitchen display system)
  app.patch('/api/orders/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!id || !status) {
        return res.status(400).json({
          success: false,
          error: 'Missing order ID or status'
        });
      }
      
      // Validate status transitions
      const validStatuses = ['NEW', 'COOKING', 'PLATING', 'READY', 'PICKED_UP', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      
      // Update order status
      const updatedOrder = await storage.updateOrderStatus(id, status);
      
      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }
      
      // Get full order details
      const orderWithDetails = await storage.getOrderWithDetails(id);
      
      if (!orderWithDetails) {
        return res.status(404).json({
          success: false,
          error: 'Order details not found'
        });
      }
      
      // Broadcast status update based on status
      if (['NEW', 'COOKING'].includes(status)) {
        // Kitchen needs to see these statuses
        broadcastToRoom('kitchen', {
          type: 'status-update',
          data: orderWithDetails
        } as WSMessage);
      }
      
      if (['PLATING', 'READY'].includes(status)) {
        // Expo needs to see these statuses
        broadcastToRoom('expo', {
          type: 'status-update',
          data: orderWithDetails
        } as WSMessage);
      }
      
      if (status === 'PICKED_UP') {
        // All stations need to know when order is picked up
        broadcastToRoom('kitchen', {
          type: 'picked-up',
          data: orderWithDetails
        } as WSMessage);
        
        broadcastToRoom('expo', {
          type: 'picked-up',
          data: orderWithDetails
        } as WSMessage);
        
        broadcastToRoom('servers', {
          type: 'picked-up',
          data: orderWithDetails
        } as WSMessage);
      }
      
      res.json({
        success: true,
        data: updatedOrder
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  return httpServer;
}

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { storage } from "./storage";
import { SquareClient } from "square";
import { log } from "./vite";

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

// WebSocket connections by floor and station
interface FloorConnections {
  [key: string]: WebSocket[];
}
const floorConnections: FloorConnections = {};

// Send message to all connections for a specific floor
function broadcastToFloor(floor: number, data: any) {
  // Broadcast to both kitchen and bar stations for this floor
  const kitchenKey = `kitchen:${floor}`;
  const barKey = `bar:${floor}`;
  
  const message = JSON.stringify(data);
  
  // Send to kitchen connections
  if (floorConnections[kitchenKey]) {
    floorConnections[kitchenKey].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  // Send to bar connections
  if (floorConnections[barKey]) {
    floorConnections[barKey].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket server with path for both kitchen and bar
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const floor = url.searchParams.get('floor');
    const isKitchen = url.pathname.includes('/kitchen');
    const isBar = url.pathname.includes('/bar');
    
    // Invalid connection without floor or specific station
    if (!floor || (!isKitchen && !isBar)) {
      ws.close();
      return;
    }

    // Determine connection key based on station and floor
    const connectionKey = isKitchen ? `kitchen:${floor}` : `bar:${floor}`;
    
    // Add to connections map
    if (!floorConnections[connectionKey]) {
      floorConnections[connectionKey] = [];
    }
    floorConnections[connectionKey].push(ws);

    log(`WebSocket client connected to ${connectionKey}`);

    // Send initial orders for the floor, filtered by station
    storage.getOrdersByFloor(parseInt(floor, 10))
      .then(orders => {
        // For kitchen, send only items with station='Kitchen'
        // For bar, send only items with station='Bar'
        const filteredOrders = orders.map(order => {
          // Clone the order to avoid modifying the original
          const filteredOrder = { ...order };
          
          // Filter items by station
          filteredOrder.items = order.items.filter(item => 
            isKitchen ? item.station === 'Kitchen' : item.station === 'Bar'
          );
          
          return filteredOrder;
        }).filter(order => order.items.length > 0); // Only include orders with relevant items
        
        ws.send(JSON.stringify({
          type: 'init-orders',
          orders: filteredOrders
        }));
      })
      .catch(err => {
        log(`Error fetching orders for ${connectionKey}: ${err.message}`, 'error');
      });

    ws.on('close', () => {
      // Remove from connections
      if (floorConnections[connectionKey]) {
        floorConnections[connectionKey] = floorConnections[connectionKey].filter(client => client !== ws);
      }
      log(`WebSocket client disconnected from ${connectionKey}`);
    });
  });

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

  // Create new order
  app.post('/api/orders', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const orderSchema = z.object({
        floor: z.number().int().min(1).max(3),
        bay: z.number().int().min(1).max(25),
        items: z.array(z.object({
          id: z.number().int().positive(),
          qty: z.number().int().positive()
        }))
      });

      const validatedData = orderSchema.parse(req.body);
      
      // Check if items exist
      const items = validatedData.items;
      if (items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Order must have at least one item'
        });
      }

      // Create order in database
      const order = await storage.createOrder(
        { floor: validatedData.floor, bay: validatedData.bay, status: 'OPEN' },
        items
      );

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

      // Broadcast new ticket to kitchen
      broadcastToFloor(validatedData.floor, {
        type: 'new-ticket',
        order
      });

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
          // Find order with this Square order ID and update status
          const order = await storage.updateOrderStatus(orderId, 'PAID');
          
          if (order) {
            // Broadcast status update
            broadcastToFloor(order.floor, {
              type: 'order-paid',
              order
            });
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
      
      // Update order status
      const updatedOrder = await storage.updateOrderStatus(id, status);
      
      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }
      
      // Broadcast status update
      broadcastToFloor(updatedOrder.floor, {
        type: 'status-updated',
        order: updatedOrder
      });
      
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

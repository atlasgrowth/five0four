import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { log } from './vite';

// Constants for kitchen order timing
export const PREP_BUFFER = 120; // 2 minutes of prep time
export const EXPO_BUFFER = 180; // 3 minutes for expo

// Define WebSocket message types
export type WSMessageType = 
  | 'init-orders'     // Initial orders list
  | 'new-ticket'      // New order created
  | 'status-update'   // Order status changed
  | 'picked-up'       // Order picked up

// Define the message structure
export interface WSMessage {
  type: WSMessageType;
  data: any;
}

// Manage connections by room
type ConnectionsMap = {
  [room: string]: Set<WebSocket>;
};

const connections: ConnectionsMap = {
  'kitchen': new Set<WebSocket>(),
  'expo': new Set<WebSocket>(),
  'servers': new Set<WebSocket>(),
};

// Set up the WebSocket server
export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });
  
  // Handle upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const pathname = parse(request.url || '').pathname || '';
    const match = pathname.match(/^\/ws\/([a-zA-Z0-9_-]+)$/);
    
    if (!match) {
      socket.destroy();
      return;
    }
    
    const room = match[1];
    
    // Validate the room
    if (!['kitchen', 'expo', 'servers'].includes(room)) {
      socket.destroy();
      return;
    }
    
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, room);
    });
  });
  
  // Handle new connections
  wss.on('connection', (ws: WebSocket, _request: any, room: string) => {
    log(`New WebSocket connection to room: ${room}`, 'ws');
    
    // Add to the appropriate room
    if (connections[room]) {
      connections[room].add(ws);
    }
    
    // Send initial state
    sendInitialState(ws, room);
    
    // Handle disconnection
    ws.on('close', () => {
      log(`WebSocket disconnected from room: ${room}`, 'ws');
      if (connections[room]) {
        connections[room].delete(ws);
      }
    });
    
    // Handle messages from client
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        handleMessage(message, room);
      } catch (error) {
        log(`Error parsing WebSocket message: ${error}`, 'error');
      }
    });
  });
  
  log('WebSocket server initialized', 'ws');
  return wss;
}

// Send message to all clients in a specific room
export function broadcastToRoom(room: string, message: WSMessage) {
  if (connections[room]) {
    const clients = connections[room];
    const messageStr = JSON.stringify(message);
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
    
    log(`Broadcast message type=${message.type} to ${clients.size} clients in room: ${room}`, 'ws');
  }
}

// Send message to all clients in all rooms
export function broadcastToAll(message: WSMessage) {
  Object.keys(connections).forEach((room) => {
    broadcastToRoom(room, message);
  });
}

// Handle incoming messages
function handleMessage(message: WSMessage, sourceRoom: string) {
  switch (message.type) {
    case 'status-update':
      // Broadcast status updates to kitchen and expo
      broadcastToRoom('kitchen', message);
      broadcastToRoom('expo', message);
      break;
      
    case 'picked-up':
      // Broadcast picked-up events to all
      broadcastToAll(message);
      break;
      
    default:
      log(`Received message of type ${message.type} from ${sourceRoom}`, 'ws');
  }
}

// Send initial state to new connections
async function sendInitialState(ws: WebSocket, room: string) {
  try {
    // Import here to avoid circular dependency
    const { storage } = await import('./storage');
    
    if (room === 'kitchen' || room === 'expo') {
      // Get active orders for kitchen/expo views
      // Filter orders based on room (kitchen gets NEW or COOKING, expo gets PLATING or READY)
      const orders = await storage.getActiveOrders();
      
      // Filter based on room
      const filteredOrders = room === 'kitchen' 
        ? orders.filter(o => o.status && ['NEW', 'COOKING'].includes(o.status))
        : orders.filter(o => o.status && ['PLATING', 'READY'].includes(o.status));
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'init-orders',
          data: { orders: filteredOrders }
        }));
      }
    }
  } catch (error) {
    log(`Error sending initial state: ${error}`, 'error');
  }
}
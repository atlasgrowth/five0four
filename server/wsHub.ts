import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';

// Constants for kitchen order timing
export const PREP_BUFFER = 120; // 2 minutes of prep time
export const EXPO_BUFFER = 180; // 3 minutes for expo

// Define WebSocket message types
export type WSMessageType = 
  | 'new-ticket'    // New order created
  | 'status-update' // Order status changed
  | 'picked-up'     // Order picked up

// Define the message structure
export interface WSMessage {
  type: WSMessageType;
  data: any;
}

// Manage connections by room
const connections: Record<string, Set<WebSocket>> = {
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
    console.log(`New WebSocket connection to /${room}`);
    
    // Add to the appropriate room
    if (connections[room]) {
      connections[room].add(ws);
    }
    
    // Send initial state
    sendInitialState(ws, room);
    
    // Handle disconnection
    ws.on('close', () => {
      console.log(`WebSocket disconnected from /${room}`);
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
        console.error('Error parsing WebSocket message:', error);
      }
    });
  });
  
  console.log('WebSocket server initialized');
  return wss;
}

// Send message to all clients in a specific room
export function broadcastToRoom(room: string, message: WSMessage) {
  if (connections[room]) {
    const clients = connections[room];
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
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
      console.log(`Received message of type ${message.type} from ${sourceRoom}`);
  }
}

// Send initial state to new connections
async function sendInitialState(ws: WebSocket, room: string) {
  try {
    // Import here to avoid circular dependency
    const { storage } = await import('./storage');
    
    if (room === 'kitchen' || room === 'expo') {
      // Get active orders for kitchen/expo views
      const orders = await storage.getActiveOrders();
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'init-orders',
          data: { orders }
        }));
      }
    }
  } catch (error) {
    console.error('Error sending initial state:', error);
  }
}
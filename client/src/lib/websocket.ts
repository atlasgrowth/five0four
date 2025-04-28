import { WebSocketMessage } from "@shared/types";

type MessageHandler = (data: WebSocketMessage) => void;
type ConnectHandler = () => void;
type ErrorHandler = (event: Event) => void;
type StationType = 'kitchen' | 'bar' | 'expo' | 'servers';

export class StationWebSocket {
  private ws: WebSocket | null = null;
  private floor: number;
  private station: StationType;
  private messageHandlers: MessageHandler[] = [];
  private connectHandlers: ConnectHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // ms
  
  constructor(floor: number, station: StationType) {
    this.floor = floor;
    this.station = station;
  }
  
  public connect(): void {
    if (this.ws) {
      this.ws.close();
    }
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/${this.station}?floor=${this.floor}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log(`Connected to ${this.station} WebSocket for floor ${this.floor}`);
      this.reconnectAttempts = 0;
      this.connectHandlers.forEach(handler => handler());
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        this.messageHandlers.forEach(handler => handler(data));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.ws.onerror = (event) => {
      console.error(`${this.station} WebSocket error:`, event);
      this.errorHandlers.forEach(handler => handler(event));
    };
    
    this.ws.onclose = () => {
      console.log(`${this.station} WebSocket closed for floor ${this.floor}`);
      
      // Attempt to reconnect if not max attempts
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, this.reconnectDelay);
      }
    };
  }
  
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }
  
  public onConnect(handler: ConnectHandler): () => void {
    this.connectHandlers.push(handler);
    return () => {
      this.connectHandlers = this.connectHandlers.filter(h => h !== handler);
    };
  }
  
  public onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
    };
  }
  
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// For backwards compatibility
export class KitchenWebSocket extends StationWebSocket {
  constructor(floor: number) {
    super(floor, 'kitchen');
  }
}

// Bar WebSocket client
export class BarWebSocket extends StationWebSocket {
  constructor(floor: number) {
    super(floor, 'bar');
  }
}

// Expo WebSocket client
export class ExpoWebSocket extends StationWebSocket {
  constructor(floor: number) {
    super(floor, 'expo');
  }
}

// Servers WebSocket client
export class ServersWebSocket extends StationWebSocket {
  constructor(floor: number) {
    super(floor, 'servers');
  }
}

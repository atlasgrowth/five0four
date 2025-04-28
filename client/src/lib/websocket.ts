import { WebSocketMessage } from "@shared/types";

type MessageHandler = (data: WebSocketMessage) => void;
type ConnectHandler = () => void;
type ErrorHandler = (event: Event) => void;

export class KitchenWebSocket {
  private ws: WebSocket | null = null;
  private floor: number;
  private messageHandlers: MessageHandler[] = [];
  private connectHandlers: ConnectHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // ms
  
  constructor(floor: number) {
    this.floor = floor;
  }
  
  public connect(): void {
    if (this.ws) {
      this.ws.close();
    }
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/kitchen?floor=${this.floor}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log(`Connected to WebSocket for floor ${this.floor}`);
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
      console.error('WebSocket error:', event);
      this.errorHandlers.forEach(handler => handler(event));
    };
    
    this.ws.onclose = () => {
      console.log(`WebSocket closed for floor ${this.floor}`);
      
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

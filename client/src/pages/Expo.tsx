import React, { useState, useEffect, useCallback } from 'react';
import { ExpoWebSocket } from '@/lib/websocket';
import { WebSocketMessage, OrderWithItems } from '@shared/types';
import { formatLocation, formatTimer } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';

// Status progression for expo
const NEXT_STATUS: Record<string, string> = {
  'PLATING': 'READY',
  'READY': 'PICKED_UP'
};

export default function Expo() {
  const [floor, setFloor] = useState(1);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [expoWs, setExpoWs] = useState<ExpoWebSocket | null>(null);
  const [counters, setCounters] = useState<Record<string, number>>({});
  
  // Set up timer to update every second
  useEffect(() => {
    const timerId = setInterval(() => {
      // Force re-render to update timers
      setCounters(prev => ({ ...prev, tick: (prev.tick || 0) + 1 }));
    }, 1000);
    
    return () => clearInterval(timerId);
  }, []);
  
  // Connect to WebSocket on component mount
  useEffect(() => {
    const ws = new ExpoWebSocket(floor);
    setExpoWs(ws);
    
    ws.connect();
    console.log(`Connected to expo WebSocket for floor ${floor}`);
    
    const removeMessageHandler = ws.onMessage((data: WebSocketMessage) => {
      handleWebSocketMessage(data);
    });
    
    // Clean up on component unmount
    return () => {
      removeMessageHandler();
      ws.disconnect();
      console.log(`expo WebSocket closed for floor ${floor}`);
    };
  }, [floor]);
  
  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    if (data.type === 'init-orders') {
      setOrders(data.data.orders || []);
    } else if (data.type === 'new-ticket') {
      setOrders(prev => {
        // Make sure we're not adding duplicates
        if (prev.some(o => o.id === data.data.id)) {
          return prev;
        }
        return [...prev, data.data];
      });
    } else if (data.type === 'status-update') {
      setOrders(prev => {
        const updatedOrder = data.data;
        return prev.map(order => 
          order.id === updatedOrder.id ? updatedOrder : order
        );
      });
    } else if (data.type === 'picked-up') {
      // Remove picked up orders
      setOrders(prev => prev.filter(order => order.id !== data.data.id));
    }
  }, []);
  
  // Handle advancing the order status
  const handleStatusUpdate = async (orderId: string, currentStatus: string) => {
    if (!NEXT_STATUS[currentStatus]) return;
    
    const nextStatus = NEXT_STATUS[currentStatus];
    
    try {
      await apiRequest(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Optimistic update
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: nextStatus } 
            : order
        )
      );
      
      // Full update will come through WebSocket
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };
  
  // Calculate time left for an order
  const getTimeLeft = (order: OrderWithItems): number => {
    if (!order.timer_end) return 0;
    
    const now = new Date();
    const timerEnd = new Date(order.timer_end);
    const diffMs = timerEnd.getTime() - now.getTime();
    
    return Math.max(0, Math.floor(diffMs / 1000));
  };
  
  // Calculate total items count
  const getTotalItems = (order: OrderWithItems): number => {
    return order.items.reduce((sum, item) => sum + item.qty, 0);
  };
  
  // Filter orders that are relevant for expo (PLATING, READY)
  const expoOrders = orders.filter(o => 
    ['PLATING', 'READY'].includes(o.status || '')
  ).sort((a, b) => {
    // Sort by status first (READY first, then PLATING)
    if ((a.status === 'READY') && (b.status !== 'READY')) return -1;
    if ((a.status !== 'READY') && (b.status === 'READY')) return 1;
    
    // Then sort by time remaining (ascending)
    return getTimeLeft(a) - getTimeLeft(b);
  });
  
  // Render a badge for the order status
  const renderStatusBadge = (status: string) => {
    let className = 'ticket-status ';
    
    switch(status) {
      case 'PLATING':
        className += 'status-plating';
        break;
      case 'READY':
        className += 'status-ready';
        break;
      default:
        className += 'status-picked-up';
    }
    
    return (
      <span className={className}>{status}</span>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="station-header">
        <div>
          <h1 className="station-title">Expo Station</h1>
          <p className="station-description">Order assembly and delivery coordination</p>
        </div>
        <div className="station-controls">
          {[1, 2, 3].map(f => (
            <Button
              key={f}
              variant={floor === f ? 'default' : 'outline'}
              onClick={() => setFloor(f)}
              className="floor-button"
            >
              Floor {f}
            </Button>
          ))}
        </div>
      </div>
      
      {expoOrders.length === 0 ? (
        <div className="station-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-muted-foreground">
            <path d="M22 12.5V10c0-.69-.35-1.3-.88-1.66a2.91 2.91 0 0 1-1.17-1.1 2.8 2.8 0 0 1-.36-1.46l.001-.32a2 2 0 0 0-2-2.12 2 2 0 0 0-2 2 4 4 0 0 1-2 3.46 4 4 0 0 1-2 .54H4"></path>
            <path d="m19 16-7-4"></path>
            <path d="M15 12V5"></path>
            <path d="M15 5h-3"></path>
            <circle cx="7" cy="16" r="5"></circle>
            <path d="M7 19v-2.1a2 2 0 0 1 .59-1.42c.37-.38.87-.58 1.41-.58h4"></path>
          </svg>
          <h2 className="text-2xl text-muted-foreground font-medium">No Orders Ready</h2>
          <p className="text-muted-foreground mt-1">Orders in plating or ready for pickup will appear here</p>
        </div>
      ) : (
        <div className="ticket-grid">
          {expoOrders.map(order => {
            const isReady = order.status === 'READY';
            
            return (
              <Card 
                key={order.id}
                className={`station-card cursor-pointer
                  ${isReady ? 'border-l-green-500' : 'border-l-purple-500'}
                `}
                onClick={() => handleStatusUpdate(order.id, order.status || 'PLATING')}
              >
                <div className="p-6">
                  <div className="ticket-header">
                    <div>
                      <h3 className="text-xl font-bold">{formatLocation(order.floor, order.bay)}</h3>
                      <div className="mt-2">{renderStatusBadge(order.status || 'PLATING')}</div>
                    </div>
                    <div>
                      {isReady ? (
                        <span className="px-3 py-1 bg-green-500 text-white rounded-xl">
                          PICKUP
                        </span>
                      ) : (
                        <span className="ticket-timer text-purple-500">
                          {formatTimer(getTimeLeft(order))}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-3">
                      {getTotalItems(order)} items
                    </h4>
                    <ul className="ticket-items">
                      {order.items.map((item, index) => (
                        <li key={index} className="ticket-item">
                          <div className="flex justify-between">
                            <span className="ticket-item-name">{item.qty}× {item.name}</span>
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <span className="ticket-item-modifiers">
                              {item.modifiers.map(m => m.name).join(', ')}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
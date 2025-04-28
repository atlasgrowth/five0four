import React, { useState, useEffect, useCallback } from 'react';
import { KitchenWebSocket } from '@/lib/websocket';
import { WebSocketMessage, OrderWithItems } from '@shared/types';
import { formatLocation, formatTimer, getTimerStatus } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';

// Status progression for kitchen
const NEXT_STATUS: Record<string, string> = {
  'NEW': 'COOKING',
  'COOKING': 'PLATING'
};

export default function Kitchen() {
  const [floor, setFloor] = useState(1);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [kitchenWs, setKitchenWs] = useState<KitchenWebSocket | null>(null);
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
    const ws = new KitchenWebSocket(floor);
    setKitchenWs(ws);
    
    ws.connect();
    console.log(`Connected to kitchen WebSocket for floor ${floor}`);
    
    const removeMessageHandler = ws.onMessage((data: WebSocketMessage) => {
      handleWebSocketMessage(data);
    });
    
    // Clean up on component unmount
    return () => {
      removeMessageHandler();
      ws.disconnect();
      console.log(`kitchen WebSocket closed for floor ${floor}`);
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
  
  // Calculate percentage of cook time remaining
  const getTimePercentage = (order: OrderWithItems): number => {
    if (!order.timer_end) return 0;
    
    const totalCookTime = order.items.reduce((max, item) => 
      Math.max(max, item.total_cook_seconds || 0), 0);
    
    if (totalCookTime <= 0) return 0;
    
    const timeLeft = getTimeLeft(order);
    return Math.min(100, Math.max(0, (timeLeft / totalCookTime) * 100));
  };
  
  // Filter orders that are relevant for kitchen (NEW, COOKING)
  const kitchenOrders = orders.filter(o => 
    ['NEW', 'COOKING'].includes(o.status || '')
  ).sort((a, b) => getTimeLeft(a) - getTimeLeft(b));
  
  // Render a badge for the order status
  const renderStatusBadge = (status: string) => {
    let className = 'px-3 py-1 text-xs font-semibold rounded-full ';
    
    switch(status) {
      case 'NEW':
        className += 'bg-red-100 text-red-800';
        break;
      case 'COOKING':
        className += 'bg-amber-100 text-amber-800';
        break;
      case 'PLATING':
        className += 'bg-blue-100 text-blue-800';
        break;
      case 'READY':
        className += 'bg-green-100 text-green-800';
        break;
      default:
        className += 'bg-gray-100 text-gray-800';
    }
    
    return (
      <span className={className}>{status}</span>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="mb-2">Kitchen Display</h1>
          <p className="text-muted-foreground">Hot food preparation station</p>
        </div>
        <div className="flex space-x-2">
          {[1, 2, 3].map(f => (
            <Button
              key={f}
              variant={floor === f ? 'default' : 'outline'}
              onClick={() => setFloor(f)}
              className="w-24 h-12 text-lg"
            >
              Floor {f}
            </Button>
          ))}
        </div>
      </div>
      
      {kitchenOrders.length === 0 ? (
        <div className="text-center py-24 bg-muted/30 rounded-lg border border-dashed">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-muted-foreground">
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"></path>
            <line x1="6" x2="18" y1="17" y2="17"></line>
          </svg>
          <h2 className="text-2xl text-muted-foreground font-medium">No Active Orders</h2>
          <p className="text-muted-foreground mt-1">New food orders will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kitchenOrders.map(order => {
            const timeLeft = getTimeLeft(order);
            const timePercentage = getTimePercentage(order);
            let timerStatus = 'normal';
            
            if (timePercentage < 30) {
              timerStatus = 'danger';
            } else if (timePercentage < 70) {
              timerStatus = 'warning';
            }
            
            return (
              <Card 
                key={order.id}
                className={`station-card cursor-pointer
                  ${timerStatus === 'danger' ? 'border-l-red-500' : 
                    timerStatus === 'warning' ? 'border-l-amber-500' : 
                    'border-l-green-500'}
                `}
                onClick={() => handleStatusUpdate(order.id, order.status || 'NEW')}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{formatLocation(order.floor, order.bay)}</h3>
                      <div className="mt-2">{renderStatusBadge(order.status || 'NEW')}</div>
                    </div>
                    <div className={`
                      text-2xl font-mono font-bold
                      ${timerStatus === 'danger' ? 'timer-danger' : 
                        timerStatus === 'warning' ? 'timer-warning' : 
                        'timer-normal'}
                    `}>
                      {formatTimer(timeLeft)}
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold mb-3">
                      {getTotalItems(order)} items
                    </h4>
                    <ul className="space-y-3">
                      {order.items.map((item, index) => (
                        <li key={index} className="flex flex-col">
                          <div className="flex justify-between">
                            <span className="font-medium">{item.qty}x {item.name}</span>
                            <span className="text-muted-foreground text-sm">
                              {item.total_cook_seconds ? `${Math.floor(item.total_cook_seconds / 60)}m` : ''}
                            </span>
                          </div>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <span className="text-sm text-muted-foreground mt-1 italic">
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
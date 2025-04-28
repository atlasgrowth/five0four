import React, { useState, useEffect, useCallback } from 'react';
import { KitchenWebSocket } from '@/lib/websocket';
import { WebSocketMessage, OrderWithItems } from '@shared/types';
import { formatLocation, formatTimer, getTimerStatus } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

// Status progression for expo
const NEXT_STATUS: Record<string, string> = {
  'PLATING': 'READY',
  'READY': 'PICKED_UP'
};

export default function Expo() {
  const [floor, setFloor] = useState(1);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [expoWs, setExpoWs] = useState<KitchenWebSocket | null>(null);
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
    // We're reusing KitchenWebSocket but targeting the 'expo' room
    const ws = new KitchenWebSocket(floor);
    setExpoWs(ws);
    
    ws.connect();
    
    const removeMessageHandler = ws.onMessage((data: WebSocketMessage) => {
      handleWebSocketMessage(data);
    });
    
    // Clean up on component unmount
    return () => {
      removeMessageHandler();
      ws.disconnect();
    };
  }, [floor]);
  
  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    if (data.type === 'init-orders') {
      setOrders(data.data.orders || []);
    } else if (data.type === 'status-update') {
      setOrders(prev => {
        const updatedOrder = data.data;
        
        // Check if we already have this order
        const exists = prev.some(order => order.id === updatedOrder.id);
        
        if (exists) {
          // Update existing order
          return prev.map(order => 
            order.id === updatedOrder.id ? updatedOrder : order
          );
        } else if (['PLATING', 'READY'].includes(updatedOrder.status || '')) {
          // Add new order that reached plating status
          return [...prev, updatedOrder];
        }
        
        return prev;
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
      
      // Update will come through WebSocket
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
    // First by status (PLATING before READY)
    if (a.status === 'PLATING' && b.status === 'READY') return -1;
    if (a.status === 'READY' && b.status === 'PLATING') return 1;
    
    // Then by time left (ascending)
    return getTimeLeft(a) - getTimeLeft(b);
  });
  
  // Render a badge for the order status
  const renderStatusBadge = (status: string) => {
    const variant = 
      status === 'PLATING' ? 'warning' : 
      status === 'READY' ? 'success' : 
      'outline';
    
    return (
      <Badge variant={variant}>{status}</Badge>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Expo Station</h1>
        <div className="flex space-x-2">
          {[1, 2, 3].map(f => (
            <Button
              key={f}
              variant={floor === f ? 'default' : 'outline'}
              onClick={() => setFloor(f)}
            >
              Floor {f}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex">
        <div className="w-1/2 pr-4">
          <h2 className="text-xl font-bold mb-4">Plating</h2>
          {expoOrders.filter(o => o.status === 'PLATING').length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border">
              <p className="text-gray-400">No orders being plated</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expoOrders.filter(o => o.status === 'PLATING').map(order => {
                const timeLeft = getTimeLeft(order);
                const timerStatus = getTimerStatus(timeLeft, 300); // 5 min baseline for visual indication
                
                return (
                  <Card 
                    key={order.id}
                    className={`
                      border-l-4 cursor-pointer hover:shadow-lg transition-shadow
                      ${timerStatus === 'danger' ? 'border-l-red-500' : 
                        timerStatus === 'warning' ? 'border-l-yellow-500' : 
                        'border-l-green-500'}
                    `}
                    onClick={() => handleStatusUpdate(order.id, 'PLATING')}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-bold">{formatLocation(order.floor, order.bay)}</h3>
                          <div className="mt-1">{renderStatusBadge('PLATING')}</div>
                        </div>
                        <div className={`
                          text-xl font-mono font-bold
                          ${timerStatus === 'danger' ? 'text-red-500' : 
                            timerStatus === 'warning' ? 'text-yellow-500' : 
                            'text-green-500'}
                        `}>
                          {formatTimer(timeLeft)}
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <h4 className="text-sm font-semibold text-gray-500 mb-1">
                          {getTotalItems(order)} items
                        </h4>
                        <ul className="text-sm space-y-1">
                          {order.items.map((item, index) => (
                            <li key={index}>
                              {item.qty}x {item.name}
                              {item.modifiers && item.modifiers.length > 0 && (
                                <span className="text-xs italic ml-2">
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
        
        <div className="w-1/2 pl-4">
          <h2 className="text-xl font-bold mb-4">Ready for Pickup</h2>
          {expoOrders.filter(o => o.status === 'READY').length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border">
              <p className="text-gray-400">No orders ready for pickup</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expoOrders.filter(o => o.status === 'READY').map(order => {
                const timeLeft = getTimeLeft(order);
                const timerStatus = getTimerStatus(timeLeft, 300); // 5 min baseline for expo
                
                return (
                  <Card 
                    key={order.id}
                    className={`
                      border-l-4 cursor-pointer hover:shadow-lg transition-shadow
                      border-l-green-500 bg-green-50
                    `}
                    onClick={() => handleStatusUpdate(order.id, 'READY')}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-bold">{formatLocation(order.floor, order.bay)}</h3>
                          <div className="mt-1">{renderStatusBadge('READY')}</div>
                        </div>
                        <Button size="sm" variant="success" onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(order.id, 'READY');
                        }}>
                          Mark Picked Up
                        </Button>
                      </div>
                      
                      <div className="mt-3">
                        <h4 className="text-sm font-semibold text-gray-500 mb-1">
                          {getTotalItems(order)} items
                        </h4>
                        <ul className="text-sm space-y-1">
                          {order.items.map((item, index) => (
                            <li key={index}>
                              {item.qty}x {item.name}
                              {item.modifiers && item.modifiers.length > 0 && (
                                <span className="text-xs italic ml-2">
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
      </div>
    </div>
  );
}
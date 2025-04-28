import React, { useState, useEffect, useCallback } from 'react';
import { BarWebSocket } from '@/lib/websocket';
import { WebSocketMessage, OrderWithItems } from '@shared/types';
import { formatLocation, formatTimer, getTimerStatus } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

// Status progression for bar
const NEXT_STATUS: Record<string, string> = {
  'NEW': 'COOKING',
  'COOKING': 'PLATING',
  'PLATING': 'READY'
};

export default function Bar() {
  const [floor, setFloor] = useState(1);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [barWs, setBarWs] = useState<BarWebSocket | null>(null);
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
    const ws = new BarWebSocket(floor);
    setBarWs(ws);
    
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
    } else if (data.type === 'new-ticket') {
      setOrders(prev => [...prev, data.data]);
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
  
  // Filter orders that are relevant for bar (NEW, COOKING)
  const barOrders = orders.filter(o => 
    ['NEW', 'COOKING'].includes(o.status || '')
  ).sort((a, b) => getTimeLeft(a) - getTimeLeft(b));
  
  // Render a badge for the order status
  const renderStatusBadge = (status: string) => {
    const variant = 
      status === 'NEW' ? 'destructive' : 
      status === 'COOKING' ? 'default' :
      status === 'PLATING' ? 'warning' : 
      status === 'READY' ? 'success' : 'outline';
    
    return (
      <Badge variant={variant}>{status}</Badge>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Bar Display</h1>
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
      
      {barOrders.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-2xl text-gray-400">No active orders</h2>
          <p className="text-gray-500">New drink orders will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {barOrders.map(order => {
            const timeLeft = getTimeLeft(order);
            const timerStatus = getTimerStatus(timeLeft, 300); // 5 min baseline for drinks
            
            return (
              <Card 
                key={order.id}
                className={`
                  border-l-4 cursor-pointer hover:shadow-lg transition-shadow
                  ${timerStatus === 'danger' ? 'border-l-red-500' : 
                    timerStatus === 'warning' ? 'border-l-yellow-500' : 
                    'border-l-blue-500'}
                `}
                onClick={() => handleStatusUpdate(order.id, order.status || 'NEW')}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{formatLocation(order.floor, order.bay)}</h3>
                      <div className="mt-1">{renderStatusBadge(order.status || 'NEW')}</div>
                    </div>
                    <div className={`
                      text-xl font-mono font-bold
                      ${timerStatus === 'danger' ? 'text-red-500' : 
                        timerStatus === 'warning' ? 'text-yellow-500' : 
                        'text-blue-500'}
                    `}>
                      {formatTimer(timeLeft)}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-500 mb-2">
                      {getTotalItems(order)} drinks
                    </h4>
                    <ul className="space-y-2">
                      {order.items.map((item, index) => (
                        <li key={index} className="flex justify-between">
                          <span>{item.qty}x {item.name}</span>
                          <span className="text-gray-500">
                            {item.modifiers && item.modifiers.length > 0 && (
                              <span className="text-xs italic ml-2">
                                {item.modifiers.map(m => m.name).join(', ')}
                              </span>
                            )}
                          </span>
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
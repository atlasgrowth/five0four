import { useEffect, useState, useCallback } from "react";
import { useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarWebSocket } from "@/lib/websocket";
import { OrderWithItems, WebSocketMessage } from "@shared/types";
import KitchenTicket from "@/components/kitchen/KitchenTicket";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Bar() {
  const params = useParams<{ floor: string }>();
  const floor = parseInt(params.floor, 10);
  
  const [connected, setConnected] = useState(false);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [ws, setWs] = useState<BarWebSocket | null>(null);
  
  // Initialize WebSocket connection
  useEffect(() => {
    const barWs = new BarWebSocket(floor);
    
    const removeConnectHandler = barWs.onConnect(() => {
      setConnected(true);
      toast({
        title: "Connected",
        description: `Connected to bar for Floor ${floor}`,
      });
    });
    
    const removeErrorHandler = barWs.onError(() => {
      setConnected(false);
      toast({
        title: "Connection Error",
        description: "Failed to connect to bar. Retrying...",
        variant: "destructive",
      });
    });
    
    const removeMessageHandler = barWs.onMessage((data: WebSocketMessage) => {
      handleWebSocketMessage(data);
    });
    
    barWs.connect();
    setWs(barWs);
    
    return () => {
      removeConnectHandler();
      removeErrorHandler();
      removeMessageHandler();
      barWs.disconnect();
    };
  }, [floor]);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    switch (data.type) {
      case 'init-orders':
        if (data.orders) {
          setOrders(data.orders);
        }
        break;
      case 'new-ticket':
      case 'order-paid':
        if (data.order) {
          // Refresh all orders - in a real app we'd update just the affected order
          refreshOrders();
        }
        break;
      case 'status-updated':
        if (data.order) {
          // Update the status of the specific order
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === data.order?.id 
                ? { ...order, status: data.order.status } 
                : order
            )
          );
        }
        break;
    }
  }, []);
  
  // Refresh orders from server
  const refreshOrders = useCallback(() => {
    // In a full implementation, we would make an API call to get updated orders
    // For now, we'll rely on WebSocket for updates
    if (ws && ws.isConnected()) {
      ws.disconnect();
      ws.connect();
    }
  }, [ws]);
  
  // Update order status
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to update order status");
      }
      
      // The status update will come back through the WebSocket
    } catch (error: any) {
      toast({
        title: "Error Updating Status",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bar Display</h2>
          <p className="text-gray-600">Floor {floor}</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <Badge 
            variant={connected ? "default" : "destructive"}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"} mr-1`}></span>
            {connected ? "Connected" : "Disconnected"}
          </Badge>
          <Button variant="outline" onClick={refreshOrders} className="px-4 py-2">
            <span className="material-icons mr-1 text-sm">refresh</span>
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Bar Orders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {orders.length > 0 ? (
          orders.map(order => (
            <KitchenTicket 
              key={order.id} 
              order={order} 
              onStatusUpdate={(status) => updateOrderStatus(order.id, status)}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-8 bg-white rounded-lg shadow-md">
            <p className="text-gray-500">No active drink orders for this floor.</p>
          </div>
        )}
      </div>
    </div>
  );
}
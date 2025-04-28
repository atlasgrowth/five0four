import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderWithItems } from "@shared/types";
import { formatLocation, formatTimer, formatCookTime, calculateETA, getTimerStatus } from "@/lib/formatters";

interface KitchenTicketProps {
  order: OrderWithItems;
  onStatusUpdate: (status: string) => void;
}

export default function KitchenTicket({ order, onStatusUpdate }: KitchenTicketProps) {
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Find the item with the longest cook time
  const maxCookTime = Math.max(...order.items.map(item => item.total_cook_seconds));
  const totalETA = calculateETA(maxCookTime);
  
  // Setup timer when component mounts
  useEffect(() => {
    setRemainingTime(totalETA);
    
    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimer(interval);
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [order.id, totalETA]);
  
  // Determine card border color based on timer status
  const timerStatus = getTimerStatus(remainingTime, totalETA);
  
  const getBorderColor = () => {
    switch (timerStatus) {
      case 'danger':
        return 'border-error';
      case 'warning':
        return 'border-warning';
      default:
        return 'border-success';
    }
  };
  
  const getHeaderBgColor = () => {
    switch (timerStatus) {
      case 'danger':
        return 'bg-red-50';
      case 'warning':
        return 'bg-warning-50';
      default:
        return 'bg-green-50';
    }
  };
  
  const getTimerColor = () => {
    switch (timerStatus) {
      case 'danger':
        return 'text-error';
      case 'warning':
        return 'text-warning';
      default:
        return 'text-success';
    }
  };
  
  // Handle status update buttons
  const handleMarkPreparing = () => {
    onStatusUpdate('PREPARING');
  };
  
  const handleMarkReady = () => {
    onStatusUpdate('READY');
    if (timer) clearInterval(timer);
  };
  
  return (
    <Card className={`overflow-hidden border-l-4 ${getBorderColor()}`}>
      <CardHeader className={`px-4 py-2 ${getHeaderBgColor()} flex justify-between items-center`}>
        <div className="font-bold">
          <span className="font-mono">Order #{order.id.substring(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex items-center">
          <span className="flex items-center text-sm font-medium mr-2">
            <span className="material-icons text-sm mr-1">room</span>
            <span>{formatLocation(order.floor, order.bay)}</span>
          </span>
          <div className={`font-medium flex items-center ${getTimerColor()}`}>
            <span className="material-icons text-sm mr-1">schedule</span>
            <span>{formatTimer(remainingTime)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="divide-y divide-gray-200">
          {order.items.map((item) => (
            <div key={item.id} className="py-2 flex items-center">
              <div className="font-medium text-lg mr-2">{item.qty}</div>
              <div className="flex-grow">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-gray-600">{formatCookTime(item.cook_seconds)}</div>
              </div>
              {item.station && (
                <div className={`text-xs font-medium px-2 py-1 rounded ${
                  item.station === "Kitchen" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {item.station}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            className="py-2 bg-accent text-white font-medium"
            onClick={handleMarkPreparing}
          >
            Preparing
          </Button>
          <Button
            className="py-2 bg-success text-white font-medium"
            onClick={handleMarkReady}
          >
            Ready
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

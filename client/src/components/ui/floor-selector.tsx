import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FloorSelectorProps {
  currentFloor: number;
  urlPrefix: string;
}

export function FloorSelector({ currentFloor, urlPrefix }: FloorSelectorProps) {
  const [_, navigate] = useLocation();
  const floors = [1, 2, 3];
  
  const handleFloorChange = (floor: number) => {
    if (floor !== currentFloor) {
      navigate(`${urlPrefix}/${floor}`);
    }
  };
  
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="text-sm font-medium mb-2">Change Floor</div>
        <div className="flex space-x-2">
          {floors.map((floor) => (
            <Button
              key={floor}
              variant={currentFloor === floor ? "default" : "outline"}
              className={currentFloor === floor ? "bg-primary text-white" : ""}
              onClick={() => handleFloorChange(floor)}
            >
              Floor {floor}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
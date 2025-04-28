import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ServerPad() {
  const [_, navigate] = useLocation();
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedBay, setSelectedBay] = useState<number | null>(null);

  const floors = [1, 2, 3];
  const bays = Array.from({ length: 25 }, (_, i) => i + 1);

  const handleFloorSelect = (floor: number) => {
    setSelectedFloor(floor);
  };

  const handleBaySelect = (bay: number) => {
    setSelectedBay(bay);
  };

  const handleContinue = () => {
    if (selectedFloor && selectedBay) {
      navigate(`/menu/${selectedFloor}/${selectedBay}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Location</h2>
        <Card>
          <CardContent className="p-6">
            {/* Floor Selector */}
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Floor</label>
              <div className="flex space-x-3">
                {floors.map((floor) => (
                  <Button
                    key={floor}
                    variant={selectedFloor === floor ? "default" : "outline"}
                    className={selectedFloor === floor ? "bg-primary text-white" : ""}
                    onClick={() => handleFloorSelect(floor)}
                    className="flex-1"
                  >
                    Floor {floor}
                  </Button>
                ))}
              </div>
            </div>

            {/* Bay Selector */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">Bay</label>
              <div className="grid grid-cols-5 gap-2 md:grid-cols-8 lg:grid-cols-10">
                {bays.map((bay) => (
                  <Button
                    key={bay}
                    variant={selectedBay === bay ? "default" : "outline"}
                    className={selectedBay === bay ? "bg-primary text-white" : ""}
                    onClick={() => handleBaySelect(bay)}
                  >
                    {bay}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button
                onClick={handleContinue}
                disabled={!selectedBay}
                className="py-3 px-8 bg-secondary text-white font-bold"
              >
                Continue to Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

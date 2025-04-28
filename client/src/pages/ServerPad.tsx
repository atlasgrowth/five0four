import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "@/lib/formatters";
import { MenuItem } from "@shared/schema";
import { CartItem } from "@shared/types";

export default function ServerPad() {
  const [_, navigate] = useLocation();
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedBay, setSelectedBay] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [category, setCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Fetch menu items when bay is selected
  const { data: items = [], isLoading, isError } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu'],
    enabled: showMenu
  });

  const floors = [1, 2, 3];
  const bays = Array.from({ length: 25 }, (_, i) => i + 1);

  // Extract unique categories from menu items
  const categories = Array.from(new Set(items.map(item => item.category)));

  // Set initial category when items are loaded
  useEffect(() => {
    if (categories.length > 0 && !category) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const handleFloorSelect = (floor: number) => {
    setSelectedFloor(floor);
  };

  const handleBaySelect = (bay: number) => {
    setSelectedBay(bay);
  };

  const handleContinue = () => {
    if (selectedFloor && selectedBay) {
      setShowMenu(true);
    }
  };

  const handleBackToSelection = () => {
    setShowMenu(false);
    setCart([]);
    setCategory("");
  };

  const handleAddToCart = (item: MenuItem) => {
    setCart(prevCart => {
      // Check if item already exists in cart
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        // Increment quantity if item exists
        return prevCart.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, qty: cartItem.qty + 1 } 
            : cartItem
        );
      } else {
        // Add new item to cart
        return [...prevCart, { 
          id: item.id, 
          name: item.name, 
          price_cents: item.price_cents, 
          qty: 1 
        }];
      }
    });
  };

  const handleSendOrder = () => {
    console.log("Sending order:", {
      floor: selectedFloor,
      bay: selectedBay,
      items: cart.map(item => ({ id: item.id, qty: item.qty }))
    });
    // Reset after send
    setShowMenu(false);
    setCart([]);
    setCategory("");
    setSelectedBay(null);
  };

  // Calculate cart total
  const cartTotal = cart.reduce((sum, item) => sum + (item.price_cents * item.qty), 0);

  return (
    <div className="container mx-auto px-4 py-6">
      {!showMenu ? (
        // Bay Selection Screen
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
                      className={`flex-1 ${selectedFloor === floor ? "bg-primary text-white" : ""}`}
                      onClick={() => handleFloorSelect(floor)}
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
      ) : (
        // Menu Screen
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left side - Menu */}
          <div className="w-full md:w-2/3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Menu - Floor {selectedFloor}, Bay {selectedBay}
              </h2>
              <Button variant="outline" onClick={handleBackToSelection}>
                Back
              </Button>
            </div>
            
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Loading menu...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-12 text-red-600">
                <p>Error loading menu. Please try again later.</p>
              </div>
            ) : (
              <>
                {/* Category Tabs */}
                <div className="mb-4 bg-white rounded-lg shadow overflow-x-auto">
                  <div className="flex p-1 space-x-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        className={`px-4 py-2 rounded-md whitespace-nowrap ${
                          cat === category 
                            ? "bg-primary text-white font-medium" 
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                        onClick={() => setCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Menu Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items
                    .filter(item => item.category === category)
                    .map(item => (
                      <button
                        key={item.id}
                        className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow text-left"
                        onClick={() => handleAddToCart(item)}
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-gray-700 mt-1">{formatPrice(item.price_cents)}</div>
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
          
          {/* Right side - Cart */}
          <div className="w-full md:w-1/3 mt-4 md:mt-0">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xl font-bold mb-4">Cart</h3>
                
                {cart.length === 0 ? (
                  <p className="text-gray-500 italic text-center py-8">Your cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between">
                          <div>
                            <span className="font-medium">{item.qty}x</span> {item.name}
                          </div>
                          <div>{formatPrice(item.price_cents * item.qty)}</div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-3 mt-4">
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>{formatPrice(cartTotal)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full mt-4 py-2" 
                      onClick={handleSendOrder}
                      disabled={cart.length === 0}
                    >
                      SEND ORDER
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

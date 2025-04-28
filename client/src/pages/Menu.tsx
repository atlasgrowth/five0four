import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuByCategory } from "@shared/types";
import { formatLocation, formatPrice } from "@/lib/formatters";
import MenuItem from "@/components/menu/MenuItem";
import Cart from "@/components/menu/Cart";
import { useCart } from "@/hooks/use-cart";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Menu() {
  const params = useParams<{ floor: string; bay: string }>();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { cart, clearCart } = useCart();
  
  const floor = parseInt(params.floor, 10);
  const bay = parseInt(params.bay, 10);
  
  const [activeCategory, setActiveCategory] = useState<string>("");
  
  // Fetch menu items
  const { data: menuData, isLoading, isError } = useQuery<{ success: boolean; data: MenuByCategory }>({
    queryKey: ['/api/menu'],
  });
  
  // Get categories from menu data
  const categories = menuData?.data ? Object.keys(menuData.data) : [];
  
  // Set active category when data is loaded
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);
  
  // Calculate cart count and total
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price_cents * item.qty), 0);
  
  // Handle order submission
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before submitting an order.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const payload = {
        floor,
        bay,
        items: cart.map(item => ({ id: item.id, qty: item.qty })),
      };
      
      const response = await apiRequest("POST", "/api/orders", payload);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Order Submitted",
          description: "Your order has been sent to the kitchen.",
          variant: "default",
        });
        
        // Clear cart and navigate back to server pad
        clearCart();
        navigate("/");
      } else {
        throw new Error(result.error || "Failed to submit order");
      }
    } catch (error: any) {
      toast({
        title: "Error Submitting Order",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading menu...</p>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12 text-red-600">
          <p>Error loading menu. Please try again later.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Menu</h2>
          <p className="text-gray-600">{formatLocation(floor, bay)}</p>
        </div>
        
        {/* Cart Summary */}
        <div className="mt-4 md:mt-0 bg-white rounded-lg shadow-sm p-3 flex items-center justify-between border border-gray-200">
          <div>
            <span className="text-gray-700 font-medium">Cart</span>
            <span className="ml-2 bg-primary text-white text-sm py-0.5 px-2 rounded-full">
              {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="font-bold text-lg">{formatPrice(cartTotal)}</div>
        </div>
      </div>
      
      {/* Category Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6 overflow-x-auto">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex p-1 border-b border-gray-200">
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="px-4 py-2 font-medium rounded-md"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      
      {/* Menu Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {activeCategory && menuData?.data?.[activeCategory]?.map((item) => (
          <MenuItem key={item.id} item={item} />
        ))}
      </div>
      
      {/* Cart */}
      <Cart cartItems={cart} cartTotal={cartTotal} onSubmitOrder={handleSubmitOrder} />
    </div>
  );
}

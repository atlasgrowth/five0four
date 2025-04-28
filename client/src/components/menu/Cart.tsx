import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CartItem } from "@shared/types";
import { formatPrice } from "@/lib/formatters";
import { useCart } from "@/hooks/use-cart";

interface CartProps {
  cartItems: CartItem[];
  cartTotal: number;
  onSubmitOrder: () => void;
}

export default function Cart({ cartItems, cartTotal, onSubmitOrder }: CartProps) {
  const { updateQuantity } = useCart();
  
  const handleIncrement = (itemId: number, currentQty: number) => {
    updateQuantity(itemId, currentQty + 1);
  };
  
  const handleDecrement = (itemId: number, currentQty: number) => {
    if (currentQty > 1) {
      updateQuantity(itemId, currentQty - 1);
    } else {
      updateQuantity(itemId, 0); // This will remove the item
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          <span className="material-icons mr-2">shopping_cart</span>
          Your Order
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-gray-200">
          {cartItems.length > 0 ? (
            cartItems.map((item) => (
              <div key={item.id} className="py-3 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="flex items-center border rounded-md overflow-hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 py-1 h-auto bg-gray-100 hover:bg-gray-200 rounded-none"
                      onClick={() => handleDecrement(item.id, item.qty)}
                    >
                      <span className="material-icons text-sm">remove</span>
                    </Button>
                    <span className="px-3 py-1 font-medium">{item.qty}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 py-1 h-auto bg-gray-100 hover:bg-gray-200 rounded-none"
                      onClick={() => handleIncrement(item.id, item.qty)}
                    >
                      <span className="material-icons text-sm">add</span>
                    </Button>
                  </div>
                  <div className="ml-3">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">{formatPrice(item.price_cents)}</div>
                  </div>
                </div>
                <div className="font-bold">{formatPrice(item.price_cents * item.qty)}</div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-gray-500">
              Your cart is empty. Add items from the menu.
            </div>
          )}
          
          <div className="py-3 flex justify-between items-center font-bold">
            <div>Total</div>
            <div className="text-xl text-primary-dark">{formatPrice(cartTotal)}</div>
          </div>
        </div>
        
        <div className="mt-4">
          <Button
            onClick={onSubmitOrder}
            disabled={cartItems.length === 0}
            className="w-full py-3 bg-secondary text-white font-bold flex items-center justify-center"
          >
            <span className="material-icons mr-2">send</span>
            Send Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

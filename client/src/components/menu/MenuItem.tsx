import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MenuItem as MenuItemType } from "@shared/schema";
import { formatPrice, formatCookTime } from "@/lib/formatters";
import { useCart } from "@/hooks/use-cart";

interface MenuItemProps {
  item: MenuItemType;
}

export default function MenuItem({ item }: MenuItemProps) {
  const { addToCart } = useCart();
  
  const handleAddToCart = () => {
    addToCart(item);
  };
  
  return (
    <Card className="overflow-hidden border border-gray-200">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
            <p className="text-gray-600 text-sm mt-1">
              {/* Description would go here if available in the menu items */}
            </p>
          </div>
          <div className="font-bold text-primary-dark">{formatPrice(item.price_cents)}</div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <span className="material-icons text-sm">schedule</span>
            <span className="ml-1">{formatCookTime(item.cook_seconds)}</span>
          </div>
          <Button
            onClick={handleAddToCart}
            className="rounded-full bg-primary text-white w-8 h-8 p-0 flex items-center justify-center"
          >
            <span className="material-icons">add</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

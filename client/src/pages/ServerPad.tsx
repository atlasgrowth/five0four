import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import BaySelector from "@/components/BaySelector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { X, Search, Trash2, Edit, Plus, Minus, ShoppingCart } from "lucide-react";

type Item = {
  id: number;
  square_id: string;
  name: string;
  price_cents: number;
  category: string;
};

type CartItem = {
  item: Item;
  qty: number;
};

export default function ServerPad() {
  const [floor, setFloor] = useState<number | null>(null);
  const [bay, setBay] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  
  // Modal state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  /* -------- fetch menu once -------- */
  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((data: Item[]) => {
        setItems(data);
        if (data.length) setSelectedCategory(data[0].category);
      });
  }, []);

  /* -------- Cart operations -------- */
  const addToCart = (item: Item, quantity: number) => {
    if (quantity <= 0) return;
    
    setCart((prev) => ({
      ...prev,
      [item.square_id]: (prev[item.square_id] || 0) + quantity,
    }));
    
    // Reset modal
    setModalOpen(false);
    setSelectedItem(null);
    setItemQuantity(1);
    setEditingItemId(null);
  };

  const editCartItem = (itemId: string) => {
    const item = items.find(i => i.square_id === itemId);
    if (!item) return;
    
    setSelectedItem(item);
    setItemQuantity(cart[itemId] || 0);
    setEditingItemId(itemId);
    setModalOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      delete newCart[itemId];
      return newCart;
    });
  };

  const updateCartItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCart((prev) => ({
      ...prev,
      [itemId]: quantity,
    }));
    
    // Reset modal if open
    if (editingItemId === itemId) {
      setModalOpen(false);
      setSelectedItem(null);
      setItemQuantity(1);
      setEditingItemId(null);
    }
  };

  const clearCart = () => {
    setCart({});
  };

  const calculateTotal = () => {
    return Object.entries(cart).reduce(
      (sum, [id, qty]) => sum + (items.find((i) => i.square_id === id)?.price_cents || 0) * qty,
      0
    );
  };

  /* -------- Floor Selection UI -------- */
  if (floor === null)
    return (
      <div className="container mx-auto p-8">
        <h1 className="mb-6">Select Floor</h1>
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3].map((f) => (
            <Button
              key={f}
              variant="outline"
              size="lg"
              className="w-32 h-24 text-2xl"
              onClick={() => setFloor(f)}
            >
              Floor {f}
            </Button>
          ))}
        </div>
      </div>
    );

  /* -------- Bay Selection UI -------- */
  if (bay === null)
    return (
      <div className="container mx-auto p-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => setFloor(null)}
        >
          <X className="h-4 w-4 mr-2" /> Back to Floor Selection
        </Button>
        <BaySelector
          floor={floor}
          selectedBay={bay}
          onSelect={setBay}
        />
      </div>
    );

  /* -------- main menu UI -------- */
  // Get unique categories using a different approach to avoid Set iteration issues
  const categories = items
    .map(i => i.category)
    .filter((cat, index, self) => self.indexOf(cat) === index);
  
  // Filter items by category and search query
  const filteredItems = items
    .filter(i => !selectedCategory || i.category === selectedCategory)
    .filter(i => !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const total = calculateTotal();

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="w-full md:w-2/3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              Floor {floor} - Bay {bay}
            </h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setBay(null)}
            >
              Change Bay
            </Button>
          </div>

          {/* Search and filter bar */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menu items..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!selectedCategory ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("")}
              >
                All
              </Button>
              {categories.map((c) => (
                <Button
                  key={c}
                  variant={selectedCategory === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>

          {/* Items grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card key={item.square_id} className="card-hover">
                <CardHeader className="pb-2">
                  <h3 className="font-medium text-md line-clamp-2">{item.name}</h3>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-xl font-bold">${(item.price_cents / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      setSelectedItem(item);
                      setItemQuantity(1);
                      setModalOpen(true);
                    }}
                  >
                    Add to Order
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="w-full md:w-1/3 md:sticky md:top-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Order Summary
                </h3>
                {Object.keys(cart).length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearCart}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {Object.entries(cart).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Your cart is empty
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(cart).map(([id, qty]) => {
                    const item = items.find((i) => i.square_id === id)!;
                    return (
                      <div key={id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="font-medium text-lg mr-2">
                              {qty}×
                            </span>
                            <div className="flex-1">
                              <div>{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ${(item.price_cents / 100).toFixed(2)} each
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-right font-medium w-20">
                            ${((item.price_cents * qty) / 100).toFixed(2)}
                          </span>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => editCartItem(id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-600"
                              onClick={() => removeFromCart(id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Separator className="my-4" />
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${(total / 100).toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full py-6 text-lg"
                disabled={sending || Object.keys(cart).length === 0}
                onClick={async () => {
                  if (sending || Object.keys(cart).length === 0) return;
                  
                  setSending(true);
                  try {
                    const payload = {
                      floor,
                      bay,
                      items: Object.entries(cart).map(([sid, qty]) => {
                        const itm = items.find((i) => i.square_id === sid)!;
                        return { id: itm.id, name: itm.name, price_cents: itm.price_cents, qty };
                      }),
                    };
                    
                    const resp = await fetch("/api/orders", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    }).then((r) => r.json());
                    
                    console.log("Square order:", resp.squareOrderId);
                    setCart({});
                    alert(`Order sent! Square ID: ${resp.squareOrderId}`);
                    // Optional: Navigate to kitchen view
                    // navigate("/kitchen");
                  } catch (err) {
                    console.error("Error sending order:", err);
                    alert("Error sending order. Please try again.");
                  } finally {
                    setSending(false);
                  }
                }}
              >
                {sending ? "SENDING..." : "SEND ORDER"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Add to Cart Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{editingItemId ? "Edit Item" : "Add to Order"}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <h3 className="text-lg font-bold mb-1">{selectedItem.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{selectedItem.category}</p>
                <p className="text-xl font-bold mb-6">${(selectedItem.price_cents / 100).toFixed(2)}</p>
                
                <div className="flex items-center justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                    disabled={itemQuantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="mx-4 text-2xl font-bold w-10 text-center">{itemQuantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setItemQuantity(itemQuantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setModalOpen(false);
                    setSelectedItem(null);
                    setItemQuantity(1);
                    setEditingItemId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (editingItemId) {
                      updateCartItemQuantity(editingItemId, itemQuantity);
                    } else {
                      addToCart(selectedItem, itemQuantity);
                    }
                  }}
                >
                  {editingItemId ? "Update" : "Add to Order"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { create } from 'zustand';
import { MenuItem } from '@shared/schema';
import { CartItem } from '@shared/types';

interface CartState {
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: number) => void;
  updateQuantity: (itemId: number, qty: number) => void;
  clearCart: () => void;
}

export const useCart = create<CartState>((set) => ({
  cart: [],
  
  addToCart: (item: MenuItem) => set((state) => {
    const existingItem = state.cart.find((cartItem) => cartItem.id === item.id);
    
    if (existingItem) {
      // Item exists, update quantity
      return {
        cart: state.cart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, qty: cartItem.qty + 1 }
            : cartItem
        ),
      };
    } else {
      // Item doesn't exist, add to cart
      return {
        cart: [
          ...state.cart,
          {
            id: item.id,
            name: item.name,
            price_cents: item.price_cents,
            qty: 1,
          },
        ],
      };
    }
  }),
  
  removeFromCart: (itemId: number) => set((state) => ({
    cart: state.cart.filter((item) => item.id !== itemId),
  })),
  
  updateQuantity: (itemId: number, qty: number) => set((state) => {
    if (qty <= 0) {
      // Remove item if quantity is 0 or negative
      return {
        cart: state.cart.filter((item) => item.id !== itemId),
      };
    }
    
    return {
      cart: state.cart.map((item) =>
        item.id === itemId ? { ...item, qty } : item
      ),
    };
  }),
  
  clearCart: () => set({ cart: [] }),
}));

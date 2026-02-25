import { createContext, useContext, useState, ReactNode } from 'react';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalXMR: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, quantity?: number) => {
    const p = product as any;
    const minQty = p.min_quantity ?? 1;
    const step = p.quantity_step ?? minQty;
    const addQty = quantity ?? minQty;

    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + addQty } : i
        );
      }
      return [...prev, { product, quantity: addQty }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const item = items.find((i) => i.product.id === productId);
    const p = item?.product as any;
    const minQty = p?.min_quantity ?? 1;
    if (quantity < minQty) return removeItem(productId);
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalXMR = items.reduce((sum, i) => sum + i.product.price_xmr * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalXMR }}>
      {children}
    </CartContext.Provider>
  );
};

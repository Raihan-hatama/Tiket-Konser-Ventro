import React, { createContext, useCallback, useContext, useState } from 'react';
import { CartItem } from '@/types';

interface CartContextValue {
  eventId: number | null;
  eventTitle: string;
  cart: CartItem[];
  setCheckout: (eventId: number, eventTitle: string, cart: CartItem[]) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [eventId, setEventId] = useState<number | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const setCheckout = useCallback(
    (id: number, title: string, items: CartItem[]) => {
      setEventId(id);
      setEventTitle(title);
      setCart(items);
    },
    []
  );

  const clear = useCallback(() => {
    setEventId(null);
    setEventTitle('');
    setCart([]);
  }, []);

  return (
    <CartContext.Provider value={{ eventId, eventTitle, cart, setCheckout, clear }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};

"use client";

import { useEffect, useCallback, useState } from "react";

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price?: number;
}

export interface Cart {
  items: CartItem[];
}

const CART_STORAGE_KEY = "shopping_cart";

function getInitialCart(): Cart {
  if (typeof window === "undefined") return { items: [] };
  const stored = localStorage.getItem(CART_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { items: [] };
    }
  }
  return { items: [] };
}

export function useCart() {
  const [cart, setCart] = useState<Cart>(getInitialCart);
  const [isMounted, setIsMounted] = useState(false);

  // helper: persist and broadcast cart to other hook instances/tabs
  const persistAndBroadcast = (newCart: Cart) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
        // dispatch asynchronously to avoid setState during another component's render
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("cart:update", { detail: newCart }),
          );
        }, 0);
      }
    } catch {
      // ignore storage errors
    }
  };

  // listen for cart updates broadcasted from other hook instances or tabs
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onUpdate = (e: Event) => {
      const ev = e as CustomEvent<Cart>;
      if (!ev?.detail) return;
      setCart(ev.detail);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== CART_STORAGE_KEY) return;
      if (!e.newValue) {
        setCart({ items: [] });
        return;
      }
      try {
        setCart(JSON.parse(e.newValue));
      } catch {
        setCart({ items: [] });
      }
    };

    window.addEventListener("cart:update", onUpdate as EventListener);
    window.addEventListener("storage", onStorage as EventListener);

    // mark mounted after listeners are attached (async to avoid sync setState in effect)
    setTimeout(() => setIsMounted(true), 0);

    return () => {
      window.removeEventListener("cart:update", onUpdate as EventListener);
      window.removeEventListener("storage", onStorage as EventListener);
    };
  }, []);

  const addItem = useCallback(
    (productId: string, productName: string, quantity: number = 1) => {
      setCart((prev) => {
        const existingItem = prev.items.find(
          (item) => item.productId === productId,
        );
        const next: Cart = existingItem
          ? {
              ...prev,
              items: prev.items.map((item) =>
                item.productId === productId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            }
          : {
              ...prev,
              items: [...prev.items, { productId, productName, quantity }],
            };
        persistAndBroadcast(next);
        return next;
      });
    },
    [],
  );

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => {
      const next = {
        ...prev,
        items: prev.items.filter((item) => item.productId !== productId),
      };
      persistAndBroadcast(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId);
        return;
      }
      setCart((prev) => {
        const next = {
          ...prev,
          items: prev.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item,
          ),
        };
        persistAndBroadcast(next);
        return next;
      });
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    const next = { items: [] };
    setCart(next);
    persistAndBroadcast(next);
  }, []);

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    isMounted,
  };
}

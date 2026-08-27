import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // Cargar carrito del localStorage al iniciar
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('hottie_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error('Error cargando carrito:', e);
    }
  }, []);

  // Guardar en localStorage cada vez que cambia el carrito
  useEffect(() => {
    try {
      localStorage.setItem('hottie_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Error guardando carrito:', e);
    }
  }, [cart]);

  const addToCart = (item, isService = false) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (i) => i.id === item.id && i.isService === isService
      );
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity = (updated[existingIndex].quantity || 1) + 1;
        return updated;
      }
      return [...prevCart, { ...item, quantity: 1, isService }];
    });
    setIsOpen(true); // Abre el panel del carrito al añadir
  };

  const removeFromCart = (id, isService = false) => {
    setCart((prevCart) =>
      prevCart.filter((item) => !(item.id === id && item.isService === isService))
    );
  };

  const updateQuantity = (id, isService, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id, isService);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id && item.isService === isService
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);

  const totalPrice = cart.reduce((acc, item) => {
    const price = item.price || (item.price_cents ? item.price_cents / 100 : 0);
    return acc + price * (item.quantity || 1);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        setIsOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

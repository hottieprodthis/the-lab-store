import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  obtenerDisponibilidad,
  limiteDeItem,
  anadirAlCarrito,
  cambiarCantidad,
  ajustarCarrito,
} from '../lib/disponibilidadClient';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  // Cupo semanal/mensual: cuántas plazas quedan de cada tipo. Sirve para que el
  // carrito no deje acumular más unidades de las que caben (null = no se sabe
  // todavía; en ese caso no se limita nada y manda el servidor al pagar).
  const [disp, setDisp] = useState(null);
  const [aviso, setAviso] = useState('');
  const cartRef = useRef([]);
  const dispRef = useRef(null);
  cartRef.current = cart;
  dispRef.current = disp;

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

  // Plazas disponibles: al cargar y cada vez que se abre el carrito.
  useEffect(() => {
    let activo = true;
    obtenerDisponibilidad().then((d) => {
      if (activo) setDisp(d);
    });
    return () => {
      activo = false;
    };
  }, [isOpen]);

  // Si el carrito ya traía más unidades de las que caben (un carrito guardado
  // de antes, o plazas que se agotaron mientras tanto), se recortan.
  useEffect(() => {
    if (!disp || cart.length === 0) return;
    const r = ajustarCarrito(cart, disp);
    if (r.cambiado) {
      cartRef.current = r.cart;
      setCart(r.cart);
      setAviso(r.aviso);
    }
  }, [disp, cart]);

  const aplicar = (r) => {
    cartRef.current = r.cart;
    setCart(r.cart);
    setAviso(r.aviso || '');
  };

  const addToCart = (item, isService = false) => {
    aplicar(anadirAlCarrito(cartRef.current, item, isService, dispRef.current));
    setIsOpen(true); // Abre el panel del carrito al añadir
  };

  const removeFromCart = (id, isService = false) => {
    aplicar({
      cart: cartRef.current.filter((item) => !(item.id === id && item.isService === isService)),
      aviso: '',
    });
  };

  const updateQuantity = (id, isService, quantity) => {
    aplicar(cambiarCantidad(cartRef.current, id, isService, quantity, dispRef.current));
  };

  const clearCart = () => {
    aplicar({ cart: [], aviso: '' });
  };

  // Máximo de unidades que admite un artículo del carrito ({ max, motivo }).
  const limiteDe = (item) => limiteDeItem(item, cart, disp);

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
        aviso,
        limiteDe,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

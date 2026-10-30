// Datos de una compra para los avisos de "compras recientes" de la web
// (components/AvisoCompras.js). Se guardan en purchases.aviso:
//   { nombre: solo el nombre de pila y SOLO si el cliente marcó la casilla,
//     pais: código del país desde el que pagó (lo da Stripe o PayPal) }
// Nunca apellidos, correo ni ubicación exacta.

export function nombreDePila(nombreCompleto) {
  const primero = String(nombreCompleto || '').trim().split(/\s+/)[0] || '';
  if (!primero) return null;
  // "ANTONIO" o "antonio" → "Antonio"
  return primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase();
}

// ¿Marcó el cliente la casilla? (cabecera x-mostrar-nombre, ver
// lib/cabecerasPago.js; en Stripe llega dentro de los metadatos).
export function aceptaMostrarNombre(req) {
  return req?.headers?.['x-mostrar-nombre'] === '1';
}

export function datosAviso({ acepta, nombreCompleto, pais }) {
  const codigo = /^[A-Z]{2}$/.test(String(pais || '').toUpperCase()) ? String(pais).toUpperCase() : null;
  return {
    nombre: acepta ? nombreDePila(nombreCompleto) : null,
    pais: codigo,
  };
}

// Ofertas por tiempo limitado (productos, servicios, clases y suscripción).
//
// La oferta se guarda en la propia fila (oferta_tipo, oferta_valor,
// oferta_inicio, oferta_fin; ver supabase/migrations/2026-10-23_ofertas.sql)
// y SOLO cuenta entre inicio y fin. Fuera de esas fechas todo vuelve solo al
// precio normal.
//
// aplicarOferta(fila) devuelve una copia de la fila con los precios ya
// rebajados (price_cents y el "price" de cada plan), así el resto de la web
// (fichas, tarjetas, carrito, PayPal y el cobro con tarjeta) usa el precio de
// oferta sin cambiar nada más. La copia lleva además:
//   fila.oferta = { fin, precio_original_cents }   (para el precio tachado)
//   plan.precio_original                            (en cada plan rebajado)
// Funciona igual en el navegador y en el servidor.

export const TIPOS_OFERTA = ['porcentaje', 'precio'];

// ¿La oferta está en vigor ahora mismo?
export function ofertaVigente(datos, ahora = new Date()) {
  if (!datos || !TIPOS_OFERTA.includes(datos.oferta_tipo)) return false;
  const inicio = datos.oferta_inicio ? new Date(datos.oferta_inicio) : null;
  const fin = datos.oferta_fin ? new Date(datos.oferta_fin) : null;
  if (!fin || Number.isNaN(fin.getTime())) return false;
  if (inicio && !Number.isNaN(inicio.getTime()) && ahora < inicio) return false;
  return ahora < fin;
}

// Precio rebajado (céntimos) a partir del normal. Si el resultado no es una
// rebaja de verdad (más caro, igual o negativo), se queda el normal.
export function precioRebajado(baseCents, tipo, valor) {
  const base = Math.round(Number(baseCents));
  const v = Number(valor);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(v)) return base;
  let nuevo = base;
  if (tipo === 'porcentaje') {
    if (v <= 0 || v >= 100) return base;
    nuevo = Math.round((base * (100 - v)) / 100);
  } else if (tipo === 'precio') {
    nuevo = Math.round(v * 100);
  }
  return nuevo >= 0 && nuevo < base ? nuevo : base;
}

export function aplicarOferta(fila, ahora = new Date()) {
  if (!fila || !ofertaVigente(fila, ahora)) return fila;
  const tipo = fila.oferta_tipo;
  const copia = { ...fila };
  let hayRebaja = false;

  if (Array.isArray(fila.plans) && fila.plans.length > 0) {
    copia.plans = fila.plans.map((plan) => {
      const base = Math.round(parseFloat(plan?.price) * 100);
      const valor = tipo === 'porcentaje' ? fila.oferta_valor : plan?.oferta_precio;
      if (valor === null || valor === undefined || valor === '') return plan;
      const nuevo = precioRebajado(base, tipo, valor);
      if (!(nuevo < base)) return plan;
      hayRebaja = true;
      return { ...plan, price: nuevo / 100, precio_original: plan.price };
    });
    // Igual que el panel de admin: el precio base es el del plan más barato.
    const precios = copia.plans.map((p) => Math.round(parseFloat(p?.price) * 100)).filter(Number.isFinite);
    if (hayRebaja && precios.length > 0) copia.price_cents = Math.min(...precios);
  } else if (typeof fila.price_cents === 'number' && fila.price_cents > 0) {
    const nuevo = precioRebajado(fila.price_cents, tipo, fila.oferta_valor);
    if (nuevo < fila.price_cents) {
      copia.price_cents = nuevo;
      hayRebaja = true;
    }
  }

  if (!hayRebaja) return fila;
  copia.oferta = { fin: fila.oferta_fin, precio_original_cents: fila.price_cents };
  return copia;
}

// Para listas de filas.
export function aplicarOfertas(filas, ahora = new Date()) {
  return Array.isArray(filas) ? filas.map((f) => aplicarOferta(f, ahora)) : filas;
}

// Suscripción: la oferta se guarda en settings (clave "subscription_offer")
// como { oferta_tipo, oferta_valor, oferta_inicio, oferta_fin }. Devuelve el
// precio a pagar (céntimos) y, si hay oferta, el original y la fecha de fin.
export function leerOfertaSuscripcion(valorAjuste) {
  if (!valorAjuste) return null;
  if (typeof valorAjuste === 'object') return valorAjuste;
  try {
    return JSON.parse(valorAjuste);
  } catch (e) {
    return null;
  }
}

export function precioSuscripcion(precioCents, oferta, ahora = new Date()) {
  if (!oferta || !ofertaVigente(oferta, ahora)) return { cents: precioCents, oferta: null };
  const nuevo = precioRebajado(precioCents, oferta.oferta_tipo, oferta.oferta_valor);
  if (!(nuevo < precioCents)) return { cents: precioCents, oferta: null };
  return { cents: nuevo, oferta: { fin: oferta.oferta_fin, precio_original_cents: precioCents } };
}

// Fecha guardada (ISO) -> valor del calendario "datetime-local" (hora local
// del navegador), para los formularios del admin.
export function aInputFecha(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dosCifras = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}T${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`;
}

// Un precio de oferta tiene que ser menor que el normal y 0 (gratis) o de al
// menos 0,50 €, que es lo mínimo que cobra Stripe.
export function precioOfertaValido(euros, normalEuros) {
  return Number.isFinite(euros) && euros >= 0 && euros < normalEuros && (euros === 0 || euros >= 0.5);
}

// "Oferta hasta el 30/11 a las 23:59" (hora de España).
export function textoFinOferta(fin) {
  const d = new Date(fin);
  if (Number.isNaN(d.getTime())) return '';
  const fecha = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Madrid' });
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
  return `Oferta hasta el ${fecha} a las ${hora}`;
}

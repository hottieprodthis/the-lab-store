// Ayudas del NAVEGADOR para el cupo semanal de servicios y clases (la lógica
// real está en lib/limiteSemanal.js y se aplica en el servidor).

let cache = { momento: 0, promesa: null };

// Qué hay disponible esta semana. Se reutiliza la misma respuesta durante unos
// segundos para que una página con muchas tarjetas no haga una petición por
// tarjeta. Devuelve null si no se pudo consultar (en ese caso no se bloquea
// nada).
export function obtenerDisponibilidad() {
  const ahora = Date.now();
  if (cache.promesa && ahora - cache.momento < 10000) return cache.promesa;

  cache.momento = ahora;
  cache.promesa = fetch('/api/disponibilidad')
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return cache.promesa;
}

// ¿Está bloqueada la compra de este artículo esta semana?
//   tipo: 'servicio' | 'clase'
//   cupo: el tipo de cupo del artículo o de su plan ('corta' | 'larga' |
//         'libre' | ''), tal y como se marca en el panel de admin.
// Devuelve { agotado, motivo }.
export function bloqueoPara(disp, tipo, cupo) {
  const libre = { agotado: false, motivo: '' };
  if (!disp || cupo === 'libre') return libre;

  let bloque = null;
  if (tipo === 'servicio') bloque = disp.servicios;
  else if (tipo === 'clase' && cupo === 'corta') bloque = disp.clases?.corta;
  else if (tipo === 'clase' && cupo === 'larga') bloque = disp.clases?.larga;

  if (!bloque || bloque.disponible !== false) return libre;
  return { agotado: true, motivo: bloque.motivo || 'Esta semana ya no quedan plazas.' };
}

// Comprobación previa al cobro con PayPal: si el pedido no cabe, avisa con un
// alert y devuelve false para que NO se abra el pago. Ante cualquier error de
// red deja pasar (nunca bloquea una venta por un fallo de comprobación).
//   items: [{ tipo: 'clase'|'servicio'|'producto', id, name, quantity }]
export async function permitirPago(items) {
  const relevantes = (Array.isArray(items) ? items : []).filter(
    (i) => i && (i.tipo === 'clase' || i.tipo === 'servicio')
  );
  // Un pedido sin servicios ni clases (solo productos) no tiene límite.
  if (relevantes.length === 0) return true;

  try {
    const res = await fetch('/api/disponibilidad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: relevantes }),
    });
    const data = await res.json();
    if (data && data.ok === false) {
      alert(data.message || 'Esta semana ya no quedan plazas.');
      return false;
    }
    return true;
  } catch (err) {
    return true;
  }
}

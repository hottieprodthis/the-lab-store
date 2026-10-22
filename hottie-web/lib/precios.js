// Precio REAL de un artículo, calculado en el servidor con los datos de la
// base de datos (nunca con el precio que manda el navegador, que el cliente
// podría cambiar). Lo usa pages/api/checkout.js.

// Los artículos de plan llevan en el carrito un id "uuid-nombre-del-plan",
// hecho con esta misma regla (pages/servicios/[slug].js, pages/clases/[slug].js).
export function slugPlan(nombre) {
  return String(nombre).toLowerCase().replace(/\s+/g, '-');
}

// Separa un id del carrito en el uuid real y el trozo del plan (si lo hay).
export function partirIdCarrito(id) {
  const match = String(id || '').match(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:-(.+))?$/);
  if (!match) return { uuid: id ? String(id) : null, planSlug: null };
  return { uuid: match[1], planSlug: match[2] || null };
}

// Busca el plan elegido dentro de la fila (por nombre exacto o por el trozo
// del id del carrito). Devuelve null si no se pide plan, o undefined si se
// pide uno que no existe.
export function buscarPlan(fila, { planName, planSlug } = {}) {
  if (!planName && !planSlug) return null;
  const planes = Array.isArray(fila?.plans) ? fila.plans : [];
  const plan = planes.find((p) =>
    p && typeof p.name === 'string' &&
    ((planName && p.name === planName) || (planSlug && slugPlan(p.name) === planSlug))
  );
  return plan || undefined;
}

// Precio en céntimos de la fila (o de su plan).
export function precioCentimos(fila, plan) {
  if (plan) {
    const euros = parseFloat(plan.price);
    return Number.isFinite(euros) && euros > 0 ? Math.round(euros * 100) : 0;
  }
  const cents = Number(fila?.price_cents);
  return Number.isFinite(cents) && cents > 0 ? Math.round(cents) : 0;
}

// Nombre que se guarda y se cobra: "Nombre" o "Nombre (Plan)".
export function nombreConPlan(fila, plan) {
  const base = fila?.name || fila?.title || fila?.nombre || '';
  return plan ? `${base} (${plan.name})` : base;
}

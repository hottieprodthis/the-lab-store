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
//         'seguimiento' | 'libre' | ''), tal y como se marca en el panel de
//         admin.
// Devuelve { agotado, motivo }.
export function bloqueoPara(disp, tipo, cupo) {
  const libre = { agotado: false, motivo: '' };
  if (!disp || cupo === 'libre') return libre;

  let bloque = null;
  // El seguimiento (servicio o clase) tiene su propio cupo mensual.
  if (cupo === 'seguimiento') bloque = disp.seguimiento;
  else if (tipo === 'servicio') bloque = disp.servicios;
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

// ---------------------------------------------------------------------------
// Cupos dentro del CARRITO
// ---------------------------------------------------------------------------
// El carrito no deja acumular más unidades de las que quedan disponibles:
//  - si no hay reservas todavía, deja todas las que permita el cupo;
//  - si ya quedan pocas, deja solo las que quedan;
//  - una clase de 12 h y las clases sueltas no se pueden mezclar en el pedido.
// Es solo una ayuda para el cliente: la comprobación que manda es la del
// servidor (api/checkout.js y api/disponibilidad.js).

const NOMBRES = {
  servicios: { uno: 'servicio', varios: 'servicios', periodo: 'por semana', cuando: 'esta semana' },
  corta: { uno: 'clase suelta', varios: 'clases sueltas', periodo: 'por semana', cuando: 'esta semana' },
  larga: { uno: 'clase de 12 horas', varios: 'clases de 12 horas', periodo: 'por semana', cuando: 'esta semana' },
  seguimiento: { uno: 'seguimiento', varios: 'seguimientos', periodo: 'al mes', cuando: 'este mes' },
};

// "Máximo 1 clase de 12 horas por semana." (vacío si no se conoce el máximo)
function textoRegla(grupo, limite) {
  if (typeof limite !== 'number' || limite < 1) return '';
  const n = NOMBRES[grupo];
  return `Máximo ${limite} ${limite === 1 ? n.uno : n.varios} ${n.periodo}.`;
}

// A qué cupo pertenece un artículo del carrito (null = sin límite).
// "isClass" tiene prioridad sobre "isService", igual que en checkout.js.
export function grupoDeCupo(item) {
  if (!item) return null;
  const cupo = item.cupo || '';
  if (cupo === 'libre') return null;
  if (cupo === 'seguimiento') return 'seguimiento';
  if (item.isClass) return cupo === 'corta' ? 'corta' : cupo === 'larga' ? 'larga' : null;
  if (item.isService) return 'servicios';
  return null;
}

// Plazas que quedan en cada cupo (0 si está bloqueado; null si no se sabe).
export function plazasPorGrupo(disp) {
  const plazas = (bloque) => {
    if (!bloque) return null;
    if (bloque.disponible === false) return 0;
    return typeof bloque.remaining === 'number' ? bloque.remaining : null;
  };
  return {
    servicios: plazas(disp?.servicios),
    corta: plazas(disp?.clases?.corta),
    larga: plazas(disp?.clases?.larga),
    seguimiento: plazas(disp?.seguimiento),
  };
}

function mismoArticulo(a, id, isService) {
  return a.id === id && a.isService === isService;
}

function unidadesEnGrupo(cart, grupo, excepto) {
  let total = 0;
  for (const i of cart) {
    if (excepto && mismoArticulo(i, excepto.id, excepto.isService)) continue;
    if (grupoDeCupo(i) === grupo) total += Number(i.quantity) || 1;
  }
  return total;
}

function bloqueDe(disp, grupo) {
  if (grupo === 'servicios') return disp?.servicios;
  if (grupo === 'corta') return disp?.clases?.corta;
  if (grupo === 'larga') return disp?.clases?.larga;
  return disp?.seguimiento;
}

// Máximo de unidades que admite ESE artículo en el carrito, teniendo en cuenta
// lo que ya hay de su mismo cupo. Devuelve { max, motivo, regla }; max =
// Infinity si no tiene tope. "motivo" explica por qué se llegó al tope y
// "regla" es la norma general ("Máximo 4 clases sueltas por semana.").
export function limiteDeItem(item, cart, disp) {
  const sinTope = { max: Infinity, motivo: '', regla: '' };
  const grupo = grupoDeCupo(item);
  if (!grupo || !disp) return sinTope;

  const lista = Array.isArray(cart) ? cart : [];

  // Una clase de 12 h y las clases sueltas no se mezclan en el mismo pedido.
  const opuesto = grupo === 'corta' ? 'larga' : grupo === 'larga' ? 'corta' : null;
  if (opuesto && unidadesEnGrupo(lista, opuesto) > 0) {
    const limLarga = disp?.clases?.larga?.limit;
    const limCorta = disp?.clases?.corta?.limit;
    const detalle =
      typeof limLarga === 'number' && typeof limCorta === 'number'
        ? `: la clase de 12 horas (máximo ${limLarga} por semana) o clases sueltas (máximo ${limCorta} por semana)`
        : '';
    return {
      max: 0,
      motivo: `No se puede reservar a la vez una clase de 12 horas y clases sueltas en la misma semana. Elige solo un tipo${detalle}.`,
      regla: textoRegla(grupo, bloqueDe(disp, grupo)?.limit),
    };
  }

  const plazas = plazasPorGrupo(disp)[grupo];
  if (plazas === null || plazas === undefined) return sinTope;

  const n = NOMBRES[grupo];
  const regla = textoRegla(grupo, bloqueDe(disp, grupo)?.limit);

  if (plazas <= 0) {
    return {
      max: 0,
      motivo: bloqueDe(disp, grupo)?.motivo || `No quedan plazas de ${n.varios} ${n.cuando}.`,
      regla,
    };
  }

  const otras = unidadesEnGrupo(lista, grupo, item);
  const limite = bloqueDe(disp, grupo)?.limit;
  const quedan = plazas === 1 ? 'queda 1 plaza' : `quedan ${plazas} plazas`;
  const motivo =
    typeof limite === 'number' && limite >= 1
      ? `Solo ${quedan} ${n.cuando} (el máximo es ${limite} ${limite === 1 ? n.uno : n.varios} ${n.periodo}).`
      : `Solo ${quedan} de ${n.varios} ${n.cuando}.`;
  return { max: Math.max(0, plazas - otras), motivo, regla };
}

// Añade UNA unidad al carrito si cabe. Devuelve { cart, aviso } (aviso vacío
// si se añadió sin problema). No modifica el carrito original.
export function anadirAlCarrito(cart, item, isService, disp) {
  const actual = Array.isArray(cart) ? cart : [];
  const idx = actual.findIndex((i) => mismoArticulo(i, item.id, isService));
  const candidato = idx > -1 ? actual[idx] : { ...item, quantity: 1, isService };
  const cantidadNueva = (idx > -1 ? Number(actual[idx].quantity) || 1 : 0) + 1;

  const { max, motivo } = limiteDeItem(candidato, actual, disp);
  if (cantidadNueva > max) {
    return { cart: actual, aviso: motivo || 'No quedan más plazas disponibles.' };
  }

  const nuevo =
    idx > -1
      ? actual.map((i, n) => (n === idx ? { ...i, quantity: (Number(i.quantity) || 1) + 1 } : i))
      : [...actual, { ...item, quantity: 1, isService }];
  return { cart: nuevo, aviso: '' };
}

// Cambia la cantidad de un artículo (0 o menos = quitarlo). Si piden más de lo
// que cabe, se queda en lo máximo permitido y se explica por qué.
export function cambiarCantidad(cart, id, isService, quantity, disp) {
  const actual = Array.isArray(cart) ? cart : [];
  if (quantity <= 0) {
    return { cart: actual.filter((i) => !mismoArticulo(i, id, isService)), aviso: '' };
  }
  const idx = actual.findIndex((i) => mismoArticulo(i, id, isService));
  if (idx === -1) return { cart: actual, aviso: '' };

  const cantidadActual = Number(actual[idx].quantity) || 1;
  let q = quantity;
  let aviso = '';
  if (q > cantidadActual) {
    const { max, motivo } = limiteDeItem(actual[idx], actual, disp);
    if (q > max) {
      q = Math.max(cantidadActual, max);
      aviso = motivo;
    }
  }
  if (q === cantidadActual) return { cart: actual, aviso };
  return { cart: actual.map((i, n) => (n === idx ? { ...i, quantity: q } : i)), aviso };
}

// Recorta las cantidades que ya estén por encima del cupo (por ejemplo un
// carrito guardado de antes, o plazas que se han agotado mientras tanto).
// No quita artículos: si no cabe ni una unidad, se deja tal cual y la pantalla
// lo avisa (el servidor rechazará el pago con el motivo).
export function ajustarCarrito(cart, disp) {
  const actual = Array.isArray(cart) ? cart.slice() : [];
  let cambiado = false;
  const avisos = [];
  for (let n = 0; n < actual.length; n++) {
    const { max, motivo } = limiteDeItem(actual[n], actual, disp);
    const q = Number(actual[n].quantity) || 1;
    if (max >= 1 && q > max) {
      actual[n] = { ...actual[n], quantity: max };
      cambiado = true;
      avisos.push(motivo);
    }
  }
  return {
    cart: cambiado ? actual : cart,
    cambiado,
    aviso: cambiado ? `${avisos[0]} Hemos ajustado la cantidad en tu carrito.` : '',
  };
}

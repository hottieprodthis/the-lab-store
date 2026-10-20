// Cupo semanal de SERVICIOS y CLASES (solo servidor).
//
// Se usa desde pages/api/checkout.js (rechaza un pedido que no cabe, antes de
// cobrar), pages/api/disponibilidad.js (fichas, listados y carrito saben si
// hay plazas) y pages/api/admin/limites.js (panel de admin).
//
// REGLAS (acordadas con Hottie):
//  - La semana es natural, de lunes a domingo, en hora de España.
//  - Solo cuentan las compras de pago (purchases.amount > 0): los pedidos
//    gratuitos (0 €) no gastan plaza ni se bloquean.
//  - SERVICIOS: un máximo de servicios por semana (por defecto 5). Un
//    servicio marcado como "libre" (por ejemplo el Seguimiento) no cuenta.
//  - CLASES: cada clase (o cada plan de una clase) se marca en el panel como
//      · "corta"  = CLASE SUELTA (una sola sesión individual, dure 1 h,
//                   2 h o lo que sea) -> máximo 4 por semana
//      · "larga"  = PACK DE 12 HORAS (4 sesiones de 3 h) -> máximo 1 por semana
//      · "libre"  = no entra en el cupo (por ejemplo el Seguimiento)
//      · sin marcar = tampoco entra en el cupo
//    Las clases sueltas y el pack de 12 h SE EXCLUYEN ENTRE SÍ dentro de la
//    misma semana: si hay un pack de 12 h reservado no se pueden reservar
//    sueltas, y si hay alguna suelta reservada no se puede reservar el pack.
//    El nombre interno "corta" se mantiene por compatibilidad con lo ya
//    guardado en la base de datos.
//  - Los límites se guardan en la tabla "settings" que ya existe (igual que
//    el precio de la suscripción). Si no hay valor guardado, se usa el valor
//    por defecto. 0 = no aceptar compras de ese tipo esa semana.

const TZ = 'Europe/Madrid';

export const CLAVE_LIMITE_SERVICIOS = 'weekly_limit_services';
export const CLAVE_LIMITE_CORTAS = 'weekly_limit_classes_short';
export const CLAVE_LIMITE_LARGAS = 'weekly_limit_classes_long';

export const LIMITES_POR_DEFECTO = { servicios: 5, cortas: 4, largas: 1 };

// ---------------------------------------------------------------------------
// Semana natural en hora de España
// ---------------------------------------------------------------------------

function partesEnMadrid(fecha) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const p = {};
  for (const parte of f.formatToParts(fecha)) p[parte.type] = parte.value;
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    weekday: p.weekday,
    h: Number(p.hour),
    mi: Number(p.minute),
    s: Number(p.second),
  };
}

// Instante UTC exacto de las 00:00 de un día concreto en hora de España
// (tiene en cuenta el cambio de hora de verano/invierno).
function medianocheMadridAUtc(y, m, d) {
  const deseado = Date.UTC(y, m - 1, d, 0, 0, 0);
  let utc = deseado;
  for (let i = 0; i < 3; i++) {
    const p = partesEnMadrid(new Date(utc));
    const pared = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
    utc -= pared - deseado;
  }
  return new Date(utc);
}

const INDICE_DIA = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

// Semana natural actual: del lunes 00:00 al lunes siguiente 00:00 (hora de
// España). "ahora" solo se pasa en las pruebas.
export function semanaActual(ahora = new Date()) {
  const p = partesEnMadrid(ahora);
  const indice = INDICE_DIA[p.weekday] ?? 0;

  const lunes = new Date(Date.UTC(p.y, p.m - 1, p.d - indice));
  const lunesSiguiente = new Date(Date.UTC(p.y, p.m - 1, p.d - indice + 7));

  const desde = medianocheMadridAUtc(lunes.getUTCFullYear(), lunes.getUTCMonth() + 1, lunes.getUTCDate());
  const hasta = medianocheMadridAUtc(
    lunesSiguiente.getUTCFullYear(),
    lunesSiguiente.getUTCMonth() + 1,
    lunesSiguiente.getUTCDate()
  );

  // Texto para el cliente: "lunes 26 de octubre".
  const partesTexto = {};
  for (const parte of new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(hasta)) {
    partesTexto[parte.type] = parte.value;
  }
  const renovacion = `${partesTexto.weekday} ${partesTexto.day} de ${partesTexto.month}`;

  return { desde, hasta, renovacion };
}

// ---------------------------------------------------------------------------
// Límites guardados
// ---------------------------------------------------------------------------

function aNumeroValido(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

// Devuelve { guardados, efectivos }. "guardados" = lo que hay en la base de
// datos (null si no hay nada); "efectivos" = lo que se aplica de verdad
// (el guardado o, si no hay, el valor por defecto).
export async function leerLimites(supabase) {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', [CLAVE_LIMITE_SERVICIOS, CLAVE_LIMITE_CORTAS, CLAVE_LIMITE_LARGAS]);

  if (error) throw new Error(`No se pudieron leer los límites: ${error.message}`);

  const guardados = { servicios: null, cortas: null, largas: null };
  for (const fila of data || []) {
    const n = aNumeroValido(fila.value);
    if (fila.key === CLAVE_LIMITE_SERVICIOS) guardados.servicios = n;
    if (fila.key === CLAVE_LIMITE_CORTAS) guardados.cortas = n;
    if (fila.key === CLAVE_LIMITE_LARGAS) guardados.largas = n;
  }

  const efectivos = {
    servicios: guardados.servicios ?? LIMITES_POR_DEFECTO.servicios,
    cortas: guardados.cortas ?? LIMITES_POR_DEFECTO.cortas,
    largas: guardados.largas ?? LIMITES_POR_DEFECTO.largas,
  };
  return { guardados, efectivos };
}

// ---------------------------------------------------------------------------
// Tipo de cupo de cada servicio / clase / plan
// ---------------------------------------------------------------------------

// Valores válidos: 'corta' (2 h), 'larga' (12 h), 'libre' (no cuenta) o ''.
export function normalizarCupo(valor) {
  return valor === 'corta' || valor === 'larga' || valor === 'libre' ? valor : '';
}

// Tipo de cupo de lo que se compró, dada la fila de la tabla (services o
// classes) y el título con el que se compró ("Nombre" o "Nombre (Plan)").
// El plan, si tiene tipo propio, manda sobre el de la clase.
export function cupoDeItem(fila, titulo) {
  if (!fila) return '';
  const base = normalizarCupo(fila.cupo);
  const nombre = String(fila.name || '').trim();
  const t = String(titulo || '').trim();
  if (!t || t === nombre) return base;

  const planes = Array.isArray(fila.plans) ? fila.plans : [];
  const candidatos = planes.map((p) => ({
    nombre: `${nombre} (${String(p?.name || '').trim()})`,
    cupo: normalizarCupo(p?.cupo) || base,
  }));

  const exacto = candidatos.find((c) => c.nombre === t);
  if (exacto) return exacto.cupo;

  // Los nombres que llegan desde Stripe se recortan a 60 caracteres.
  if (t.length >= 60) {
    const porPrefijo = candidatos.filter((c) => c.nombre.startsWith(t));
    if (porPrefijo.length === 1) return porPrefijo[0].cupo;
  }
  return base;
}

// Mapa "nombre completo comprado" -> tipo de cupo, para clasificar las
// compras ya hechas (que solo guardan el nombre).
function construirMapa(filas) {
  const mapa = new Map();
  for (const fila of filas || []) {
    const nombre = String(fila.name || '').trim();
    if (!nombre) continue;
    const base = normalizarCupo(fila.cupo);
    mapa.set(nombre, base);
    for (const plan of Array.isArray(fila.plans) ? fila.plans : []) {
      const nombrePlan = String(plan?.name || '').trim();
      if (!nombrePlan) continue;
      mapa.set(`${nombre} (${nombrePlan})`, normalizarCupo(plan?.cupo) || base);
    }
  }
  return mapa;
}

// undefined = no se reconoce ese nombre (por ejemplo porque se renombró).
function buscarCupo(mapa, nombre) {
  const t = String(nombre || '').trim();
  if (mapa.has(t)) return mapa.get(t);
  if (t.length >= 60) {
    const claves = [...mapa.keys()].filter((k) => k.startsWith(t));
    if (claves.length === 1) return mapa.get(claves[0]);
  }
  return undefined;
}

async function cargarFilas(supabase) {
  // select('*') a propósito: así sigue funcionando aunque la columna "cupo"
  // todavía no exista en la base de datos.
  const [clases, servicios] = await Promise.all([
    supabase.from('classes').select('*'),
    supabase.from('services').select('*'),
  ]);
  if (clases.error) throw new Error(`No se pudieron leer las clases: ${clases.error.message}`);
  if (servicios.error) throw new Error(`No se pudieron leer los servicios: ${servicios.error.message}`);
  return { clases: clases.data || [], servicios: servicios.data || [] };
}

// ---------------------------------------------------------------------------
// Uso de la semana
// ---------------------------------------------------------------------------

// Cuenta las unidades vendidas (de pago) en el rango: servicios que cuentan,
// clases cortas (2 h) y clases largas (12 h).
export async function contarVendidas(supabase, desde, hasta, filas) {
  const mapaServicios = construirMapa(filas.servicios);
  const mapaClases = construirMapa(filas.clases);
  const total = { servicios: 0, cortas: 0, largas: 0 };
  const TAMANO_PAGINA = 1000;

  for (let inicio = 0; ; inicio += TAMANO_PAGINA) {
    const { data, error } = await supabase
      .from('purchases')
      .select('items')
      .gt('amount', 0)
      .gte('created_at', desde.toISOString())
      .lt('created_at', hasta.toISOString())
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(inicio, inicio + TAMANO_PAGINA - 1);

    if (error) throw new Error(`No se pudieron contar las ventas: ${error.message}`);

    for (const compra of data || []) {
      if (!Array.isArray(compra.items)) continue;
      for (const articulo of compra.items) {
        const cantidad = Number(articulo?.quantity) || 1;
        if (articulo?.type === 'servicio') {
          // Un servicio sin reconocer cuenta (lo normal); solo "libre" no.
          if (buscarCupo(mapaServicios, articulo.name) !== 'libre') total.servicios += cantidad;
        } else if (articulo?.type === 'clase') {
          const cupo = buscarCupo(mapaClases, articulo.name);
          if (cupo === 'corta') total.cortas += cantidad;
          if (cupo === 'larga') total.largas += cantidad;
        }
      }
    }

    if (!data || data.length < TAMANO_PAGINA) break;
  }
  return total;
}

// Estado completo de la semana actual.
export async function estadoSemana(supabase) {
  const { desde, hasta, renovacion } = semanaActual();
  const [{ guardados, efectivos }, filas] = await Promise.all([
    leerLimites(supabase),
    cargarFilas(supabase),
  ]);
  const usadas = await contarVendidas(supabase, desde, hasta, filas);
  return { limites: efectivos, guardados, usadas, renovacion, filas };
}

// ---------------------------------------------------------------------------
// Disponibilidad (lo que ven las fichas y el carrito)
// ---------------------------------------------------------------------------

function textoPlazas(n) {
  return n === 1 ? '1 plaza' : `${n} plazas`;
}

export function calcularDisponibilidad(estado) {
  const { limites, usadas, renovacion } = estado;

  const remServicios = Math.max(0, limites.servicios - usadas.servicios);
  const remCortas = Math.max(0, limites.cortas - usadas.cortas);
  const remLargas = Math.max(0, limites.largas - usadas.largas);

  const servicios = {
    limit: limites.servicios,
    used: usadas.servicios,
    remaining: remServicios,
    disponible: remServicios > 0,
    motivo:
      remServicios > 0
        ? ''
        : `Esta semana ya no quedan plazas de servicios. Se reabren el ${renovacion}.`,
  };

  let motivoCorta = '';
  if (usadas.largas > 0) {
    motivoCorta = `Esta semana ya hay una clase de 12 horas reservada, por eso no hay clases sueltas disponibles. Se reabren el ${renovacion}.`;
  } else if (remCortas <= 0) {
    motivoCorta = `Esta semana ya no quedan plazas de clases sueltas. Se reabren el ${renovacion}.`;
  }
  const corta = {
    limit: limites.cortas,
    used: usadas.cortas,
    remaining: remCortas,
    disponible: motivoCorta === '',
    motivo: motivoCorta,
  };

  let motivoLarga = '';
  if (usadas.cortas > 0) {
    motivoLarga = `Esta semana ya hay clases sueltas reservadas, por eso no se puede reservar la clase de 12 horas. Se reabre el ${renovacion}.`;
  } else if (remLargas <= 0) {
    motivoLarga = `Esta semana ya no quedan plazas de la clase de 12 horas. Se reabren el ${renovacion}.`;
  }
  const larga = {
    limit: limites.largas,
    used: usadas.largas,
    remaining: remLargas,
    disponible: motivoLarga === '',
    motivo: motivoLarga,
  };

  return { servicios, clases: { corta, larga }, renovacion };
}

// ---------------------------------------------------------------------------
// Comprobación de un pedido concreto
// ---------------------------------------------------------------------------

// Extrae el UUID real de un id de carrito ("uuid-nombredelplan"), igual que
// hace pages/api/checkout.js.
function extraerIdReal(id) {
  if (!id) return null;
  const m = String(id).match(/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
  return m ? m[1] : String(id);
}

// Convierte los artículos de un pedido [{ tipo, id, name, quantity }] en
// unidades por tipo de cupo: { servicios, cortas, largas }. El tipo de cupo
// se lee SIEMPRE de la base de datos (id + nombre/plan), nunca de lo que
// mande el navegador.
export async function resumirPedido(supabase, items) {
  const resumen = { servicios: 0, cortas: 0, largas: 0 };
  const cache = new Map();

  for (const item of (Array.isArray(items) ? items : []).slice(0, 50)) {
    if (item?.tipo !== 'clase' && item?.tipo !== 'servicio') continue;
    const tabla = item.tipo === 'clase' ? 'classes' : 'services';
    const id = extraerIdReal(item.id);
    if (!id) continue;

    const clave = `${tabla}:${id}`;
    if (!cache.has(clave)) {
      const { data } = await supabase.from(tabla).select('*').eq('id', id).single();
      cache.set(clave, data || null);
    }
    const fila = cache.get(clave);
    if (!fila) continue;

    const cantidad = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const cupo = cupoDeItem(fila, item.name);

    if (item.tipo === 'servicio') {
      if (cupo !== 'libre') resumen.servicios += cantidad;
    } else if (cupo === 'corta') {
      resumen.cortas += cantidad;
    } else if (cupo === 'larga') {
      resumen.largas += cantidad;
    }
  }
  return resumen;
}

// Comprueba si un pedido ({ servicios, cortas, largas }) cabe en lo que queda
// de semana. Devuelve { ok, message }.
export function comprobarPedido(estado, pedido) {
  const disp = calcularDisponibilidad(estado);
  const { servicios = 0, cortas = 0, largas = 0 } = pedido || {};
  const mensajes = [];

  if (servicios > 0) {
    if (disp.servicios.remaining <= 0) {
      mensajes.push(disp.servicios.motivo);
    } else if (servicios > disp.servicios.remaining) {
      mensajes.push(
        `Esta semana solo ${disp.servicios.remaining === 1 ? 'queda' : 'quedan'} ${textoPlazas(disp.servicios.remaining)} de servicios y has pedido ${servicios}. Quita alguna del pedido o espera al ${disp.renovacion}.`
      );
    }
  }

  if (cortas > 0 && largas > 0) {
    mensajes.push(
      'No se puede reservar a la vez una clase de 12 horas y clases sueltas en la misma semana. Elige solo un tipo.'
    );
  } else if (cortas > 0) {
    if (!disp.clases.corta.disponible) {
      mensajes.push(disp.clases.corta.motivo);
    } else if (cortas > disp.clases.corta.remaining) {
      mensajes.push(
        `Esta semana solo ${disp.clases.corta.remaining === 1 ? 'queda' : 'quedan'} ${textoPlazas(disp.clases.corta.remaining)} de clases sueltas y has pedido ${cortas}. Quita alguna del pedido o espera al ${disp.renovacion}.`
      );
    }
  } else if (largas > 0) {
    if (!disp.clases.larga.disponible) {
      mensajes.push(disp.clases.larga.motivo);
    } else if (largas > disp.clases.larga.remaining) {
      mensajes.push(
        `Esta semana solo ${disp.clases.larga.remaining === 1 ? 'queda' : 'quedan'} ${textoPlazas(disp.clases.larga.remaining)} de la clase de 12 horas y has pedido ${largas}. Quita alguna del pedido o espera al ${disp.renovacion}.`
      );
    }
  }

  return mensajes.length === 0
    ? { ok: true, message: '' }
    : { ok: false, message: mensajes.join(' ') };
}

// Nombres de clases activas que NO tienen tipo de cupo (ni ellas ni alguno
// de sus planes): no entran en el límite hasta que se marquen en el panel.
export function clasesSinTipo(filasClases) {
  const nombres = [];
  for (const c of filasClases || []) {
    if (c.active === false) continue;
    const base = normalizarCupo(c.cupo);
    const planes = Array.isArray(c.plans) ? c.plans : [];
    const sinTipo =
      planes.length > 0
        ? planes.some((p) => !(normalizarCupo(p?.cupo) || base))
        : !base;
    if (sinTipo) nombres.push(c.name);
  }
  return nombres;
}

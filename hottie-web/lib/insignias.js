// Insignias de los clientes (área de clientes y panel de admin):
//   - por antigüedad de la cuenta,
//   - por número de compras pagadas (sin contar la suscripción),
//   - y la especial de "miembro de por vida".
// Cada una dice también cuánto falta para la siguiente, para animar a subir.

const NIVELES_ANTIGUEDAD = [
  { meses: 0, nombre: 'Nuevo', emoji: '🌱' },
  { meses: 6, nombre: 'De la casa', emoji: '🏠' },
  { meses: 24, nombre: 'Veterano', emoji: '🏆' },
];

const NIVELES_COMPRAS = [
  { compras: 1, nombre: 'Primera compra', emoji: '🎧' },
  { compras: 5, nombre: 'Cliente frecuente', emoji: '🔥' },
  { compras: 10, nombre: 'Cliente VIP', emoji: '💎' },
];

function mesesDesde(fecha, ahora = new Date()) {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return 0;
  let meses = (ahora.getFullYear() - d.getFullYear()) * 12 + (ahora.getMonth() - d.getMonth());
  if (ahora.getDate() < d.getDate()) meses -= 1;
  return Math.max(0, meses);
}

function textoMeses(n) {
  if (n >= 12 && n % 12 === 0) return n === 12 ? '1 año' : `${n / 12} años`;
  return n === 1 ? '1 mes' : `${n} meses`;
}

// { nombre, emoji, falta } — "falta" es el texto para la siguiente (o null).
export function insigniaAntiguedad(desde, ahora = new Date()) {
  const meses = mesesDesde(desde, ahora);
  let i = 0;
  NIVELES_ANTIGUEDAD.forEach((n, idx) => {
    if (meses >= n.meses) i = idx;
  });
  const actual = NIVELES_ANTIGUEDAD[i];
  const siguiente = NIVELES_ANTIGUEDAD[i + 1];
  return {
    nombre: actual.nombre,
    emoji: actual.emoji,
    falta: siguiente ? `${textoMeses(siguiente.meses - meses)} para ${siguiente.emoji} ${siguiente.nombre}` : null,
  };
}

// null si aún no ha comprado nada.
export function insigniaCompras(compras) {
  const n = Math.max(0, Number(compras) || 0);
  let actual = null;
  let siguiente = NIVELES_COMPRAS[0];
  NIVELES_COMPRAS.forEach((nivel, idx) => {
    if (n >= nivel.compras) {
      actual = nivel;
      siguiente = NIVELES_COMPRAS[idx + 1] || null;
    }
  });
  const faltan = siguiente ? siguiente.compras - n : 0;
  const falta = siguiente ? `${faltan === 1 ? '1 compra' : `${faltan} compras`} para ${siguiente.emoji} ${siguiente.nombre}` : null;
  return actual ? { nombre: actual.nombre, emoji: actual.emoji, falta } : { nombre: null, emoji: null, falta };
}

export const INSIGNIA_POR_VIDA = { nombre: 'Miembro de por vida', emoji: '⭐' };

export const TEXTO_NIVELES = {
  antiguedad: NIVELES_ANTIGUEDAD.map((n) => `${n.emoji} ${n.nombre} (${n.meses === 0 ? 'al crear la cuenta' : `desde ${textoMeses(n.meses)}`})`),
  compras: NIVELES_COMPRAS.map((n) => `${n.emoji} ${n.nombre} (${n.compras} ${n.compras === 1 ? 'compra' : 'compras'})`),
};

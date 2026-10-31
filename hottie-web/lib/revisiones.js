// Revisión de temas del área de clientes (textos y opciones compartidos entre
// la página del cliente, el panel y pages/api/area/revision.js).

// Lo estándar es lo mismo que en los servicios: WAV 24-bit / 48 kHz o MP3 a
// 320 kbps. Se deja elegir otras para saber qué archivo es.
export const CALIDADES = [
  'WAV 24-bit / 48 kHz (recomendado)',
  'MP3 320 kbps (recomendado)',
  'WAV 24-bit / 44,1 kHz',
  'WAV 16-bit / 44,1 kHz',
  'WAV 32-bit flotante',
  'AIFF o FLAC',
  'MP3 de menos de 320 kbps',
  'Otra (cuéntanoslo en la nota)',
];

// Cuando el cupo del mes ya se ha llenado.
export const MENSAJE_CUPO_LLENO = {
  titulo: '¡Uy! Este mes ya volaron todas las revisiones 🏃‍♂️💨',
  texto:
    'Las revisiones gratis de este mes se han agotado: había más ganas de feedback que café en el estudio. El día 1 se abre el cupo otra vez, así que pon una alarma y manda tu tema de los primeros. Tu canción se merece que esta vez corras un poquito más. 😉',
};

// Cupo total al mes si el admin no ha puesto otro (ajuste "review_quota").
export const CUPO_REVISIONES_DEFECTO_PANEL = 30;

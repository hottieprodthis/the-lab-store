/** @type {import('next').NextConfig} */

// Páginas privadas o de paso que no deben salir en Google (inicio de sesión,
// área de clientes, páginas tras pagar, bajas…). El panel /admin y /api ya
// los excluye robots.txt.
const PRIVADAS = [
  '/admin/:path*',
  '/area-cliente',
  '/login',
  '/reset-password',
  '/gracias',
  '/briefing',
  '/servicios/briefing',
  '/servicios/exito',
  '/clases/briefing',
  '/baja',
  '/boletin/:path*',
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        // Protecciones básicas en toda la web.
        source: '/:path*',
        headers: [
          // Que ninguna otra web pueda meter la tuya dentro de la suya.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Que el navegador no "adivine" el tipo de los archivos.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Al salir a otra web, no contarle la dirección completa de la que viene.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // La web no usa cámara, micrófono ni ubicación.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      ...PRIVADAS.map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ];
  },
};

module.exports = nextConfig;

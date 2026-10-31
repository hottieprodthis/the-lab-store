# Instrucciones para Claude — web The Lab Store

## Sobre el dueño
- No es programador. Explicar todo en español, en lenguaje sencillo y sin jerga.
- Quiere la máxima precisión: separar lo comprobado de lo estimado, comprobar antes de afirmar y avisar cuando no haya certeza.

## Guardado automático (regla fija)
- Después de **cada** cambio terminado, guardarlo en GitHub sin esperar a que lo pida:
  commit con un mensaje claro en español + `git push origin main`.
- Antes de hacer push, traer lo último de GitHub (`git fetch origin main` y rebase si hace falta),
  porque el dueño trabaja desde varios dispositivos.
- No dejar nunca cambios sin guardar al terminar una respuesta.
- Al terminar, decirle en una línea qué se ha guardado.

## Importante: guardar = publicar
- Vercel está conectado a la rama `main`: cada push se publica en la web real en un par de minutos.
- Por eso, antes de cada push, revisar el cambio con cuidado y, cuando sea posible, comprobar que el proyecto compila
  (`cd hottie-web && npm install && npm run build`). Si no se puede comprobar, decirlo.
- Después del push, si hay acceso a Vercel, comprobar que el despliegue termina en READY y avisar si falla.
- Si un cambio es arriesgado (pagos, cobros, Stripe, PayPal, base de datos), explicárselo y pedir confirmación antes de guardarlo.

## Estructura
- El código de la web está en `hottie-web/` (Next.js + Supabase + Stripe/PayPal, alojado en Vercel).
- Las carpetas del escritorio del Acer ("claude pag web", "pag web guardados") son copias antiguas: no usarlas.

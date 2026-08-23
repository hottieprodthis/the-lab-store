# The Lab — web de Hottie

Web propia (Next.js) con tienda, servicios y un panel `/admin` para
añadir/editar/borrar productos y servicios sin tocar código.

## 1. Súbelo a tu repositorio de GitHub

Ya tienes `hottieprodthis/the-lab-store` vacío y conectado a Vercel. Formas de subir estos archivos:

**Opción fácil (sin terminal):**
1. Entra en `github.com/hottieprodthis/the-lab-store`
2. Botón "Add file" → "Upload files"
3. Arrastra **todo el contenido** de esta carpeta (no la carpeta en sí, su contenido) y haz commit.

**Opción con terminal**, dentro de esta carpeta:
```
git init
git add .
git commit -m "Primera versión de la web"
git branch -M main
git remote add origin https://github.com/hottieprodthis/the-lab-store.git
git push -u origin main
```

En cuanto hagas push, Vercel detectará el cambio y empezará a construir la web automáticamente.

## 2. Crea las tablas en Supabase

1. Ve a tu proyecto en supabase.com → **SQL Editor**
2. Abre el archivo `supabase/schema.sql` de este proyecto, copia todo su contenido y pégalo ahí
3. Pulsa **Run**

Esto crea las tablas `products` y `services`, el almacén de imágenes, y las reglas de seguridad (cualquiera puede ver lo publicado; solo tú, con sesión iniciada, puedes editar).

## 3. Crea tu usuario de administrador

1. Supabase → **Authentication** → **Users** → **Add user**
2. Pon tu correo y una contraseña segura → marca "Auto Confirm User"
3. Con ese correo/contraseña entrarás en `tudominio.com/admin`

## 4. Variables de entorno en Vercel

Vercel → tu proyecto → **Settings → Environment Variables**. Añade estas (marca "Production", "Preview" y "Development" en las tres):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://khfrxgbonelpajnecnwe.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (la que ya me diste) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | (la que ya me diste, `pk_live_...`) |
| `STRIPE_SECRET_KEY` | **Tu clave secreta de Stripe** (`sk_live_...`). La encuentras en dashboard.stripe.com → Developers → API keys. **No la compartas conmigo ni la subas a GitHub** — solo va en Vercel. |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | (la que ya me diste) |
| `NEXT_PUBLIC_SITE_URL` | `https://tudominio.com` (o la URL que te dé Vercel mientras tanto, tipo `https://the-lab-store.vercel.app`) |

Después de añadirlas, en Vercel → **Deployments** → botón "..." del último deploy → **Redeploy**, para que las cargue.

> ⚠️ Estás usando claves de Stripe **en modo real (`live`)**, así que los cobros de prueba se cobrarán de verdad. Si quieres probar sin riesgo, usa temporalmente las claves de **test** de Stripe (`pk_test_...` / `sk_test_...`) y cámbialas por las `live` cuando esté todo probado.

## 5. Empieza a añadir contenido

Entra en `tudominio.com/admin`, inicia sesión, y usa "+ Añadir" en Productos o Servicios. Cada uno tiene: nombre, descripción, precio, imagen (se sube directamente) y, en productos, un enlace de descarga que se muestra al comprador tras pagar.

## Estructura del proyecto

```
pages/            → páginas públicas y del panel
components/        → piezas reutilizables (tarjetas, formularios, navegación)
lib/                → conexión a Supabase y utilidades
supabase/schema.sql → definición de la base de datos
pages/api/checkout.js → crea el pago con Stripe
```

## Desarrollo en local (opcional)

```
npm install
cp .env.local.example .env.local   # y rellena tus claves ahí
npm run dev
```

## Cómo pedirme cambios en el futuro

Puedes pedirme en el chat cosas como "cambia el color de acento", "añade una sección de reseñas", "conecta el formulario de contacto a un email real", etc. — te iré dando los archivos o ediciones concretas para que subas a GitHub.

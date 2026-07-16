# Better Work

Plataforma que conecta personas que necesitan un servicio con trabajadores y empresas. Experiencia inspirada en Uber: simple, rápida y clara. Funciona como **PWA instalable** y como app web, con una sola base de código.

## Stack

- **Next.js 16** (App Router, Server Components + Server Actions, Turbopack)
- **Prisma 6 + PostgreSQL (Supabase)**
- **Supabase Storage** — fotos de perfil, galerías y feed
- **Tailwind CSS 4** — diseño minimalista blanco/negro/grises
- **Leaflet + OpenStreetMap (tiles CARTO)** — mapa sin API keys
- **JWT (jose) en cookie httpOnly** + bcryptjs para autenticación
- **PWA**: `public/manifest.json` + `public/sw.js` (instalable, cache básico offline)

## Correr el proyecto

```bash
npm install
cp .env.example .env     # completá DATABASE_URL y AUTH_SECRET
npm run dev
```

El esquema ya está aplicado en Supabase. Si arrancás una base nueva:
`npx prisma migrate dev --name init` y opcionalmente `node prisma/seed.mjs` (datos demo).

## Cuentas de prueba (contraseña: `demo1234`)

| Rol | Email |
|---|---|
| Admin | admin@betterwork.app |
| Cliente | cliente@demo.com |
| Trabajador | jorge.paredes@demo.com (y 11 más) |
| Empresa | empresa@demo.com |

## Producción

La app usa **PostgreSQL (Supabase)** y **Supabase Storage** para las imágenes.

### Ya está hecho
- Proyecto Supabase **Better Work** (`oulwejxaorrosqlexnnz`, región `sa-east-1`) con el
  esquema completo aplicado (20 tablas + índices + claves foráneas).
- **RLS activo sin políticas** en todas las tablas: la API pública de Supabase no expone
  datos. La app se conecta por Postgres directo (Prisma), que no pasa por RLS.
- Bucket público **`uploads`** (8 MB, solo imágenes) para fotos de perfil, galerías y feed.
- Datos iniciales: 12 categorías de oficios, configuración por defecto (comisión 5 %,
  plan empresa $25.000, publicidad 7/15/30 días) y el usuario Super Admin.

### Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → **Database** → Connection string → **Transaction pooler** (reemplazá `[YOUR-PASSWORD]`) |
| `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://oulwejxaorrosqlexnnz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → **API Keys** → `service_role` (secreta) |
| `NEXT_PUBLIC_SITE_URL` | La URL pública del sitio (para OG/robots/sitemap) |

> Sin `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, las imágenes caen a
> `/public/uploads` (sirve en local; **no** en Vercel, que tiene filesystem efímero).

### Deploy
1. Subí el repo a GitHub (`git remote add origin … && git push -u origin main`).
2. En Vercel: **Add New → Project → Import** el repo (framework Next.js se autodetecta).
3. Cargá las variables de arriba y deployá. El `build` ya corre `prisma generate`.

Si más adelante cambiás el esquema: `npx prisma migrate dev` en local y
`npm run db:deploy` (`prisma migrate deploy`) contra producción.

### Pagos
Hoy hay un proveedor **simulado** en `src/lib/payments/` (aprueba todo, no mueve dinero real).
Para cobrar de verdad, implementá la interfaz `PaymentProvider` (p. ej. Mercado Pago) y
activala en `src/lib/payments/index.ts`. El resto de la app no cambia.

## Funcionalidades

- **Roles**: Cliente, Trabajador, Empresa y Admin.
- **Pantalla principal**: mapa protagonista con trabajadores (marcadores negros), patrocinados (★) y empresas (🏢); buscador y categorías flotantes; panel “Cerca tuyo”.
- **Búsqueda**: por texto, categoría, ciudad; filtros de calificación, distancia, experiencia, verificados; orden por rating/distancia/trabajos/experiencia. Patrocinados aparecen primero.
- **Perfil del trabajador**: foto (o avatar de iniciales), profesión, experiencia, servicios, galería, zona+radio, horarios, métodos de cobro, alias MP, WhatsApp, precios orientativos, rango, reseñas y mapa.
- **Flujo del trabajo (estilo Uber)**: Solicitud → Aceptada → En camino → Trabajando → Finalizado. Al aceptar se generan **código de inicio** y **código de finalización** de 4 dígitos: el cliente los comparte en persona y el trabajador los ingresa. El código final libera el pago, habilita calificaciones y actualiza el historial.
- **Pagos**: “por Better Work” (retiene comisión configurable, demo sin gateway real) o directo (efectivo/transferencia/MP del trabajador).
- **Chat interno**: texto, fotos (URL), ubicación, archivos y presupuestos; polling cada 3 s; no leídos.
- **Reputación**: calificación mutua 1–5 + puntualidad/calidad/comunicación/cumplimiento; promedio en perfiles.
- **Rangos**: Principiante → Bronce → Plata → Oro → Platino → Diamante → Elite (trabajos + rating − cancelaciones), con barra de progreso.
- **Monetización**: comisión por pagos (config en admin) y promoción de perfiles (7/30/90 días) y de ofertas laborales.
- **Empresas**: perfil, publicar/pausar/promocionar ofertas, gestionar postulaciones (aceptar/rechazar/chat).
- **Admin** (`/admin`): métricas, comisión, usuarios (verificar/suspender), categorías, denuncias, ingresos por comisiones y publicidad.

## Estructura

```
prisma/            schema + seed
src/lib/           db, auth (JWT), rank, geo, format
src/lib/actions/   server actions (auth, jobs, chat, offers, admin, profile)
src/components/    UI compartida (Map, ChatThread, WorkerCard, …)
src/app/           landing, login/register, (app)/ rutas autenticadas, admin/, api/chat
```

## Nota para producción

- Cambiar `AUTH_SECRET` y migrar `DATABASE_URL` a PostgreSQL.
- Integrar Mercado Pago real (checkout + split de comisión) donde hoy el pago es simulado.
- Subida real de imágenes (hoy la galería/avatar aceptan URLs).

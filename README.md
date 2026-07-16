# Better Work

Plataforma que conecta personas que necesitan un servicio con trabajadores y empresas. Experiencia inspirada en Uber: simple, rápida y clara. Funciona como **PWA instalable** y como app web, con una sola base de código.

## Stack

- **Next.js 16** (App Router, Server Components + Server Actions, Turbopack)
- **Prisma 6 + SQLite** (desarrollo; el schema es portable a PostgreSQL/Supabase cambiando el datasource)
- **Tailwind CSS 4** — diseño minimalista blanco/negro/grises
- **Leaflet + OpenStreetMap (tiles CARTO)** — mapa sin API keys
- **JWT (jose) en cookie httpOnly** + bcryptjs para autenticación
- **PWA**: `public/manifest.json` + `public/sw.js` (instalable, cache básico offline)

## Correr el proyecto

```bash
npm install
npx prisma migrate dev   # crea prisma/dev.db
node prisma/seed.mjs     # datos de demo
npm run dev
```

## Cuentas de prueba (contraseña: `demo1234`)

| Rol | Email |
|---|---|
| Admin | admin@betterwork.app |
| Cliente | cliente@demo.com |
| Trabajador | jorge.paredes@demo.com (y 11 más) |
| Empresa | empresa@demo.com |

## Publicar en producción (Vercel + PostgreSQL)

Esta app usa SQLite en desarrollo. **SQLite no funciona en Vercel** (filesystem efímero),
así que en producción hay que usar PostgreSQL y almacenamiento externo para las imágenes.

1. **Base de datos**: creá una PostgreSQL (Supabase / Neon / Vercel Postgres) y copiá su `DATABASE_URL`.
2. En `prisma/schema.prisma` cambiá `provider = "sqlite"` por `provider = "postgresql"`.
3. Regenerá las migraciones para Postgres: borrá `prisma/migrations/` y corré, con `DATABASE_URL` apuntando a la nueva base:
   ```bash
   npx prisma migrate dev --name init
   node prisma/seed.mjs   # opcional: datos demo / categorías + admin
   ```
4. **Variables de entorno** (en Vercel → Settings → Environment Variables):
   - `DATABASE_URL` — la de PostgreSQL.
   - `AUTH_SECRET` — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - `NEXT_PUBLIC_SITE_URL` — la URL pública (para OG/robots/sitemap).
5. **Imágenes**: hoy se guardan en `public/uploads` (efímero en Vercel). Migrá `src/lib/upload.ts`
   a Supabase Storage / S3 (es el único archivo a tocar) o usá un servidor propio con disco persistente.
6. **Pagos**: hoy hay un proveedor simulado en `src/lib/payments/`. Para cobros reales, implementá
   la interfaz `PaymentProvider` (p. ej. Mercado Pago) y activala en `src/lib/payments/index.ts`.
7. Deploy: conectá el repo a Vercel. El `build` ya corre `prisma generate`; para aplicar migraciones
   usá `npm run db:deploy` (`prisma migrate deploy`) en el paso de build o post-deploy.

> Alternativa self-hosted: en un VPS/Docker con Node y disco persistente, SQLite y `public/uploads`
> funcionan tal cual; solo definí `AUTH_SECRET` y `NEXT_PUBLIC_SITE_URL`.

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

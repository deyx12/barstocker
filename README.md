# BarStocker Web

Sistema web para gestionar inventario, ventas, proveedores, usuarios y reportes de bares. Incluye autenticacion con Supabase Auth, control de acceso por roles y reglas de negocio para descontar inventario al confirmar ventas.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + componentes estilo shadcn/ui
- Prisma ORM + Supabase PostgreSQL
- Supabase Auth
- Zod + React Hook Form
- TanStack Table
- Sonner
- Lucide React
- Vitest
- Playwright
- Vercel


## Instalacion

```bash
npm install
npm run db:generate
```

## Ejecucion Local

```bash
npm run dev
```

Abre `http://localhost:3000`.

## Prisma

Crear/aplicar migraciones en desarrollo:

```bash
npm run db:migrate
```

Aplicar migraciones en despliegue:

```bash
npm run db:deploy
```

Ejecutar seed:

```bash
npm run db:seed
```

El seed crea:

- 1 administrador
- 1 vendedor
- 3 proveedores
- 8 productos de bar
- ventas y movimientos de inventario de ejemplo
- productos con bajo stock y agotados

## Usuarios De Prueba

- Administrador: `admin@barstocker.com`
- Vendedor: `vendedor@barstocker.com`
- Contrasena para ambos: `BarStocker123!`

Si `SUPABASE_SERVICE_ROLE_KEY` esta configurada, el seed crea estos usuarios en Supabase Auth. Si no, crealos manualmente con la misma contrasena; la app vincula el perfil por correo al iniciar sesion.

## Pruebas

Unitarias:

```bash
npm test
```

E2E:

```bash
npx playwright install
npm run test:e2e
```

Las pruebas e2e de login/productos se omiten automaticamente si faltan `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Puedes sobreescribir credenciales con `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD`.

## Roles

- `ADMIN`: acceso total a dashboard, productos, inventario, ventas, historial, proveedores, reportes y usuarios.
- `VENDEDOR`: dashboard limitado, productos en lectura, inventario en lectura, ventas e historial. No accede a usuarios, proveedores ni reportes.

## Supuestos De Primera Version

- La moneda visual es COP.
- Los usuarios se autentican en Supabase Auth y se administran como perfiles en `UserProfile`.
- No se eliminan usuarios; se inactivan.
- Los productos con ventas o movimientos se inactivan en lugar de eliminarse.
- Los reportes exportan CSV; PDF queda fuera de esta version.

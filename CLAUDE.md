# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Resttek: plataforma de gestión de restaurantes. Monorepo con npm workspaces (`packages/*`): una API Express 5 + TypeScript sobre SQLite y cuatro paquetes Angular 21 (`web-admin`, `web-empleados`, `web-clientes` y la librería `web-shared`). La documentación del proyecto está en español y vive en `docs/` (arquitectura, glosario, modelo de datos).

## Comandos

Todo se lanza desde la raíz:

```bash
npm install            # una sola vez; linkea los workspaces (@resttek/web-shared)
npm run seed           # datos de prueba (idempotente, INSERT OR IGNORE)
npm run dev:api        # API en :3000 (tsx watch)
npm run dev:admin      # :4200
npm run dev:empleados  # :4201
npm run dev:clientes   # :4202
npm test               # vitest de la API (única suite de tests del repo)
```

- Test individual: `cd packages/api && npx vitest run <ruta-o-patrón>` (p. ej. `npx vitest run LoginUseCase`). Modo watch: `npm run test:watch` en `packages/api`.
- No hay lint configurado. Los frontends solo tienen `ng build`/`ng serve` (sin tests definidos).
- Los frontends hacen proxy de `/api` → `http://localhost:3000` (`proxy.conf.json`). Los puertos deben coincidir con los del README; si el 3000 está ocupado la API no arranca.
- Cambios en `web-shared` no se recargan solos: hay que reiniciar el dev server del frontend.
- Credenciales de seed: la contraseña de cada usuario es su propio email (`admin@resttek.com`, `gerente1@…`, `cocinero1@…`, `camarero1@…`, `cliente1@…`; lista completa en el README).
- Las rutas de la API llevan prefijo `/api/v1` (p. ej. `POST /api/v1/auth/login`); el README a veces dice `/api/...` sin versión. `/health` está fuera del prefijo.

## Arquitectura de la API (`packages/api/src`)

Conviven **dos estilos**; hay que saber cuál aplica antes de tocar código:

- **Hexagonal + DDD solo en `contexts/employee/`** (domain → application → infrastructure). `Employee` es la única entidad con comportamiento (constructor privado + `create()`, value objects `Email` y `Role`). El cableado de dependencias está en `infrastructure/http/dependencies.ts`.
- **Por capas en `restaurant`, `dish`, `ingredient`, `order`**: carpetas transversales `models/`, `repositories/`, `services/`, `controllers/`, `routes/`, un fichero por dominio. Aquí las entidades son interfaces planas y la validación vive en servicios y en funciones del modelo. Los mocks de repositorio están en `repositories/mocks/`.

Path aliases (en `tsconfig.json`): `@employee/*`, `@shared/*` (= `contexts/shared`), `@config/*`, `@errors/*`, `@routes/*`, `@controllers/*`, `@services/*`, `@repositories/*`, `@models/*`, `@scripts/*`. Los imports llevan extensión `.js` (ESM).

La BD es `packages/api/resttek.db` (SQLite); con `NODE_ENV=test` usa `:memory:`. Las tablas se crean al iniciar el servidor. Los errores de dominio están en `errors/DomainErrors.ts` y los traduce `contexts/shared/infrastructure/http/errorHandler.ts`.

## Dominio: particularidades fáciles de pasar por alto

- **Los clientes son `Employee`**: no hay tabla de clientes, son filas de `employees` con `role='cliente'` y `restaurant_id=null`. El login es el mismo endpoint para todos y la respuesta usa la clave `employee` incluso para clientes.
- Roles: `admin`, `manager` (en la UI "gerente"), `cocinero`, `camarero`, `cliente`.
- **Cada unidad pedida es un `OrderItem`** (3 unidades → 3 filas con `quantity: 1`) para que cocina cambie el estado de cada una. Estados: `pendiente → preparando → listo → entregado`.
- La restricción por rol en `web-empleados` es solo de menú; las vistas son accesibles por URL con cualquier sesión. La autorización real la hace el middleware `authorize()` de la API.
- Unidades de ingrediente válidas: `kg`, `g`, `l`, `ml`, `unidad` (`normalizeIngredientUnit()` rechaza abreviaturas).

## Arquitectura de los frontends

Angular 21 con standalone components, signals, zoneless (sin `zone.js`) y guards/interceptors funcionales. Auth, interceptors y componentes comunes están en `@resttek/web-shared`; ninguna app tiene `shared/` propia.

- `web-admin` y `web-empleados`: features autocontenidas (`models/`, `pages/`, `services/`, `store/`). Estado con **stores** (`providedIn: 'root'`, signals privadas expuestas en solo lectura, HTTP envuelto en `firstValueFrom`).
- `web-clientes`: estructura distinta; modelos, servicios y `cart.store.ts` en `core/`, features como componentes sueltos, y los componentes consumen los `Observable` con `.subscribe()` directamente. El componente raíz se llama `App`, no `AppComponent`.

## Otros

- `docs/api/` contiene el contrato OpenAPI (`openapi.yaml`) y su HTML (`index.html`). Si cambias un endpoint, actualiza el YAML y regenera el HTML (comando en `docs/arquitectura/arquitectura-api.md`, sección Endpoints; o usa la skill `generate-openapi`).
- `docs/revisiones/` recoge inconsistencias conocidas entre código y documentación (backend y frontend); consúltalo antes de fiarte de un detalle de `docs/`.
- `scripts/seed-issues.sh` crea issues de GitHub desde `scripts/issues.json` (requiere `gh` y `jq`); ver `scripts/README.md`.

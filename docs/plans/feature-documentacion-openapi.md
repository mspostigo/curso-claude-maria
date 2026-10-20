# Plan: Documentación OpenAPI de la API

**Tipo:** feature

## Objetivo

Definir en `docs/api/openapi.yaml` (OpenAPI 3) todo el contrato de la API del backend (29 operaciones: 28 rutas de Express más `GET /health`) y generar `docs/api/index.html`, una documentación HTML autocontenida, para poder publicarla. No se modifica código de `packages/api/src`; queda fuera servir la documentación desde la propia API (p. ej. `/docs`) y generar el YAML automáticamente desde el código.

> Estado de partida: `docs/api/openapi.yaml` e `index.html` ya existen (generados con la skill `generate-openapi`). Las tareas los **revisan, completan y validan** contra el código; no se rehacen desde cero.

## Tareas

### Inventario

- [x] 1. Listar las rutas reales con `packages/api/src/app.ts` y `routes/*.routes.ts` + `contexts/employee/infrastructure/http/*.routes.ts`, y comprobar que cada una tiene su `path` + método en `docs/api/openapi.yaml`. Resultado: tabla ruta-código ↔ operación-YAML sin huecos (28 rutas + `/health` = 29).
- [x] 2. Verificar la seguridad de cada operación frente a los middlewares (`authenticate`, `authorize([...])`) y que los roles de la `description` coinciden. Resultado: endpoints públicos con `security: []`, resto con `bearerAuth`.

### Esquemas y respuestas

- [x] 3. Contrastar los cuerpos de petición con controllers/services (`AuthController`, `EmployeeController`, `restaurant`, `dish`, `ingredient`, `order`): campos obligatorios, validaciones y enums (`Role`, `DishCategory`, `IngredientUnit`, `OrderStatus`). Resultado: `components/schemas` sin campos inventados ni omitidos.
- [x] 4. Contrastar las respuestas y códigos de error con `errorHandler.ts` y `OrderController` (400/401/403/404/500 y sus formatos, incl. que `PATCH .../status` devuelve 400 y no 404). Resultado: cada operación documenta solo los códigos que el código puede devolver.
- [x] 5. Confirmar con el código (`order.repository.ts`) qué devuelve `GET /api/v1/orders/active` y ajustar su `description`. Resultado: descripción respaldada por el código.

### Generación y verificación

- [x] 6. Validar y regenerar el HTML: `source ~/.nvm/nvm.sh && npx --yes @redocly/cli@latest lint docs/api/openapi.yaml && npx --yes @redocly/cli@latest build-docs docs/api/openapi.yaml -o docs/api/index.html`. Resultado: lint sin errores y `index.html` actualizado con el título "Resttek API".
- [x] 7. Comprobar contra la API real (`npm run dev:api`, puerto 3000) 3 endpoints con `curl`: `POST /api/v1/auth/login`, `GET /api/v1/public/restaurants` y `POST /api/v1/orders` con token. Resultado: respuestas con la forma descrita en el YAML. *(Verificación manual; no aplica TDD.)*
- [x] 8. Documentar cómo regenerar la documentación (comando de la tarea 6) en `docs/arquitectura/arquitectura-api.md` y enlazar `docs/api/` desde `CLAUDE.md`. Resultado: instrucciones visibles para el equipo.

## Criterios de aceptación

- [x] `docs/api/openapi.yaml` existe, es OpenAPI 3.x y `npx @redocly/cli lint` termina sin errores.
- [x] El nº de operaciones del YAML (`grep -cE "^    (get|post|put|patch|delete):"`) es 29, igual a las rutas del código más `/health`.
- [x] Todas las rutas llevan el prefijo `/api/v1` salvo `/health`, y las rutas públicas (`/auth/login`, `/auth/register`, `/public/**`, `/health`) tienen `security: []`.
- [x] Cada operación no pública indica sus roles en la descripción y documenta 401 y, si usa `authorize`, 403.
- [x] `docs/api/index.html` existe, no está vacío, contiene "Resttek API" y se abre en el navegador sin servidor.
- [x] `POST /api/v1/auth/login` con `admin@resttek.com` y su contraseña devuelve 200 con `token` y `employee`, como describe el YAML; con credenciales erróneas devuelve 401 `InvalidCredentialsError`.
- [x] No hay cambios en `packages/api/src` ni nuevas dependencias en ningún `package.json`.
- [x] `npm test` sigue pasando.

## Fuera de alcance

- Servir la documentación desde Express o añadir `swagger-ui-express`.
- Traducir los mensajes de error de la API (siguen en inglés).
- Corregir las inconsistencias de comportamiento detectadas (p. ej. `OrderNotFoundError` como 400); solo se documentan.

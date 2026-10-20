---
name: generate-openapi
description: Genera la documentación OpenAPI 3 de la API de Resttek; produce docs/api/openapi.yaml con todos los endpoints del backend y docs/api/index.html con la documentación navegable. Úsala cuando el usuario pida crear, regenerar o actualizar el openapi.yaml o la documentación HTML de la API.
argument-hint: "[opcional: ruta de salida, por defecto docs/api]"
allowed-tools: Read, Glob, Grep, Edit, Write, Bash
---

Genera la documentación OpenAPI de la API. Salida en `$ARGUMENTS` (por defecto `docs/api/`).

**Resultado esperado**

1. `docs/api/openapi.yaml`: OpenAPI 3.0/3.1 que define **toda** la API del backend.
2. `docs/api/index.html`: documentación HTML autocontenida generada desde ese YAML.

Lee `CLAUDE.md` antes de empezar. Toda la descripción del contrato va **en español**. **Node:** si `node` no está en el PATH, antepón `source ~/.nvm/nvm.sh &&` a los comandos `node`/`npm`/`npx`.

## 1. Inventariar los endpoints (la fuente de verdad es el código)

No te fíes de `README.md` ni de `docs/`: consulta `docs/revisiones/inconsistencias-backend.md` y contrasta siempre con el código.

1. Lee `packages/api/src/app.ts`: cada `app.use('<prefijo>', router)` da el prefijo de montaje (`/api/v1/...`). Ojo con los prefijos con parámetros (`/restaurants/:restaurantId/dishes`). `GET /health` está **fuera** de `/api/v1`.
2. Para cada router lee su fichero de rutas y anota `método + ruta completa + middlewares`:
   - Por capas: `packages/api/src/routes/*.routes.ts`.
   - Hexagonal: `packages/api/src/contexts/employee/infrastructure/http/*.routes.ts`.
3. Convierte los parámetros Express `:id` a OpenAPI `{id}`.
4. Seguridad por endpoint, según middlewares:
   - sin middleware o ruta `public` → sin autenticación (`security: []`).
   - `authenticate` → `bearerAuth` (JWT).
   - `authorize(...roles)` → bearerAuth y roles permitidos en la `description` (`admin`, `manager`, `cocinero`, `camarero`, `cliente`).
5. Contrasta el nº de endpoints del YAML con el nº de rutas del código al final (paso 5).

## 2. Extraer esquemas de petición y respuesta

Para cada endpoint abre su controller y su service/use case:

- **Request:** campos del `req.body`, `req.query`, `req.params`; obligatorios vs opcionales; validaciones (formato de email, unidades de ingrediente `kg|g|l|ml|unidad`, enums de roles y estados de `OrderItem`: `pendiente|preparando|listo|entregado`).
- **Response:** código de éxito (`200`, `201`, `204`…) y forma exacta del JSON (qué clave envuelve el dato; p. ej. el login devuelve `employee` también para clientes). Mira los modelos en `models/` y las entidades/value objects de `contexts/employee/`.
- **Errores:** mapea las clases de `errors/DomainErrors.ts` a códigos HTTP leyendo `contexts/shared/infrastructure/http/errorHandler.ts`. Define una respuesta y un esquema `Error` reutilizables en `components`.
- Detalles de dominio que deben reflejarse: cada unidad pedida es un `OrderItem` con `quantity: 1`; los clientes son `Employee` con `role='cliente'` y `restaurant_id=null`.

Si algo del código es ambiguo, documenta el comportamiento real, no el deseado, y anótalo en el informe final.

## 3. Escribir `openapi.yaml`

Crea `docs/api/openapi.yaml` con esta estructura:

```yaml
openapi: 3.0.3
info:
  title: Resttek API
  version: 1.0.0          # tomar de packages/api/package.json
  description: Plataforma de gestión de restaurantes.
servers:
  - url: http://localhost:3000
    description: Desarrollo local
tags: []                  # un tag por dominio: Auth, Employees, Restaurants, Dishes, Ingredients, Orders, Public, Health
paths: {}
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  schemas: {}             # modelos + Error + cuerpos de entrada (CreateX / UpdateX)
  parameters: {}          # restaurantId, id, orderId, itemId reutilizables
  responses: {}           # BadRequest, Unauthorized, Forbidden, NotFound, Conflict
```

Reglas:

- Rutas con la **ruta completa** (`/api/v1/...`), salvo `/health`. Alternativa válida: `servers.url` con `/api/v1` y rutas relativas, pero entonces `/health` necesita `servers` propio. Elige una y sé coherente.
- Cada operación: `tags`, `summary`, `description` (con roles si aplica), `operationId` único en camelCase, `parameters`, `requestBody`, `responses` (éxito + errores posibles) y `security`.
- Usa `$ref` a `components` para todo lo repetido; no dupliques esquemas.
- Ejemplos (`example`) en los esquemas principales con datos de seed realistas (sin contraseñas reales; la de seed es el propio email, no la pongas en ejemplos de respuesta).
- Declara el `securitySchemes` global y sobreescribe con `security: []` en endpoints públicos (`login`, `register`, `/public/**`, `/health`).

## 4. Generar el HTML

Sin añadir dependencias al proyecto (usa `npx`, no `npm install`):

```bash
source ~/.nvm/nvm.sh
npx --yes @redocly/cli@latest lint docs/api/openapi.yaml
npx --yes @redocly/cli@latest build-docs docs/api/openapi.yaml -o docs/api/index.html
```

- Corrige **todos los errores** del lint (los warnings de estilo, como falta de `license` o `4xx` en endpoints, se pueden dejar y mencionar).
- Si `npx` no puede descargar el paquete (sin red), alternativa autocontenida: crea `docs/api/index.html` que cargue Redoc desde CDN (`https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js`) con `<redoc spec-url="openapi.yaml">`, e indícalo al usuario (requiere servirlo por HTTP: `npx http-server docs/api`).

## 5. Verificar

1. El YAML valida (`lint` sin errores).
2. **Cobertura:** compara las rutas del código con las del YAML y confirma que no falta ninguna ni sobra:
   ```bash
   grep -rhoE "router\.(get|post|put|patch|delete)\(" packages/api/src | wc -l
   grep -cE "^\s+(get|post|put|patch|delete):" docs/api/openapi.yaml
   ```
   (El segundo recuento debe coincidir con el primero más `/health`.)
3. `docs/api/index.html` existe, no está vacío y contiene el título "Resttek API".
4. Opcional, si el usuario lo pide: arranca la API (`npm run dev:api`) y prueba con `curl` 2-3 endpoints para comprobar que respuestas reales y esquema coinciden (login con `admin@resttek.com` / contraseña igual al email).

## 6. Cierre

Resume, sin extenderte: rutas de ambos ficheros, nº de endpoints documentados por tag, resultado del lint, discrepancias encontradas entre código y docs/README, y cómo regenerar el HTML (el comando `build-docs`). No hagas commit salvo que el usuario lo pida.

## Reglas

- No modifiques código de `packages/api/src`; esta skill solo escribe en `docs/api/`.
- No inventes endpoints, campos ni códigos de respuesta: todo sale del código.
- No añadas dependencias al `package.json`.
- Español en todo el contenido del contrato y en los mensajes al usuario.

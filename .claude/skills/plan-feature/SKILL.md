---
name: plan-feature
description: Planifica un nuevo desarrollo, una corrección de código o un refactor generando un plan con objetivo, tareas de 5-10 min y criterios de aceptación. Úsala cuando el usuario pida planificar, diseñar o desglosar un cambio antes de implementarlo.
argument-hint: "[descripción del desarrollo, corrección o refactor]"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, mcp__slack__slack_post_message
---

Genera un plan de trabajo para: $ARGUMENTS

Esta skill **solo planifica**: no modifiques código de `src/`. El resultado es un archivo Markdown que sigue la estructura de [template.md](template.md).

## Proceso

1. **Entiende la petición.** Si es ambigua o faltan datos que cambian el plan (alcance, comportamiento esperado, casos límite), usa `AskUserQuestion` antes de seguir. No preguntes lo que puedas deducir del código.
2. **Explora el código** afectado con `Read`, `Glob` y `Grep`. Respeta la arquitectura de `CLAUDE.md`: `routes → controllers → services → repositories → models`, una capa solo llama a la inmediatamente inferior.
3. **Consulta la documentación relevante** en `docs/`. En particular, si el plan añade paginación a un endpoint, lee `docs/api/api-pagination.md` y alinea el plan con ella.
4. **Clasifica el tipo de trabajo:** `feature`, `fix` o `refactor`.
5. **Detecta si toca la API.** Si el cambio afecta a `routes/`, `controllers/`, `models/`, `contexts/employee/infrastructure/http/`, `errorHandler.ts` o al contrato visible de cualquier endpoint, aplica la regla «Contrato OpenAPI» de abajo y lee `docs/api/openapi.yaml` para citar los `paths` exactos que cambian.
6. **Redacta el plan** rellenando todas las secciones de [template.md](template.md).
7. **Guárdalo** en `docs/plans/<tipo>-<slug-en-kebab-case>.md` (crea la carpeta si no existe). Si el archivo ya existe, pregunta antes de sobrescribirlo.
8. **Avisa por Slack.** Una vez guardado el plan, publica con `mcp__slack__slack_post_message` un mensaje en el canal `revisar-plan` indicando que el plan está listo para revisarse: tipo, objetivo en una frase, nº de tareas y ruta del archivo. Si el envío falla (canal inexistente, token ausente), no abortes: informa del error al usuario en el paso siguiente.
9. **Resume al usuario** el objetivo y el número de tareas, indica la ruta del archivo y pregunta si quiere ajustar algo. No empieces a implementar.

## Reglas del plan

- **Objetivo:** 1-3 frases que expliquen qué se consigue y por qué. Incluye el alcance y lo que queda fuera.
- **Tareas:**
  - Cada tarea debe poder completarse en **5-10 minutos**. Si una tarea parece mayor, divídela; si es trivial (<5 min), agrúpala con otra afín.
  - Ordénalas por dependencia, numeradas y con casilla `- [ ]`.
  - Cada una indica el archivo o capa afectada y un resultado verificable. Agrupa por capa cuando ayude a la lectura.
  - Respeta las convenciones del proyecto: clases en lugar de funciones sueltas, métodos en `snake_case`, sin librerías externas si existe solución nativa en Node, SQLite solo desde repositories, mensajes en español.
  - Para un `fix`, la primera tarea es reproducir el fallo; para un `refactor`, indica cómo se comprueba que el comportamiento no cambia.
- **Contrato OpenAPI (obligatorio si se toca la API):** si el plan crea, modifica o elimina un endpoint, o cambia lo que ve el cliente (ruta, método, parámetros, cuerpo de petición o respuesta, códigos HTTP, roles de `authorize()`, formato de error, enums validados), debe incluir, **como última tarea de código**, una tarea para actualizar `docs/api/openapi.yaml` y regenerar `docs/api/index.html`:
  - Indica qué `paths` y `components` cambian (marca "(nuevo)" los que se crean) y que debe respetar las reglas de la skill `generate-openapi`: ruta completa `/api/v1/...`, `operationId` único, `security`, `$ref` a `components`, descripciones en español.
  - Añade el comando de regeneración: `source ~/.nvm/nvm.sh && npx --yes @redocly/cli@latest lint docs/api/openapi.yaml && npx --yes @redocly/cli@latest build-docs docs/api/openapi.yaml -o docs/api/index.html`.
  - Añade un criterio de aceptación: «`docs/api/openapi.yaml` refleja los cambios de la API, pasa el lint sin errores y `docs/api/index.html` está regenerado». Si es un refactor sin cambio de contrato, el criterio es que el YAML **no** requiere cambios (nº de operaciones igual al de rutas del código).
  - Si el YAML aún no existe, la tarea es ejecutar primero la skill `generate-openapi`.
  - Un cambio interno que no altere el contrato (p. ej. lógica de un service con la misma respuesta) no necesita esta tarea; dilo en una línea del plan.
- **Criterios de aceptación:** lista de condiciones concretas y comprobables (entrada → resultado esperado, códigos HTTP, mensajes de error en español). Evita criterios vagos como "funciona bien".
- Todo el plan se escribe en español.
- No inventes archivos, funciones ni endpoints: verifica en el código que lo que citas existe, y marca como "(nuevo)" lo que se va a crear.
- No hay tests configurados; si el plan los incluye, usa `node:test`.

---
name: implement-plan
description: Implementa un plan de docs/plans/ en un git worktree aislado, tarea a tarea con TDD estricto, haciendo un commit por tarea y marcándola como hecha en el plan hasta cumplir los criterios de aceptación. Úsala cuando el usuario pida implementar, ejecutar o desarrollar un plan ya redactado.
argument-hint: "[ruta del plan, p. ej. docs/plans/refactor-middleware-gestion-errores.md]"
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion, mcp__slack__slack_post_message
---

Implementa el plan: $ARGUMENTS

Los planes los genera la skill `plan-feature` (ver `docs/plans/`): objetivo, tareas numeradas con casilla `- [ ]` y criterios de aceptación con casilla `- [ ]`.

## 0. Preparación

1. **Localiza el plan.** Si `$ARGUMENTS` está vacío o no existe el archivo, lista `docs/plans/` y pregunta con `AskUserQuestion` cuál implementar. Léelo entero junto con `CLAUDE.md`.
2. **Valida el plan.** Debe tener tareas y criterios de aceptación. Si faltan, avisa y detente. Si ya hay tareas marcadas `- [x]`, retoma desde la primera pendiente (no repitas las hechas).
3. **Node:** `node` no está en el PATH; antepón `source ~/.nvm/nvm.sh &&` a todo comando `node`/`npm`.

## 1. Crear el git worktree

1. Comprueba que el árbol de trabajo principal no tiene cambios sin commitear en `src/` (los archivos no versionados del propio plan no cuentan). Si los hay, avisa al usuario y pregunta.
2. Deriva el nombre del plan quitando `.md` (p. ej. `refactor-middleware-gestion-errores`) y crea el worktree en una carpeta hermana del repositorio, con rama nueva desde `HEAD`:

   ```bash
   git worktree add -b <nombre-del-plan> ../<repo>-worktrees/<nombre-del-plan>
   ```

   Si la rama o la carpeta ya existen, pregunta si reutilizarlas en lugar de sobrescribir.
3. **El plan puede no estar versionado** (`docs/plans/` suele estar sin trackear) y entonces no existirá en el worktree. Cópialo a la misma ruta relativa dentro del worktree. Se versionará en el commit de la primera tarea.
4. Trabaja **solo dentro del worktree** a partir de aquí (rutas absolutas o `cd` al worktree en cada comando). Si falta `node_modules`, ejecuta `npm install` allí.
5. No hagas push ni elimines el worktree al terminar.

## 2. Bucle por tarea

Procesa las tareas **en orden y de una en una**. Para cada una:

### a) TDD estricto: rojo → verde → refactor

1. **Rojo.** Escribe primero el test que describe el resultado verificable de la tarea, con `node:test` y `node:assert` (sin librerías externas). Ponlo en `tests/` reflejando la ruta de `src/` (p. ej. `tests/services/authService.test.js`). Para endpoints, importa `src/app.js` y levántalo en un puerto efímero (`app.listen(0)`) con `fetch` nativo. Ejecútalo con `source ~/.nvm/nvm.sh && node --test` y **comprueba que falla por la razón esperada** (no por un error de sintaxis o de importación). Si pasa sin tocar código, el test no prueba nada: corrígelo.
2. **Verde.** Escribe el código mínimo de producción que lo haga pasar. Nada de funcionalidad que ningún test exija.
3. **Refactor.** Limpia manteniendo todo en verde. Ejecuta la **suite completa** (`node --test`), no solo el test nuevo, para detectar regresiones.
4. No escribas código de producción sin un test rojo previo. Si una tarea es puramente documental o de configuración y no admite test (p. ej. actualizar `CLAUDE.md`), o es de verificación manual (arrancar la API y comparar con `curl`), no inventes un test artificial: ejecútala, deja constancia en el mensaje del commit de que no aplica TDD y por qué. En tareas de verificación con `curl`, convierte la comprobación en tests automáticos si es razonable.
5. **Refactors:** el test de caracterización va antes del cambio y debe estar en verde con el código antiguo; después de refactorizar sigue en verde.
6. Si hace falta `package.json` script `test`, añádelo como `node --test` en la primera tarea que lo requiera (solo si no existe).

### b) Respeta las convenciones del proyecto

Capas `routes → controllers → services → repositories → models` (una capa solo llama a la inmediatamente inferior); clases en lugar de funciones sueltas; métodos en `snake_case`; sin dependencias si Node lo resuelve de forma nativa; SQLite solo desde repositories; respuestas y mensajes de error en español. No hagas nada fuera del alcance del plan.

### c) Commit

Cuando la tarea y **todos** los tests estén en verde:

1. Marca la tarea en el plan del worktree cambiando `- [ ] N.` por `- [x] N.`.
2. Haz `git add` explícito de los archivos de la tarea, sus tests y el plan (nunca `git add -A`, ni `.env`).
3. Commit en formato Conventional Commits (como la skill `commit`), en español, con el tipo adecuado (`feat`, `fix`, `refactor`, `test`, `docs`…), el scope de la capa o módulo y la referencia a la tarea, p. ej. `refactor(errores): añadir clase HttpError (tarea 2)`. Termina el mensaje con las líneas de atribución que indique el sistema.
4. Un commit por tarea: ni varias tareas en uno, ni una tarea en varios.

Si los tests no pasan tras un esfuerzo razonable, **no hagas commit ni marques la tarea**: detente y cuéntale al usuario qué falla.

### d) Siguiente

Informa en una línea (`Tarea N/M hecha: <resumen>`) y pasa a la siguiente.

## 3. Criterios de aceptación

Al terminar todas las tareas:

1. Recorre **cada** criterio de aceptación del plan y compruébalo de verdad: con un test automático existente o, si no lo hay, ejecutando la comprobación (arrancar la API y `curl`, `grep`, etc.). No marques un criterio por suposición.
2. Marca `- [x]` los que se cumplan. Si alguno falla, añade tarea(s) correctiva(s) al final del plan, impleméntalas con el mismo bucle TDD y repite la comprobación. Repite hasta que todos se cumplan.
3. Ejecuta la suite completa una última vez.
4. Commit final del plan con los criterios marcados (`docs(plan): marcar criterios de aceptación cumplidos`), salvo que ya esté incluido en el último commit de tarea.

## 4. Cierre

Antes del resumen, **avisa por Slack**: cuando todas las tareas estén hechas y los criterios de aceptación cumplidos, publica con `mcp__slack__slack_post_message` un mensaje en el canal `revisar-plan` indicando que la implementación está lista para revisarse: nombre del plan, rama y ruta del worktree, nº de tareas/commits y resultado de la suite. No avises si quedó alguna tarea o criterio sin cumplir. Si el envío falla (canal inexistente, token ausente), no abortes: informa del error al usuario.

Resume al usuario, sin extenderte: ruta y rama del worktree, nº de tareas y commits (`git log --oneline` de la rama), resultado de la suite, estado de cada criterio de aceptación y cualquier desviación respecto al plan. Indica que la rama no se ha fusionado ni subido y pregunta si quiere abrir un PR o fusionarla.

## Reglas

- Español en todo lo que escribas (código comentado, commits, mensajes al usuario).
- Nunca modifiques el repositorio principal salvo para crear el worktree.
- No saltes tareas, no cambies su orden y no reescribas el plan salvo para marcar casillas o añadir tareas correctivas.
- Nunca uses `--no-verify`, `git push --force` ni acciones destructivas.

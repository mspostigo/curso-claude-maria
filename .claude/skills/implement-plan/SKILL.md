---
name: implement-plan
description: Implementa el plan de una issue de GitHub en un git worktree aislado, tarea a tarea con TDD estricto, haciendo un commit por tarea y marcándola como hecha en el plan hasta cumplir los criterios de aceptación; al terminar crea la PR y avisa por Slack con su enlace. Úsala cuando el usuario pida implementar, ejecutar o desarrollar una issue con plan ya redactado.
argument-hint: "[número de la issue de GitHub]"
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion, mcp__slack__slack_post_message
---

Implementa el plan de la issue de GitHub: $ARGUMENTS

El usuario indica el número de la issue a implementar. Los planes los genera la skill `plan-feature` (se guardan en `docs/plans/` y se publican como comentario de la issue): objetivo, tareas numeradas con casilla `- [ ]` y criterios de aceptación con casilla `- [ ]`.

## 0. Preparación

1. **Busca la issue y localiza el plan.** Si `$ARGUMENTS` no contiene un número de issue, pídeselo al usuario con `AskUserQuestion`. Obtén la issue con `gh issue view <número> --comments` (si falla, informa y detente). El plan es el comentario de la issue generado por `plan-feature`; localiza además su archivo en `docs/plans/` (si existe, es el que se usa; si no, créalo a partir del comentario con la misma estructura). Si la issue no tiene plan, avisa y sugiere ejecutar antes `plan-feature`. Léelo entero junto con `CLAUDE.md`.
2. **Valida el plan.** Debe tener tareas y criterios de aceptación. Si faltan, avisa y detente. Si ya hay tareas marcadas `- [x]`, retoma desde la primera pendiente (no repitas las hechas).
3. **Node:** `node` no está en el PATH; antepón `source ~/.nvm/nvm.sh &&` a todo comando `node`/`npm`.

## 1. Crear el git worktree

1. Comprueba que el árbol de trabajo principal no tiene cambios sin commitear en `src/` (los archivos no versionados del propio plan no cuentan). Si los hay, avisa al usuario y pregunta.
2. Deriva el nombre del plan quitando `.md` (p. ej. `refactor-middleware-gestion-errores`; es el nombre del archivo del plan en `docs/plans/`) y crea el worktree en una carpeta hermana del repositorio, con rama nueva desde `HEAD`:

   ```bash
   git worktree add -b <nombre-del-plan> ../<repo>-worktrees/<nombre-del-plan>
   ```

   Si la rama o la carpeta ya existen, pregunta si reutilizarlas en lugar de sobrescribir.
3. **El plan puede no estar versionado** (`docs/plans/` suele estar sin trackear) y entonces no existirá en el worktree. Cópialo a la misma ruta relativa dentro del worktree. Se versionará en el commit de la primera tarea.
4. Trabaja **solo dentro del worktree** a partir de aquí (rutas absolutas o `cd` al worktree en cada comando). Si falta `node_modules`, ejecuta `npm install` allí.
5. No elimines el worktree al terminar. El push solo se hace en el cierre, para crear la PR.

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

Cuando todas las tareas estén hechas y los criterios cumplidos (si queda alguna tarea o criterio sin cumplir, no crees la PR ni avises por Slack: informa al usuario):

1. **Sube la rama** desde el worktree: `git push -u origin <nombre-del-plan>` (sin `--force`).
2. **Crea la PR** con `gh pr create --base main --head <nombre-del-plan>`, título en Conventional Commits y en español, y cuerpo con: resumen del objetivo, lista de tareas/commits, resultado de la suite, estado de los criterios de aceptación y `Closes #<número>` para enlazar la issue. Termina el cuerpo con la línea de atribución que indique el sistema. Si ya existe una PR para la rama, reutilízala. Guarda la URL que devuelve `gh`.
3. **Avisa por Slack** con `mcp__slack__slack_post_message` en el canal `revisar-plan`: un mensaje que incluya el **enlace directo a la PR**, la issue, la rama, el nº de tareas/commits y el resultado de la suite. Si el envío falla (canal inexistente, token ausente), no abortes: informa del error al usuario.

Resume al usuario, sin extenderte: URL de la PR, ruta y rama del worktree, nº de tareas y commits (`git log --oneline` de la rama), resultado de la suite, estado de cada criterio de aceptación y cualquier desviación respecto al plan. Indica que la rama no se ha fusionado.

## Reglas

- Español en todo lo que escribas (código comentado, commits, mensajes al usuario).
- Nunca modifiques el repositorio principal salvo para crear el worktree.
- Solo se hace push de la rama del plan, y únicamente en el cierre para crear la PR.
- No saltes tareas, no cambies su orden y no reescribas el plan salvo para marcar casillas o añadir tareas correctivas.
- Nunca uses `--no-verify`, `git push --force` ni acciones destructivas.

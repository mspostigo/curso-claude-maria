---
description: Crea un commit siguiendo el formato Conventional Commits
argument-hint: "[contexto opcional sobre el cambio]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

Crea un commit de los cambios actuales siguiendo la especificación [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).

## Contexto

- Estado: !`git status --short 2>/dev/null || echo "repositorio no inicializado"`
- Cambios en staging: !`git diff --cached 2>/dev/null || echo "repositorio no inicializado"`
- Cambios sin añadir: !`git diff 2>/dev/null || echo "repositorio no inicializado"`
- Commits recientes (para igualar el estilo): !`git log --oneline -10 2>/dev/null || echo "sin commits previos"`

Contexto adicional del usuario: $ARGUMENTS

## Formato

```
<tipo>(<ámbito opcional>): <descripción>

[cuerpo opcional]

[pie opcional]
```

**Tipos permitidos:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## Reglas

1. La descripción va en español, en minúscula, en imperativo o infinitivo ("añadir endpoint de listado"), sin punto final y con un máximo de 72 caracteres en la primera línea.
2. El ámbito, si aplica, es la capa o el recurso afectado (p. ej. `vendehumos`, `auth`, `repositories`).
3. Usa el cuerpo solo si el *porqué* del cambio no es evidente; explica el motivo, no el qué.
4. Un cambio incompatible se marca con `!` tras el tipo/ámbito (`feat(api)!: ...`) y un pie `BREAKING CHANGE: ...`.
5. Usa la tool `AskUserQuestion` para mostrarle al usuario el mensaje del commit, y que decida si le parece bien. Si te da el ok, continua. Si te dice que no, proponle otro mensaje y vuelve a preguntarle.
6. Si los cambios mezclan varios propósitos independientes, propón dividirlos en varios commits y pregunta antes de hacerlo.
7. Si hay cambios en staging, commitea solo esos. Si no hay ninguno, añade con `git add` únicamente los archivos relevantes por nombre (nunca `git add -A` ni `.`) y no incluyas `.env`, secretos ni `node_modules`.
8. No uses `--no-verify`, no hagas `git push` ni `--amend` salvo que el usuario lo pida.
9. Si no hay cambios, díselo al usuario y no crees un commit vacío.
10. **Si el repositorio no está inicializado:** ejecuta `git init` antes de proceder.
11. **Si es el primer commit:** omite la comparación con commits previos y usa el contexto disponible. Puede tener un alcance más amplio que commits posteriores.

Al terminar, muestra el mensaje del commit creado.

# Lessons v1 backend

Implementa los cinco endpoints de docs/api-contracts.md con Route → Controller → Service → Repository → Prisma/PostgreSQL y el boundary existente req.auth.userId.

## Persistencia y consistencia

- Steps derivados, sin tabla nueva: bloques explicativos consecutivos, actividades individuales y resúmenes individuales. ID opaco = UUID del primer bloque del step.
- GET usa una transacción de lectura consistente, sin mutaciones. La proyección pública usa campos permitidos; no devuelve las claves privadas de actividades ni su explicación antes del submit.
- Las escrituras bloquean la fila del usuario (FOR UPDATE) dentro de la transacción. Esto serializa inicio, attempts, Review y completion del mismo usuario, incluyendo operaciones sin progreso previo. Usuarios diferentes no comparten este bloqueo.
- Attempts se numeran por usuario/lección/actividad en contexto LESSON. El primer attempt determina el score; los retries no lo reemplazan ni resuelven Review. Una falla revierte todas las escrituras dependientes.
- El resultado cuenta actividades distintas referenciadas por bloques ACTIVITY; required controla la obligación de submit. El resultado se deriva, sin nueva tabla de sesiones/resultados.
- Course progress y current/next usan solo lecciones PUBLISHED requeridas. Las opcionales siguen en el roadmap y los conteos de contenido publicado. Completar la última requerida actualiza course_progress en la misma transacción. GET no realiza backfill.
- Se conserva el comportamiento anterior de progreso vacío: denominador cero devuelve 0%, sin completar automáticamente un curso sin lecciones requeridas.

## Configuración privada de actividades

Convenciones técnicas para el JSON existente activities.config (sin schema ni migración):

- MULTIPLE_CHOICE / FILL_BLANK_OPTIONS: options [{ id, text }], correctOptionId; hint opcional.
- FILL_BLANK_TEXT: acceptedAnswers string[], caseSensitive opcional (false por defecto), hint opcional. Solo trim y comparación de mayúsculas configurada; sin normalización adicional de acentos/puntuación.
- MATCH_WORD_IMAGE: words [{ id, text }], images [{ id, url, alt }], pairs [{ wordId, imageId }], interactionMode TAP o DRAG (TAP por defecto). La respuesta usa pairs completos, sin duplicados; la validación no depende del gesto.
- activities.explanation se devuelve únicamente después de enviar respuesta. Configuraciones almacenadas inválidas fallan sin exponer el JSON privado.

## Verificación reproducible

Desde backend, PowerShell:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/prisma/build/index.js validate
$env:RUN_LESSONS_DB_TESTS = '1'
node --import tsx --test src/modules/courses/*.test.ts src/modules/lessons/*.test.ts scripts/courses-demo.test.ts
Remove-Item Env:RUN_LESSONS_DB_TESTS
```

La integración es opt-in y exige NODE_ENV=development, PostgreSQL local en puerto 5433 y base teacher_alma_dev. Carga la configuración existente sin modificar .env. Crea usuarios/curso/lecciones/actividades con UUID aislados y los elimina en finally. Cubre los cuatro tipos, acceso, opcionales, concurrencia y rollback. No altera el dataset demo de Courses. Sin opt-in, el test PostgreSQL se omite explícitamente.

No hay script lint en este backend. No se implementan mobile, proveedor de auth, monedas, rachas, pagos, Review UI ni nuevas reglas de recompensas. El futuro escritor de Review debe coordinar su concurrencia con este bloqueo por usuario; el índice existente garantiza un solo Review ACTIVE por usuario/actividad.

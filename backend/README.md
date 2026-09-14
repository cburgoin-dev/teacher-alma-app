# Backend de La Teacher Alma

Scaffolding de Node.js, Express, TypeScript, Prisma y PostgreSQL. Los módulos de dominio son placeholders; el único endpoint es `GET /health`, que devuelve `{"status":"ok"}` y no consulta PostgreSQL.

## Desarrollo

Desde `backend/`, con Node.js 22.12 o superior:

```sh
npm ci
npm run prisma:validate
npm run prisma:generate
npm run build
npm run dev
```

`npm start` ejecuta la compilación en `dist/`. El puerto predeterminado es 3000; puede cambiarse mediante `PORT`. CORS está habilitado de forma general para este scaffolding; la configuración de orígenes se definirá con la integración del frontend.

## PostgreSQL y primera migración

1. Proporcionar una instancia PostgreSQL accesible y una base de desarrollo vacía `teacher_alma`.
2. Copiar `.env.example` a `.env` y sustituir los valores de ejemplo por una `DATABASE_URL` real, incluyendo opciones SSL si el proveedor las requiere.
3. El usuario PostgreSQL necesita permisos para crear tablas, índices y restricciones. Para `migrate dev`, también necesita crear una base de datos sombra, o configurar una base sombra separada en Prisma.
4. Ejecutar `npm run prisma:migrate` desde `backend/` para aplicar la migración inicial preparada. No aceptar un reset si la base contiene datos que se deban conservar; revisar antes su estado.
5. Ejecutar `npm run prisma:generate` después de futuras modificaciones del esquema.

La migración inicial se genera desde el esquema sin conectar a PostgreSQL y añade las restricciones SQL documentadas. No ha sido aplicada a una base real. No usar `db push` como sustituto: omitiría el SQL personalizado.

## Correspondencia con el modelo lógico

- Fuente principal: `../docs/database-schema.md`, seguida de los otros documentos indicados. No se modifica la documentación original.
- 23 modelos; nombres TypeScript en PascalCase/camelCase y tablas/columnas SQL originales mediante `@@map` y `@map`.
- UUID generados por Prisma; `timestamptz(6)`, `date`, `numeric(6,3)`, `numeric(8,3)` y JSONB explícitos. `updatedAt` usa `@updatedAt` en escrituras Prisma y `now()` al insertar; no se introduce un trigger para escrituras SQL externas.
- Estados y tipos de negocio permanecen como `text`. Sus validaciones de aplicación se implementarán con los módulos; las listas recomendadas no se convierten en enums nativos ni en catálogos cerrados nuevos.
- Se respetan `CASCADE`, `RESTRICT` y `SET NULL` documentados. Se añaden índices para las FK de consulta que no tenían un índice con esa columna como prefijo.
- Diagnóstico usa preguntas versionadas y respuestas ligadas a `DiagnosticQuestion`, en lugar del vínculo directo a `Activity` del documento conceptual. Inventario usa `ShopItem`; retos usan fechas locales; productos y entitlements siguen las columnas del esquema lógico.
- No se guardan indicadores Premium, saldo, racha, porcentajes ni estados de pantalla derivados.

## Restricciones fuera del lenguaje de esquema Prisma

La migración SQL conserva los `CHECK` de cantidad no negativa, fechas del reto, actividad obligatoria para bloques `ACTIVITY`, curso obligatorio para productos `COURSE_PURCHASE` y scope `COURSE`. Las recomendaciones que dicen «normalmente null» no se convierten en prohibiciones adicionales.

Los índices únicos parciales permiten un solo ReviewItem `ACTIVE` por usuario/actividad y un solo reto `ACTIVE` por usuario, manteniendo múltiples registros históricos resueltos/finalizados. Se usa SQL personalizado para evitar depender de una función preview de Prisma. Estos índices no se reemplazan por `@@unique` globales. Mantener este SQL al evolucionar las migraciones.

La pertenencia del bloque actual a la lección, la correspondencia pregunta/intento de diagnóstico y la inmutabilidad del ledger requieren validaciones/transacciones en servicios futuros; no se inventan nuevas claves compuestas, triggers ni lógica funcional en este scaffolding.

## Cliente Prisma

Prisma 7 utiliza `@prisma/adapter-pg` y `pg`; por eso se agregan a las dependencias previstas. `prisma.config.ts` carga la URL desde el entorno. Validar/generar no necesita credenciales; inicializar el cliente compartido sí exige `DATABASE_URL`.

Importar el cliente desde `src/shared/prisma.ts`: reutiliza una instancia global durante desarrollo. El cliente generado vive en `src/generated/prisma/`, se excluye de Git y se compila junto con el backend. El lockfile fija las versiones instaladas.

## Verificación de dependencias

En la instalación inicial, `npm audit` reportó cuatro entradas de severidad alta en la cadena del CLI Prisma 7.10.0 (`prisma`, `@prisma/config`, `deepmerge-ts` y `mysql2`). No se aplicó `audit fix --force`: la solución sugerida cambia a Prisma 6. Revisar las actualizaciones compatibles antes del despliegue; estas dependencias no implican que el backend use MySQL.

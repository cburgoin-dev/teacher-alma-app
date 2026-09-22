# Courses v3: datos de demostración

Contenido ficticio para evaluación visual; no es el programa definitivo de Alma. Solo tooling de desarrollo: no hay cambios de contrato, esquema ni servicios.

## PostgreSQL local (opción principal para el teléfono)

Desde `backend/`, con las dependencias ya instaladas y la configuración local existente:

```powershell
node --import tsx scripts/seed-courses-demo.ts --check
node --import tsx scripts/seed-courses-demo.ts --apply
```

El script carga la configuración sin imprimir secretos. Exige `NODE_ENV=development`, PostgreSQL en localhost/loopback:5433, base `teacher_alma_dev` y un `DEV_AUTH_USER_ID` que ya exista. No modifica `.env`. La app puede seguir usando su API local habitual; abrir Cursos o refrescar el catálogo vuelve a consultar los datos.

`--apply` crea/actualiza los cursos, temas y lecciones identificados por UUIDs estables y slugs `courses-demo-v3-*`. No duplica registros. Conserva `coverUrl` si se configura manualmente; al crear queda null, por lo que el móvil usa las cuatro portadas locales diferentes por nivel. No es necesario alojar ni servir nuevas imágenes desde el backend.

Los dos fixtures de integración originales, identificados exactamente por UUID, slug y título en el script, pasan a `DRAFT` para que no aparezca `DEV TEST`. Sus filas y progreso se conservan. Ningún otro curso se oculta. Para restaurarlos, cambiar exclusivamente sus estados anteriores: `dev-test-courses-v1-published` a `PUBLISHED` y `dev-test-courses-v1-coming-soon` a `COMING_SOON`.

## Reset reproducible

```powershell
node --import tsx scripts/seed-courses-demo.ts --reset
```

Restablece exclusivamente `course_progress` y `lesson_progress` del usuario configurado para estos cuatro cursos demo. Deja A1 iniciado con tres lecciones completadas y A2 sin iniciar. No elimina cursos, usuarios, otros progresos ni modifica compras, entitlements, monedas o rachas. Los estados completados son datos de escenario introducidos por tooling, no eventos de aprendizaje ni una implementación de Lessons.

El script se detiene ante colisiones de identificadores o entitlements activos que desbloqueen estos cursos; nunca revoca acceso para fabricar un bloqueo.

Escenario opcional para visualizar una frontera de pago real:

```powershell
node --import tsx scripts/seed-courses-demo.ts --reset --access-boundary
```

Completa cuatro de ocho lecciones de A1 (50%). La siguiente es PAID: el servicio devuelve `isCurrent=true`, `unlocked=true`, `hasAccess=false`, `lockReason=ACCESS`. Volver a `--reset` restaura el escenario principal de 38%. No es posible mostrar esa quinta lección como bloqueada por acceso en el escenario principal sin falsear las reglas: allí todavía está bloqueada por prerrequisito.

## Contenido

- **Inglés A1:** 4 temas, 8 lecciones, primeras 4 FREE. Tres completadas producen 37.5%, redondeado por la UI a 38%; `Verb to be` es la actual. Temas: Presentaciones y datos personales; Familia y amigos; Rutinas y vida diaria; Lugares y ciudad. Lecciones: Saludos, Presentaciones, Nice to meet you!, Verb to be, Mi familia, Rutinas diarias, Tiempo libre, Mi mundo.
- **Inglés A2:** 4 temas, 8 lecciones, primeras 2 FREE; sin progreso inicial. Temas iguales a A1, con contenido distinto: Conocer a alguien, Contar mi historia, Describir a las personas, Planes con amigos, Un día diferente, Hábitos y preferencias, Pedir indicaciones, Explorar la ciudad.
- **Inglés B1:** 3 temas, 6 lecciones PAID; sin entitlement ni progreso. Experiencias y recuerdos; Opiniones y decisiones; Trabajo y proyectos. Permite evaluar el detalle de acceso restringido. El badge Premium es presentación del bloqueo, no una nueva propiedad del modelo.
- **Inglés C1:** COMING_SOON, descripción y portada, sin lecciones publicadas ni inicio.

Fuente común: `courses-demo-data.ts`. Los datos no contienen porcentajes, coordenadas, labels de botones ni flags Premium. Progreso, acceso y navegación se derivan en los servicios existentes.

## Preview sin PostgreSQL

Se conserva la entrada anterior desde `mobile/`:

```powershell
node tests/preview-api.cjs
```

Ahora lanza `backend/scripts/preview-courses.ts`, reutilizando las rutas, controller, service y repositorio en memoria de tests ya existentes. Escucha solo en loopback:3101. Reiniciar restablece el escenario; admite `--long-titles` y `--access-boundary`. Requiere las dependencias existentes de backend. No carga `.env` ni conecta PostgreSQL. Para usarlo, asignar `EXPO_PUBLIC_API_URL` únicamente al proceso Expo y usar ADB reverse o un túnel local apropiado; no queda una URL demo hardcodeada en la app.

## Verificación

```powershell
node node_modules/typescript/bin/tsc -p scripts/tsconfig.json
node --import tsx --test scripts/courses-demo.test.ts
```

Las pruebas ejecutan los servicios reales: catálogo, 3/8 completadas, ocho nodos, detalle A2, inicio idempotente, acceso, COMING_SOON y escenario de frontera de pago. Las comprobaciones mobile existentes siguen en `mobile/tests/courses.test.cjs`.

## Gaps del mockup (sin implementar)

- GET /courses no expone topicCount/lessonCount para todos los cursos: no se copian los números del mockup. Una posible ampliación es un resumen de contenido equivalente al del detalle.
- Course Detail no incluye objetivos de aprendizaje: `¿Qué aprenderás?` requeriría contenido editorial y un campo/contrato acordado.
- `Principiante` no tiene fuente independiente; se mantiene el nivel A1/A2/B1/C1. Podría acordarse una etiqueta presentacional por nivel sin alterar el modelo.
- Monedas, racha y notificaciones necesitan sus contratos/estado real. No se inventan para la demo.
- Antes de publicar, validar arte oficial y disponibilidad comercial; el acceso actual puede provenir de compra individual o Premium, no solo de una suscripción.

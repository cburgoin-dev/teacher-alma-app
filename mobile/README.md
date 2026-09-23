# Teacher Alma — Courses v1 móvil

Expo + React Native + TypeScript y React Navigation. Courses incluye catálogo, detalle y roadmap conectados a la API. Inicio, Progreso y Perfil siguen como placeholders. No se implementan autenticación, lecciones ni pagos.

## Ejecutar

Desde `mobile/`:

```sh
npm ci
npm run typecheck
npm start
```

Abrir en Expo Go compatible con SDK 57 o usar `npm run android` con un dispositivo/emulador disponible. `npm run ios` requiere macOS para el simulador; desde Windows puede usarse un iPhone con Expo Go. No se añadieron dependencias de web.

## Organización

```text
App.tsx
index.ts
src/
  components/PlaceholderScreen.tsx
  navigation/RootNavigator.tsx
  navigation/types.ts
  features/
    home/screens/
    courses/navigation/
    courses/screens/
    courses/api/
    courses/components/
    courses/hooks/
    courses/types.ts
    courses/presentation.ts
    progress/screens/
    profile/screens/
  services/api/client.ts
```

Las cuatro tabs permanecen visibles en las tres pantallas de Cursos. El catálogo envía cursos no iniciados, bloqueados o próximos a CourseDetail; los cursos en progreso o completados van directamente a Roadmap. Ambas rutas reciben `courseId`. Solo el CTA explícito de inicio ejecuta POST y, tras éxito, reemplaza el detalle por Roadmap. Volver al catálogo recarga el progreso.

## Integración API

`apiRequest<T>(path, options)` utiliza `fetch` y conserva `status`, `code` y `message` de los errores HTTP. Acepta las opciones estándar, incluido `signal` para cancelación. No almacena tokens ni agrega autenticación o reintentos automáticos.

Configurar `EXPO_PUBLIC_API_URL` mediante el entorno del proceso Expo o una copia local de `.env.example`. No hay URL predeterminada. Sin configuración o sin backend aparece el estado de error con reintento. En un teléfono, localhost corresponde al teléfono: la URL debe ser accesible desde el dispositivo. El backend de desarrollo debe tener su contexto de usuario configurado; el móvil no inventa credenciales ni envía un ID de usuario.

Se consumen los cuatro contratos de Courses. El detalle consulta también el roadmap para mostrar nombres de temas y conocer el acceso a la primera lección; la presencia de alguna lección gratis no implica que la primera lo sea. La UI representa los estados devueltos por el servidor sin recalcular prerrequisitos. Las peticiones de lectura se cancelan al salir de pantalla. El inicio bloquea pulsaciones repetidas y conserva los errores del contrato.

Las acciones de lecciones y acceso muestran avisos contextuales: no inician lecciones, simulan compras ni alteran progreso.

Las variables `EXPO_PUBLIC_*` son públicas y quedan incluidas en la aplicación. No colocar contraseñas, tokens ni la configuración del backend en ellas.

## Alcance

Los assets y el aviso de licencia incluidos proceden de la plantilla oficial de Expo; no son la identidad visual definitiva de Teacher Alma. No se seleccionaron librerías de estado, caché, autenticación ni UI. Backend, Prisma y migraciones permanecen fuera de esta tarea.

Los mockups originales están en `../docs/mockups/courses/`, fuera del bundle. Las portadas priorizan `coverUrl` y utilizan imágenes decorativas locales por nivel cuando no hay URL o falla su carga. Su procedencia, mapeo y prompts están en `assets/courses/README.md`. No se fabrican monedas, racha, notificaciones, objetivos de aprendizaje ni métricas no devueltas por la API. El roadmap agrupa nodos de **lecciones** por tema; los temas no se convierten en lecciones como podría sugerir el mockup. El personaje y el logo final siguen pendientes de assets oficiales; la marca actual usa texto y formas nativas.

## Pruebas de Courses

### Catálogo demo realista (V3)

Para ver los cuatro cursos desde la app conectada al backend local, ejecutar desde `backend/`:

```powershell
node --import tsx scripts/seed-courses-demo.ts --apply
```

No cambia `.env`. Crea datos de desarrollo en PostgreSQL para el usuario ya configurado: A1 con 3/8 completadas (38% visible), A2 disponible con 4 temas/8 lecciones, B1 restringido con 3 temas/6 lecciones y C1 próximo. Las cuatro portadas locales se seleccionan por nivel; `coverUrl` tiene prioridad. Los fixtures técnicos originales se conservan como DRAFT para que no aparezcan en el catálogo.

Para volver a probar **A2 → Detalle → Comenzar curso → Roadmap**, restablecer exclusivamente el progreso demo con `node --import tsx scripts/seed-courses-demo.ts --reset`. Consultar [la guía del seed](../backend/scripts/README.md) para alcance, escenarios, contenido completo y protecciones.

La alternativa `node tests/preview-api.cjs` sigue disponible sin PostgreSQL y ahora utiliza los servicios reales del backend con los mismos datos demo en memoria. Necesita las dependencias ya instaladas de backend. Reiniciar resetea los datos; admite `--long-titles` y `--access-boundary`. Ninguno de esos scripts se importa en el bundle móvil.

V3 añade badges decorativos Premium/Próximamente, flechas nativas más visibles y mayor jerarquía del subtítulo. Mantiene las cards uniformes, la navegación corregida y el mapa serpenteante. No fabrica conteos de catálogo, objetivos de aprendizaje, una etiqueta de dificultad, monedas ni rachas.

Verificación V3 (22 de septiembre): TypeScript mobile y scripts backend sin errores; 9 tests mobile y 27 tests backend/demo aprobados; `expo install --check` correcto. Metro generó y cargó el bundle en Expo Go/Android API 34. Contra PostgreSQL local se recorrió A2 → detalle → comenzar → roadmap, se revisaron las cuatro portadas, niveles, descripciones y overlays, y A1 con tres nodos completados, actual a la derecha y bloqueo por prerrequisito. El escenario alternativo de acceso se comprobó por HTTP. Después se restauró A1 a 3/8 y A2 sin iniciar; reaplicar el seed conservó 4 cursos, 11 temas y 22 lecciones. El guard rechazó NODE_ENV=production. Las cuatro tarjetas requieren desplazamiento; iOS y navegación Android de tres botones siguen sin validación visual en esta iteración.

```sh
node --test tests/courses.test.cjs
npm run typecheck
npx expo install --check
```

Las pruebas cubren navegación, acceso a la primera lección, curso vacío, COMING_SOON, cinco estados del roadmap, rutas HTTP, método POST y errores del contrato. Usan Node y el compilador TypeScript ya instalados.

Para reproducir estados visuales sin modificar PostgreSQL, ejecutar `node tests/preview-api.cjs` y apuntar el proceso de Expo al puerto local 3101. En un emulador Android conectado por ADB, `adb reverse tcp:3101 tcp:3101` permite usar `http://127.0.0.1:3101` como URL temporal. Los datos de ese servidor son **fixtures de prueba** en memoria, no datos de negocio ni un fallback de la app. Reiniciarlo devuelve A2 al estado no iniciado. No se distribuye con la aplicación.

### Sexta iteración visual (V6)

Catalog usa altura mínima por presencia de progreso y crecimiento natural del contenido, alineación superior, badges pill y slogans compuestos en líneas con remate gráfico. No se alteran covers ni sus fuentes. Detail distribuye temas/lecciones/CEFR en bloques equilibrados, con wrapping para texto ampliado; conserva CEFR en vez de introducir una etiqueta de dificultad ambigua.

`demoLearningOutcomes.ts` contiene únicamente los textos editoriales A1/A2 autorizados, identificados por los slugs demo exactos. Se muestran en «Qué aprenderás» cuando la acción existente es START. Otros cursos conservan el fallback, y ACCESS/SOON/ROUTE mantienen su propósito. Este mapping temporal no es una regla de acceso y no debe extenderse a cursos reales por compartir nivel; se recomienda sustituirlo por contenido editorial administrable en API cuando se acuerde su contrato.

Roadmap mantiene una única ruta global. Se añadieron fondo azul suave, hitos con banda y mayor jerarquía, conectores más visibles con entrada curva a las secciones, card azul del nodo rojo actual, card dorada en la frontera de acceso y cierre con un pequeño arco decorativo. La ambientación incorpora un globo y evita los espacios de la card actual. Los demás nodos siguen sin convertirse en cards; no hay mascota ni recompensas.

Validación: TypeScript, 11 tests móviles, `expo install --check` y `git diff --check` correctos. Las pruebas cubren continuidad y separación de los hitos en varios anchos/escalas, y aislamiento del contenido editorial demo. `accessBoundary` se activó en PostgreSQL local y se consultó con PrismaCourseRepository/CourseService: quinta lección actual, desbloqueada por progresión, sin acceso y lockReason=ACCESS. Después se restauró el seed principal: 4 cursos, 11 temas, 22 lecciones, A1 3/8 y A2 sin iniciar. Sin cambios en backend, schema, contratos, dependencias o `.env`.

La apariencia V6 necesita revisión en Android físico: no había dispositivo conectado y quedaban unos 492 MiB de RAM libre, por lo que no se insistió con el emulador. No se afirma validación visual completa. Revisar especialmente slogans en pantallas estrechas, metadata con texto ampliado, hitos, nodo actual y frontera dorada. El escenario alternativo se prepara/restaura con los comandos ya documentados en `backend/scripts/README.md`.

### Quinta iteración visual (V5)

`CoursePath` sustituye a `TopicPath`: aplana las lecciones en el orden recibido, conserva `lessonState()` y calcula un único recorrido para el curso. `courseStops` reserva espacio para hitos de tema; los conectores giran antes del encabezado y descienden por el lado del nodo, sin reiniciar el camino. El último tramo se acorta y termina en «Fin de la ruta», sin premios ni acciones nuevas. Nubes, libros, vegetación y un calendario se distribuyen a ambos lados; se eliminaron los grandes fondos semicirculares.

Catálogo: se eliminó el slot flexible de progreso y no se renderiza si no hay progreso; metadata de 13 px, barra compacta de 9 px y cards uniformes de 188 px con aumento por escala de fuente. Detail reutiliza la variante de badge según la acción existente (acceso/próximamente/normal). Tabs: contenido de 56 px más safe area y crecimiento por texto; puerta de Home sin línea inferior residual. API, reglas, inicio y dependencias permanecen intactos.

Validación V5: TypeScript correcto, 10 tests móviles (incluyen continuidad entre temas y exclusión de conectores del área de encabezados en anchos 280/320/360/600 y escalas 1/1.3/1.5), 3 tests demo del backend y `expo install --check` correctos. El escenario `accessBoundary` se verificó con el servicio real y repositorio en memoria: la siguiente lección es actual/desbloqueada por progresión, sin acceso y con motivo ACCESS; no se cambió estado en frontend. La verificación visual del dorado y del nuevo recorrido requiere Android físico: no había dispositivo conectado y el equipo tenía unos 88 MiB libres, por lo que no se insistió con el emulador.

La base local quedó restaurada con el seed existente: A1 3/8 (38% visual), A2 sin iniciar; 4 cursos, 11 temas, 22 lecciones, 1 course_progress y 3 lesson_progress demo. Para verificar sin tocar PostgreSQL: `node tests/preview-api.cjs --access-boundary`; reiniciar sin ese flag vuelve a la demo principal. En Android físico comprobar Catalog, Detail A2 («Puedes comenzar gratis» y «Comenzar curso»), Detail B1/C1, transición entre todos los temas, final, textos largos y tabs con fuente ampliada. iOS sigue pendiente; no se afirma validación visual completa.

### Cuarta iteración visual (V4)

Refinamiento sobre V3: badges de nivel aproximadamente 25–30% menores, texto de catálogo más prominente y agrupado, flechas CTA reducidas, slogans inclinados e iconos nativos de Inicio/Cursos revisados. El detalle permite comenzar con copy positivo y mantiene la explicación explícita cuando el acceso está bloqueado.

El roadmap conserva `pathGeometry` y las reglas de estados. COMPLETED usa verde/check nativo, CURRENT rojo, AVAILABLE azul, prerrequisitos gris y acceso dorado. `PathScenery` añade nubes, libros y vegetación decorativos, sin interacción ni información de dominio. La nueva referencia está en `docs/mockups/courses/roadmap-gamified-reference.png`; no se añadió la mascota.

Validación automatizada: TypeScript sin errores, 9 tests móviles aprobados y `expo install --check` correcto. Metro generó el bundle Android (992 módulos). La revisión visual V4 sigue pendiente: Expo Go y System UI se bloquearon, y un nuevo arranque del emulador terminó cerrándose; el equipo tenía aproximadamente 214 MiB de RAM libre. No se considera validada todavía la ausencia de recortes/overlaps en Catalog, Detail A2 o Roadmap A1. Repetir en un dispositivo Android o con memoria suficiente, incluyendo el escenario de acceso del preview existente, sin modificar PostgreSQL.

### Segunda iteración visual (septiembre de 2026)

- `src/theme.ts` centraliza colores, espaciado, tipografía, radios y sombras. `CourseCard`, `CourseCover`, `TopicPath` y `pathGeometry` separan composición visual y geometría de las reglas de presentación existentes.
- Catálogo: tarjetas de altura uniforme, portada izquierda, badges de nivel, dos líneas reservadas para título/descripción y CTA consistente. La altura acompaña la escala de fuente hasta 1.5. El nombre completo sigue disponible en la etiqueta accesible.
- Detalle: hero panorámico, metadata compacta, filas de temas y CTA fijo sobre la navegación. Una misma estructura cubre inicio, acceso, progreso y próximo lanzamiento.
- Roadmap: centros alternados al 20%/80% del ancho disponible, conectores Bézier punteados, cinco estados visuales y expansión solo del nodo actual. La geometría depende del viewport y escala de texto, sin definir reglas de acceso o progreso.
- Tabs: altura de contenido explícita, inset inferior real, padding mínimo, separación icono/label y lineHeight definido. Las cuatro etiquetas se verificaron completas sobre la barra de gestos Android.
- Sin cambios a dependencias, backend, contratos, modelo, API, hooks ni reglas de navegación. No se implementan lecciones ni compras.

Verificación: TypeScript sin errores, nueve pruebas aprobadas (las ocho funcionales previas más geometría responsive), `expo install --check` correcto y Metro generando/cargando el bundle Android. La geometría se prueba con anchos 280/320/360/600 y escalas 1/1.3/1.5.

En Expo Go/Android API 34 se revisaron catálogo y sus cuatro tarjetas, títulos largos sin desbordamiento, portadas/badges, detalle de inicio y acceso, detalle COMING_SOON con CTA deshabilitado, inicio de A2 y actualización del catálogo, y mapas con nodo actual en ambos lados, completado y bloqueo por prerrequisito. Se utilizaron fixtures HTTP en memoria, sin alterar PostgreSQL. Para repetir el caso de títulos largos: `node tests/preview-api.cjs --long-titles`.

Limitaciones: iOS y navegación Android de tres botones requieren comprobación en dispositivo; el emulador utilizado tiene navegación por gestos. La validación de escalas de fuente/ancho del mapa es automatizada, no una matriz visual de dispositivos. El emulador mostró avisos de System UI sin respuesta durante el arranque, pero posteriormente permitió recorrer las pantallas. Las portadas generadas no sustituyen arte oficial; no se reproduce la mascota ni el decorado completo del mockup. La API determina el contenido y los estados, por lo que los cursos de desarrollo sin nivel o descripción conservan esas ausencias.

### Resultado de la primera implementación

- Ocho pruebas automatizadas aprobadas; TypeScript sin errores; dependencias compatibles con Expo.
- Metro arrancó y generó el bundle Android.
- Los cuatro contratos respondieron HTTP 200 contra el backend/PostgreSQL local, usando el curso de desarrollo ya iniciado para el POST idempotente. También se consultó el detalle/roadmap de COMING_SOON.
- Con fixtures HTTP se verificó el inicio desde progreso nulo, el nodo actual tras iniciar, la actualización del catálogo y el rechazo 409 de COMING_SOON.
- La prueba interactiva de estas nuevas pantallas en Android queda pendiente: Expo Go cargó la app, pero el emulador presentó repetidamente avisos de Process system/System UI sin respuesta, incluso tras reiniciarlo. No se afirma una validación visual completa ni una fidelidad porcentual comprobada.

## Verificación del scaffold

- TypeScript: `npm run typecheck`, sin errores.
- Compatibilidad de dependencias: `npx expo install --check`, correcta.
- Expo/Metro: `npx expo start --host lan --port 8081`; servidor y bundle Android comprobados.
- Expo Go en Android API 34: tabs Inicio, Cursos, Progreso y Perfil; recorrido Courses → Course Detail → Roadmap → Cursos comprobado mediante interacción con el emulador.
- iOS no se probó en este entorno Windows.

El emulador necesitó un arranque en frío tras avisos de Android de sistema sin respuesta. En este equipo `--localhost` vinculó Metro solo a IPv6; `--host lan` permitió conectar Expo Go usando el reenvío de puerto de ADB.

La instalación reportó diez vulnerabilidades moderadas transitivas de Expo, sin altas ni críticas. No se aplicaron correcciones forzadas que cambiasen las versiones compatibles del SDK.

## Courses visual V7

Presentation-only iteration: thicker compact catalog progress; unchanged covers/cards and catalog metadata (the catalog contract has no topic/lesson counts for unstarted courses). Detail retains demo learning outcomes as a compact paragraph and displays human difficulty labels without changing API CEFR values.

Roadmap keeps one continuous route and real state selection. Its current lesson now has a larger red node connected to a saturated blue action panel; access-boundary uses gold. Topics use numbered markers, spacing and lateral positions vary, and scenery has mixed scales plus a clock-tower motif. A checkered finish flag replaces the ambiguous arch.

Validation: TypeScript, 12 mobile tests, Expo install --check and git diff --check. Local PostgreSQL service/repository checks verified catalog A1/A2/B1/C1, A2 unstarted with 4 topics/8 lessons, A1 3/8/current/prerequisite and the real accessBoundary (unlocked/current, no access, ACCESS). Restored the main demo after the boundary check. No backend/API/schema/dependency changes.

Android visual acceptance remains pending on a physical phone: no connected device and approximately 656 MiB free RAM at verification. Check current card/connector, long topic names, scenery, gold access and route end at normal and enlarged text. This iteration does not claim pixel-level or clipping verification on Android.

For the physical access check, from backend run node --import tsx scripts/seed-courses-demo.ts --reset --access-boundary, refresh A1, then restore with node --import tsx scripts/seed-courses-demo.ts --reset. Existing local-development guards apply.

## Cierre de polish V8

CURRENT muestra «Lección X de Y» usando el índice global y las lecciones recibidas en el roadmap, sin duplicar porcentaje. Se conservan composición, hitos, scenery y bandera V7. El copy demo A2 se compacta sin reducir fuente. Inicio alinea la base de puerta y paredes a 2 unidades del borde del canvas; no cambia tamaño ni stroke. Catalog no cambia: el contrato no entrega counts de temas/lecciones para cursos no iniciados.

### Ver Premium en Android físico

1. Desde backend: node --import tsx scripts/seed-courses-demo.ts --reset --access-boundary.
2. Con la app conectada al backend local existente y el mismo usuario de desarrollo, abrir Cursos → Inglés A1. Deslizar hacia abajo para refrescar el roadmap y avanzar hasta «5. Mi familia».
3. Deben aparecer cuatro completadas verdes; la quinta dorada con candado blanco, halo crema, card «ACCESO PREMIUM» y CTA «Ver acceso». Las lecciones 6–8 siguen grises por prerrequisito. El CTA solo muestra información, no compra ni inicia una lección.
4. Restaurar desde backend: node --import tsx scripts/seed-courses-demo.ts --reset. Refrescar roadmap/catálogo: A1 3/8, cuarta actual roja; A2 sin iniciar.

Se comprobó el escenario contra PostgreSQL y el clasificador real lessonState del móvil, incluidos current=true, unlocked=true, hasAccess=false y lockReason=ACCESS. Se restauró el dataset principal al terminar. No había Android conectado: la aceptación visual final del dorado, icono y copy requiere teléfono físico; las capturas aportadas corresponden a V7.

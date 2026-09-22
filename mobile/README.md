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

Los mockups originales están en `../docs/mockups/courses/`, fuera del bundle. Las portadas usan `coverUrl`, con un fondo gráfico neutro cuando no hay imagen o falla su carga. No se fabrican monedas, racha, notificaciones, objetivos de aprendizaje ni métricas no devueltas por la API. El roadmap agrupa nodos de **lecciones** por tema; los temas no se convierten en lecciones como podría sugerir el mockup. Los personajes, fotos y logo final requieren assets propios; la marca actual se presenta como texto.

## Pruebas de Courses

```sh
node --test tests/courses.test.cjs
npm run typecheck
npx expo install --check
```

Las pruebas cubren navegación, acceso a la primera lección, curso vacío, COMING_SOON, cinco estados del roadmap, rutas HTTP, método POST y errores del contrato. Usan Node y el compilador TypeScript ya instalados.

Para reproducir estados visuales sin modificar PostgreSQL, ejecutar `node tests/preview-api.cjs` y apuntar el proceso de Expo al puerto local 3101. En un emulador Android conectado por ADB, `adb reverse tcp:3101 tcp:3101` permite usar `http://127.0.0.1:3101` como URL temporal. Los datos de ese servidor son **fixtures de prueba** en memoria, no datos de negocio ni un fallback de la app. Reiniciarlo devuelve A2 al estado no iniciado. No se distribuye con la aplicación.

### Resultado de esta implementación

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

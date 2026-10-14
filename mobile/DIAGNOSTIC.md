# Diagnostic Mobile v1

## Implementación

`src/features/diagnostic/` contiene `types.ts`, `api.ts`, `flow.ts`, `presentation.ts` y `DiagnosticScreen.tsx`. Se preservó y completó la base de los cuatro primeros archivos de la iteración interrumpida.

Una sola ruta raíz `Diagnostic` presenta Intro, Questions y Result, sin tabs. El estado es exclusivamente en memoria; no se persiste ni recupera un ACTIVE al reiniciar la app. El servidor abandona el intento anterior cuando se inicia una intención nueva según su contrato. Pasar la app a segundo plano no crea un endpoint ni un token de Resume.

Intro consume `GET /diagnostic`, muestra título, preguntas y duración opcional reales. No crea intentos al entrar o al pulsar Ahora no. La disponibilidad es exclusivamente backend. Questions consume start y submit; Result recibe directamente el receipt final. `GET /diagnostic/result` se usa al consultar posteriormente desde Home ASSESSED y excepcionalmente para resolver una finalización cuya respuesta se perdió mientras se intentaba abandonar.

API usada: `GET /diagnostic`, `POST /diagnostic/attempts`, `POST /diagnostic/attempts/:attemptId/questions/:questionId/submit`, `POST /diagnostic/attempts/:attemptId/abandon`, `GET /diagnostic/result`. La API pública no cambia. El tooling DEV separado descrito abajo añade únicamente rutas de preparación locales; no añade dependencias.

Cada intención de start conserva su key; cada submit conserva key y copia exacta de answer mientras la confirmación sea incierta. El flujo bloquea solicitudes simultáneas. Después de un fallo de transporte, los inputs quedan bloqueados y **Reintentar envío** repite el mismo payload. `INVALID_ANSWER` permite corregir. Timeout de 15 segundos permite ofrecer retry si la conexión queda colgada. Una nueva intención/retake genera nuevas keys. Los conflictos no se presentan como éxitos ni reabren preguntas anteriores.

Back/close ACTIVE muestra confirmación. Cancelar conserva el draft. Confirmar espera abandon; si falla, permanece en el intento y muestra error. Si se perdió start, recupera exclusivamente esa misma intención en la pantalla montada antes de abandonar. Si abandon informa que ya terminó, se verifica que el resultado consultado pertenezca al mismo intento. Back durante una petición espera su resolución/timeout. El botón de salida vuelve a estar disponible después.

Questions reutiliza **ActivityStep**, sus inputs, selección, contextos públicos y **MatchingPairs** de Lessons para las cuatro Activities. El modo `DIAGNOSTIC` fuerza feedback nulo y oculta pistas/retry pedagógico, sin modificar el comportamiento por defecto de Lessons/Review. Usa headers, safe areas, teclado, audio y ProgressBar existentes; la barra representa la posición actual de la pregunta, nunca score académico.

Result muestra recommendedLevel y Course nullable; completedAt se conserva en el contrato pero no se muestra tras el polish visual. No crea strengths/reinforcement ni espacios reservados para ellos. Reutiliza CourseCard con etiqueta de acción contextual y `catalogDestination`: sin progreso/NOT_STARTED → CourseDetail; IN_PROGRESS/COMPLETED → Roadmap. El curso conserva su acceso/progreso backend. No se llama Course start. La navegación reemplaza Diagnostic al abrir el curso y elimina la ruta al explorar Courses, por lo que Back no puede reabrir Questions.

Home NEW usa `hero.diagnosticAvailable`: true conecta el hero actual; false ofrece el curso inicial/catálogo sin CTA de Diagnostic. ASSESSED añade **Ver mi resultado**. No cambia precedencia. El refresco al enfocar Home ya existente obtiene el estado nuevo. Los previews DEV de Home siguen siendo sólo visuales: seleccionar **REAL** para operar el backend.

Result ofrece **Repetir diagnóstico**, vuelve a cargar Intro y crea un intento nuevo sólo al confirmar Comenzar. Profile permanece intacto. Falta una entrada permanente a resultado/retake para quien ya tenga Home ACTIVE/COURSE_COMPLETED.

## Mockups y deuda visual

Los cinco originales están en `docs/mockups/diagnostic/`, con precedencia en su README: Intro/Question/Result A1 primarios; Home sólo integración; Result comercial secundario. Sin Skip, chip privado, compra única, paywall ni start directo. Se usa el logo oficial actual porque no existe una ilustración oficial equivalente a los mockups. Quedan la ilustración definitiva y aceptación visual física (tamaños de fuente grandes, Android estrecho, teclado y lector de pantalla); exportar no sustituye esa aceptación.

## Aceptación física Android

### Flujo habitual: DEV · Diagnostic, sin comandos por escenario

Con Backend development y Expo ya funcionando contra PostgreSQL local `teacher_alma_dev`, abrir **Inicio → DEV · Diagnostic** (junto a los controles DEV de Home). No seleccionar el preview visual NEW; el panel prepara datos reales y vuelve automáticamente a Home REAL.

1. **Preparar NEW / Restablecer Diagnostic NEW**: selecciona al usuario fijo `diagnostic-dev`, elimina sólo sus CourseProgress y attempts Diagnostic (con sus answers) y refresca Home. El panel se cierra al cambiar el escenario. Tocar normalmente **Hacer diagnóstico** → Intro → Comenzar.
2. **Preparar ASSESSED · A1** o **A2**: restablece esos mismos datos personales y contesta las cuatro preguntas demo a través del servicio real. Scoring, evaluación, receipts, COMPLETED y recomendación se guardan realmente. Home muestra ASSESSED; **Ver mi resultado** abre el Result real. **Repetir diagnóstico** sigue creando un intento normal.
3. **Limpiar intento activo**: marca ACTIVE como ABANDONED para el usuario dedicado; conserva COMPLETED y CourseProgress. No promete NEW si hay un curso activo o un resultado previo.
4. **Volver al usuario habitual**: vuelve a la identidad configurada originalmente en Backend, sin cambiar `DEV_AUTH_USER_ID` ni reiniciar procesos. El estado del usuario habitual se conserva.
5. Si el demo no está publicado o faltan los cursos con contenido, muestra error y revierte la preparación. No recrea catálogo. Si se pierde la conexión, consultar el escenario al reabrir el panel antes de reintentar; no se muestra éxito sin confirmación.

La selección es local a la sesión de la app, mediante el alias cerrado `diagnostic-dev` en `X-Teacher-Alma-Dev-Learner`. Al recargar Expo vuelve al usuario habitual; basta preparar/seleccionar otra vez desde el panel. No se crean usuarios nuevos por pulsación. Sólo el backend resuelve el alias al UUID reservado `6ac0de00-0000-4000-8000-000000090001`; no acepta UUID arbitrarios del cliente.

Las únicas rutas nuevas son **GET/POST `/dev/diagnostic`**, separadas de `/diagnostic`, con acciones cerradas NEW, ASSESSED_A1, ASSESSED_A2 y CLEAR_ACTIVE. El módulo operativo sólo se carga/registra si `NODE_ENV=development` y DATABASE_URL apunta a localhost/127.0.0.1/::1 con nombre `teacher_alma_dev`. Fuera de ese entorno no hay registro en server; el router además rechaza acceso si se monta accidentalmente deshabilitado. Son herramientas para un servidor local de confianza, no autenticación para un servidor expuesto a Internet.

Mobile carga panel, controlador e identidad sólo bajo `__DEV__`. El cliente de producción nunca añade el header. Cambiar escenario reemplaza cachés Home/Progress/Gamification y remonta la navegación, descartando estados locales de pantallas anteriores. Las respuestas tardías quedan en instancias antiguas y no pueden sobrescribir la identidad nueva. Home se consulta de nuevo; Diagnostic no tiene caché persistente que invalidar. Una operación de tienda pendiente bloquea el cambio de identidad para no trasladar un retry entre usuarios.

No se borran usuarios, contenido compartido, Lessons, Activities, definiciones ni datos de Gamification/Review/LearningDay. Tampoco se borra el historial personal de Lessons/Unit Challenge: esta herramienta restablece exclusivamente la entrada Diagnostic/Home solicitada, no todo el aprendizaje del usuario dedicado.

### Fallback técnico opcional y arranque inicial

Los comandos siguientes siguen disponibles para depuración o primera instalación. **Crear usuarios manualmente/cambiar DEV_AUTH_USER_ID ya no es el procedimiento normal para cambiar escenarios.** La matriz física de Activities, A1/A2, red, abandono y retakes de abajo sigue aplicando usando el panel.

Precondición: PostgreSQL local `teacher_alma_dev`, migraciones y Courses demo existentes con A1/A2 PUBLISHED y contenido. **No ejecutar reset de Courses/Lessons para esta prueba**. Si el check falla, resolver esa precondición sin borrar progreso.

En PowerShell, terminal Backend:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\backend
$env:NODE_ENV = 'development'
node --import tsx scripts/seed-diagnostic-demo.ts --check
```

Si el Diagnostic demo aún no está publicado, `node --import tsx scripts/seed-diagnostic-demo.ts --apply` usa el seed existente (sólo entorno local/demo); repetir `--check`. No usarlo para reemplazar contenido editorial de producción.

Para obtener Home NEW real sin alterar al usuario demo con progreso, crear un usuario nuevo de aceptación. Este bloque crea **un usuario nuevo cada vez**, conserva los anteriores y sólo permite la base local:

```powershell
$diagnosticLearner = @'
import { randomUUID } from 'node:crypto';
import { prisma } from './src/shared/prisma.ts';
const url = new URL(process.env.DATABASE_URL ?? '');
if (process.env.NODE_ENV !== 'development' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/teacher_alma_dev') throw Error('Local demo only');
try {
  const id = randomUUID();
  await prisma.user.create({ data: { id, email: `diagnostic-mobile-${id}@example.test`, displayName: 'Diagnostic demo', timezone: 'America/Chihuahua' } });
  console.log(id);
} finally { await prisma.$disconnect(); }
'@ | node --import tsx --input-type=module
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el usuario de aceptación' }
$env:DEV_AUTH_USER_ID = $diagnosticLearner.Trim()
Write-Host "Usuario de aceptación: $env:DEV_AUTH_USER_ID"
npm run dev
```

Detener previamente cualquier Backend en el puerto 3000 y usar esa terminal, ya que la identidad DEV es configuración del proceso servidor, no un parámetro enviado por Mobile. Al terminar, Ctrl+C y `Remove-Item Env:DEV_AUTH_USER_ID` restauran la configuración habitual al siguiente arranque (no se edita `.env`). No es una cuenta de autenticación productiva.

En otra terminal, iniciar Mobile por LAN:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\mobile
$diagnosticLan = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1
$env:EXPO_PUBLIC_API_URL = 'http://' + $diagnosticLan.IPv4Address.IPAddress + ':3000'
npx expo start --host lan --port 8081
```

Android y PC en la misma red; comprobar `http://<IP-PC>:3000/health` desde el teléfono. Abrir el QR con Expo Go compatible con el SDK del proyecto (57). En Home seleccionar REAL si el selector DEV está desplegado.

1. Home debe ser NEW con **Hacer diagnóstico**. Intro demo indica 4 preguntas/5 min desde API. Ahora no vuelve sin crear intento.
2. Comenzar y recorrer MC → Fill options → Fill text → Matching TAP. Ver posición/barra; nunca aciertos, explicación, score, Skip o nivel académico privado.
3. Para A2: **Hello!**, **is**, **went**, Book ↔ libro y Cup ↔ taza. Para A1: **Goodbye!**, y las demás igual. Estas respuestas son sólo la receta del seed demo, nunca lógica Mobile.
4. El último envío abre Result; no hay pantalla de aciertos ni llamada complete. Las secciones cualitativas nulas no dejan huecos. Ver curso recomendado abre Detail; no inicia progreso. Volver a Home muestra ASSESSED mientras no se haya iniciado un curso.
5. Home ASSESSED → Ver mi resultado consulta el resultado vigente. Repetir diagnóstico → Intro → Comenzar crea otro intento. El último COMPLETED sustituye la recomendación vigente; abandonar un retake conserva la anterior.
6. En una pregunta, chevron y Back Android solicitan confirmación. Cancelar conserva selección. Salir espera abandon. Volver a entrar empieza desde pregunta 1 con intento nuevo.
7. Desactivar Wi-Fi durante submit: no avanza sin confirmación; al fallar/timeout conserva selección bloqueada. Restaurar Wi-Fi y Reintentar envío: avanza una sola vez. Repetir durante abandon: no sale fingiendo éxito; restaurar red y confirmar salida.
8. Tras Result → CourseDetail/Roadmap o Courses, Back no vuelve a Questions. Para comprobar Roadmap con progreso previo, iniciar un curso **desde CourseDetail**; volver a Result aún montado no es posible por diseño. La resolución IN_PROGRESS/COMPLETED está cubierta por tests de Courses y Diagnostic, y una futura entrada permanente permitirá acceder cómodamente desde Home ACTIVE.
9. Antes y después de un Diagnostic, sin iniciar/completar Lessons ni Review, comprobar iguales monedas, streak, progreso y pendientes de Review. El flujo sólo emite las cinco rutas Diagnostic; no ejecuta mutaciones de aprendizaje. Home conserva sus lecturas/reconciliación habitual de Gamification, ajena a Diagnostic. Para comparar, hacerlo el mismo día y sin otras acciones de aprendizaje.
10. Force-stop/reiniciar Expo: no se restaura una pregunta ACTIVE. La siguiente intención Comenzar es nueva. Probar fuente grande, ancho estrecho y teclado en Fill text antes de aceptación visual.

## Validación automatizada

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\mobile
npm run typecheck
node --test --test-reporter=spec tests/diagnostic.test.cjs tests/home.test.cjs tests/home-navigation.test.cjs tests/lesson-runs.test.cjs tests/lessons-replay.test.cjs tests/lessons.test.cjs tests/lessons-v6.test.cjs tests/lessons-v7.test.cjs tests/courses.test.cjs tests/review.test.cjs
node node_modules/expo/bin/cli export --platform android --output-dir dist/diagnostic-v1-check
git diff --check
```

Tests de flow y navegación usan API inyectable/StackRouter real; los checks de UI reutilizan el harness ligero existente, sin snapshots. No se añaden renderers alternativos ni un Diagnostic fake accesible desde producción.

Validación de la entrega Mobile original: TypeScript correcto; 116 tests pasaron, sin fallos ni skips; export Android/Hermes correcto (1106 módulos); `git diff --check` limpio. El primer export falló por permisos al escribir el temporal Hermes dentro del sandbox; el mismo comando pasó fuera del sandbox sin cambiar código. El check de PostgreSQL del seed existente confirmó available=true, 4 preguntas y 5 minutos, sin modificar datos. No se ejecutó aceptación en dispositivo físico ni suites Backend completas; Backend no cambió.


### Validación Diagnostic DEV Tools

Backend TypeScript y 50 tests DEV/Diagnostic/Home correctos, incluidos HTTP, PostgreSQL aislado, concurrencia y ausencia de acceso DEV fuera de development. Mobile TypeScript y 171 tests correctos (incluyen los 116 anteriores y regresiones Gamification/Progress por el cambio de caché de identidad). Se corrigió el harness de navegación de Gamification, que todavía no reconocía la ruta Diagnostic existente.

Export de producción Android con `--no-bytecode` para inspeccionar JavaScript: sin `/dev/diagnostic`, `X-Teacher-Alma-Dev-Learner`, alias `diagnostic-dev` ni marcadores del panel operativo en el bundle. El flag sólo se usó para esta inspección, no modifica la configuración Hermes del proyecto. `git diff --check` correcto. La aceptación física del panel queda pendiente en el dispositivo. No se modificó el seed/catalogo local ni el usuario habitual durante esta validación; las pruebas de escritura usaron esquemas aislados.


### Segunda iteración visual de Diagnostic

Intro usa una composición gráfica con el logo oficial, formas decorativas e iconografía existente; metadata compacta y beneficios breves sobre blanco. En development el sufijo exacto `(demo)` pasa del título al eyebrow DEMO; producción conserva el título íntegro. Ahora no es una acción de texto.

Questions usa barra fina sin porcentaje textual, basada en posición/total (1/4 → 25%, 4/4 → 100%). ActivityStep sólo en modo DIAGNOSTIC centra su encabezado y ajusta spacing/tamaño del título; mantiene inputs, selección, conexiones Matching, scroll y footer fijo. No se altera el comportamiento ni el estilo por defecto de Lessons/Review.

Result prioriza el nivel con decoración geométrica suave y acento rojo. Se omite la fecha visualmente y la aclaración de no certificación pasa al cierre. CourseCard conserva acceso/progreso reales y navegación, pero `showAction=false` oculta su CTA interna y permite títulos/descripciones largos sin truncar: queda una sola CTA roja externa. Explorar usa borde ligero y retake un enlace discreto. ProgressBar recibe `minimal` optativo; ambos componentes conservan sus defaults fuera de Diagnostic.

El flujo anterior fue aceptado físicamente por el usuario. Esta nueva composición requiere revisar de nuevo Intro/Result A1/A2 en Android ~360dp, fontScale normal/1.3–1.5, títulos largos, scroll, safe areas y Fill Text con teclado. No se generaron imágenes de Alma ni se modificaron mockups originales. Permanece pendiente una ilustración oficial si se busca la fidelidad figurativa exacta del mockup.

Validación de esta iteración: Mobile TypeScript y 118 pruebas Diagnostic/Lessons/Courses/Home/Review correctos, incluida regresión de los defaults de CourseCard/ProgressBar y conservación de navegación/accesibilidad. Export Android con bytecode Hermes correcto en `dist/diagnostic-visual-v2-check`; `git diff --check` correcto. No se ejecutó Backend ni se realizó aceptación física del nuevo polish.

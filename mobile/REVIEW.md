# Mobile Review v1

## Prueba real

Con el backend/Expo de desarrollo de mobile/LESSONS.md, completar una lección normal
con al menos una respuesta incorrecta. Lesson Result muestra el número local y
«Repasar ahora». READY consulta el total global elegible. Empezar conserva el batch
recibido (máximo 5) y prioriza la lección de entrada.

Incorrecta → feedback/corrección → Continuar, sin Pista ni retry. El resultado cuenta
solo respuestas confirmadas de ese batch. Conflictos 404/409 se omiten y nunca se
cuentan como aciertos. Un token inválido cierra el recorrido con un resumen parcial.
Back durante el batch confirma la salida; salir no borra respuestas del servidor.

## Entrada rápida DEV

### Baseline combinado para Review V2

Un solo comando restaura los fixtures del usuario dev y deja ambas entradas listas:

    Set-Location C:\software-development\projects\teacher-alma-app\backend
    node --import tsx ../mobile/scripts/prepare-review-demo.mjs --prepare --baseline

Resultado: A1 2/8, Lesson 3 current/incomplete, Lesson 4 incomplete, A2 sin iniciar,
cero LessonRuns ACTIVE y seis ReviewItems ACTIVE. Genera Review mediante completions
reales y luego restaura el progreso demo de Lessons conservando Review mediante
`--reset --lessons --keep-review`. Esta combinación es solo infraestructura demo;
no representa un nuevo comportamiento de producto. Repetir el mismo comando restaura
el escenario, incluso después de responder Review. Salir del batch anterior y entrar
de nuevo desde «DEV · Abrir Review», o recorrer Lesson 3 → Result → Review.

Cada `--apply`/`--reset` del seed deriva automáticamente el origen de `/demo-media`
de la interfaz IPv4 LAN de salida del sistema y del PORT del backend (3000 por defecto).
Actualiza las mismas fixtures compartidas por Lessons y Review, sin persistir localhost
ni una IP antigua de `.env`. No hay servidor de media separado. Si cambia la red,
ejecutar el comando anterior (o `--apply` para conservar progreso). Una configuración
LAN ambigua sin ruta de salida falla antes de escribir, en lugar de guardar una URL rota.
La API de desarrollo debe estar activa y accesible desde el teléfono en la misma LAN.

READY V2 usa hero compacto con bombilla existente, tipografía más ligera, cards pastel
por Topic y counts en badges. Sin mascota final disponible, no se inventa un personaje,
descripciones de Topics ni controles sin acción. RESULT y ActivityStep no cambian.

Inicio → «DEV · Abrir Review» (solo __DEV__; no existe en producción).
Usa exactamente los mismos endpoints y reglas que la entrada desde Lesson Result.
La salida de esta entrada global vuelve a Cursos.

Desde PowerShell, reutilizando .env y fixtures existentes:

    Set-Location C:\software-development\projects\teacher-alma-app\backend

    node --import tsx ../mobile/scripts/prepare-review-demo.mjs --prepare

El script reutiliza los guards y --apply del seed. Conserva el aprendizaje existente,
completa las lecciones demo 3/4 aún incompletas con respuestas incorrectas mediante
LessonService y deja Review ACTIVE real (hasta seis items, batch máximo cinco).
No inserta ReviewItems directamente ni modifica el backend. No necesita otro servidor.
Las lecciones ya completadas se respetan: no reactiva por fuera del lifecycle.
Puede ejecutarse con el servidor existente; no requiere reiniciar Metro.

Para reproducir desde cero si ambas lecciones ya estaban completadas/resueltas,
restablecer explícitamente el escenario demo con el mecanismo existente, y preparar:

    node --import tsx scripts/seed-courses-demo.ts --reset --lessons
    node --import tsx ../mobile/scripts/prepare-review-demo.mjs --prepare

Ese primer comando borra aprendizaje del usuario demo para los fixtures; usarlo solo
cuando se quiera restablecer ese escenario. No se ejecuta automáticamente ni afecta
otros usuarios. Para la prueba manual Lesson → Result → Review, usar el baseline
--reset --lessons sin ejecutar el preparador automático después.

El reset elimina primero los attempts LESSON del scope existente y los attempts
REVIEW del usuario dev ligados exactamente a los ReviewItems demo que va a borrar;
después elimina esos items y restaura el progreso demo. Conserva las constraints
productivas y también funciona después de responder Review (incluido lessonId null).
Al restaurar, salir del Review abierto y volver a entrar: su batch anterior ya no
corresponde al nuevo escenario.

Regresión end-to-end reproducible, desde backend (restaura los fixtures del usuario
configurado, usa los endpoints HTTP y deja A1 2/8 con seis items ACTIVE al terminar):

    $env:RUN_REVIEW_DEMO_RESET_TESTS = '1'
    node --import tsx --test scripts/review-demo-reset.test.ts
    Remove-Item Env:RUN_REVIEW_DEMO_RESET_TESTS

## Red, navegación y aceptación Android

- Desconectar red al comprobar; reconectar y «Reenviar respuesta»: misma respuesta,
  requestKey y token. Los inputs quedan bloqueados mientras el resultado es incierto.
- Comprobar repetidamente no duplica envíos. El feedback siempre requiere Continuar.
- Back físico/chevron durante IN_PROGRESS abre confirmación; cancelar conserva todo.
- READY vacío: estado positivo sin CTA de inicio. Tabs ocultos en la pantalla Review.
- Comprobar fuente ampliada, ancho estrecho, teclado, audio y Matching TAP.
- RESULT distingue corregidos, respondidos pendientes y omisiones; no usa score de Lesson.
- El preparador no sirve para simular expiración comercial ni altera entitlements.

Mockups guardados en docs/mockups/review. Se usa el design system existente y el hero
de completitud de Lessons: no se extrae el personaje desde una captura de pantalla.
No se inventan nombres de usuario, descripciones de Topics ni audio del mockup.
Los Topics son filas informativas, sin chevrons/acciones ficticias. El botón final
vuelve a la ruta del curso de entrada, como exige Review v1.

Validación:
    node node_modules/typescript/bin/tsc --noEmit
    node --test tests/*.test.cjs
    node node_modules/expo/bin/cli export --platform android --output-dir dist/review-v1-check

El export no sustituye aceptación física Android.

# Mobile Video spike — segunda iteración

Segunda aceptación física realizada por el usuario; microcierre implementado, retest pendiente. La primera prueba,
reportada por el usuario, confirmó inline y fullscreen nativo Android, controles
propios viables pero innecesarios, preferencia por controles nativos y error/retry
conceptualmente funcional. Se descarta la frontera F/bloqueo forward seek.
No se actualizan aún los contratos canónicos de Video Infrastructure.

## Acceso

Usar backend/demo existentes (LESSONS.md). No hace falta reset si existe la demo.

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\mobile
$env:EXPO_PUBLIC_VIDEO_SPIKE = '1'
npx expo start --clear --lan
```

Expo Go compatible SDK 57 → Courses → Inglés A1 → Roadmap → Nice to meet you!
→ primer contenido después del diálogo. También disponible en Replay.
Lesson ID: 6ac0de00-0000-4000-8000-000000001003. Se conservan controles de acceso.
Desactivar quitando Env:EXPO_PUBLIC_VIDEO_SPIKE y reiniciando Metro --clear.
El flag exige además __DEV__. Sin Backend/Mux/VideoAsset/migraciones/AsyncStorage
ni nueva persistencia académica. Continuar usa la acción existente del flow.

## Experiencia

“La Teacher Alma te explica esto”, breve descripción, poster limpio con Play nativo, player
16:9 contain sin recorte y controles/fullscreen nativos. Sin transporte custom.

- REQUIRED pendiente: “Mira el video para continuar.”
- REQUIRED completo: “Video completado. Ya puedes continuar.”
- OPTIONAL: “Video opcional. Puedes continuar cuando quieras.”

REQUIRED habilita Continuar con >=90% único; OPTIONAL siempre lo permite.
“Pruebas DEV”, colapsado bajo el estado, abre posición, segundos únicos/duración,
rangos, toggle REQUIRED_WATCH/OPTIONAL e inyector de error local. Cambiar modo
no borra cobertura. Error real + Reintentar permanecen visibles fuera de DEV.
Retry mantiene rangos/posición y espera Play, sin acreditar el seek de recuperación.

## Algoritmo y límites

VideoWatchedCoverage mantiene la unión ordenada de intervalos reproducidos.
Solapamientos y adyacencia exacta se fusionan: tolerancia de merge = 0 segundos.
No se rellenan gaps. 0–30 + seek60 + 60–100 = 70 únicos. Repetir no suma dos veces.
Se compara segundos únicos/duración >=0.9 sin redondear para habilitar Continuar.

La API pública instalada no tiene evento explícito de native seek. timeUpdate
solicitado cada 250 ms compara posición con performance.now, playing, ready y rate.
Delta positivo <= elapsed * playbackRate + 0.100 s es plausible; 100 ms absorben
jitter pequeño. Silencios >1 s nunca se puentean. Pausa, error/buffering, cambio
de velocidad o AppState cortan el ancla. Saltos incompatibles no acreditan el
tramo: anclan el destino y sólo reproducción posterior plausible empieza a sumar.
No se limita/corrige la posición del usuario. Seek90/final no completa por sí solo.

Limitación: seeks pequeños indistinguibles del playback dentro del sampling y
tolerancia pueden acreditarse. Es evidencia pedagógica del cliente oficial, NO
anti-cheat ni prueba exacta del servidor. Eventos perdidos/stalls/último fragmento
antes de pausa o fin pueden subcontar y requerir repetir algún tramo. Confirmar
jitter real en Android antes de promover a producción.

## Ciclo de vida y fixture

Un player/coverage por montaje/run. Fullscreen nativo conserva dueño, posición y
rangos; sin Modal propio. En Android la Activity nativa controla landscape/retorno, sin cambiar orientación de Navigation; iOS conserva su callback de orientación. Background pausa/corta ancla, conserva rangos; foreground
espera Play. Abandono + reentrada, remount o process death empiezan vacíos.
No Resume entre runs ni persistencia. Iniciar video detiene lessonAudio; audio
focus completo de producción queda pendiente.

expo-video ~57.0.5, Expo 57.0.24, RN 0.86.3. Plugin desactiva background playback
 y PiP; orientación global portrait. Expo Go no prueba config standalone.
Fixture propia silenciosa segments.mp4: 25 s, 640×360, 10 fps, 395169 bytes;
Intro/Parte 1/Parte 2/Parte 3/Final cada 5 s, timestamp y poster.png.
Generador scripts/generate-video-spike.py (OpenCV/numpy) valida 250 frames y
reemplaza atómicamente. mp4v por falta de encoder H.264 local; no es codec final.
Sin captions ficticios. No regenerar fixture para esta aceptación.

## Segunda prueba física Android

1. Abrir como arriba: poster, REQUIRED pendiente, Continuar bloqueado, DEV cerrado.
2. Play inline, controles nativos, seek libre adelante/atrás. Pausar 5 s: no sumar.
3. Nueva entrada: ver 0–7.5, seek15, ver 15–25: aproximadamente 17.5 únicos/70%,
   con posible submuestreo, sin completar. Abrir DEV para consultar rangos reales.
4. Repetir 0–7.5: no duplicar. Cubrir hueco 7.5–15: habilitar al alcanzar 22.5
   únicos (90%). Llegar a posición22.5 por sí solo no basta.
5. Nueva entrada, seek directo90%/final: no completar.
6. Durante reproducción entrar fullscreen nativo, rotar, seek y salir con control
   y Android Back: mismo clip/posición/rangos; cerrar fullscreen no abandona Lesson;
   volver portrait. Probar rotación del dispositivo activada/desactivada.
7. Background/foreground: pausa y conserva, sin sumar tiempo oculto. Abandonar
   confirmando/reentrar y force-close/reabrir: cero, sin Resume.
8. Abrir Pruebas DEV, OPTIONAL: copy opcional y Continuar inmediato. Volver REQUIRED:
   gate según cobertura existente, sin borrar rangos.
9. Con cobertura parcial provocar error local; Reintentar recupera clip/posición/
   rangos y espera Play. Recuperación no suma un salto.
10. Completar/continuar flow normal; revisar Android estrecho, fuente grande,
    TalkBack y retorno al audio Lesson.

La segunda prueba fue realizada por el usuario; confirmó el player/política y detectó los problemas de lifecycle descritos abajo. Fixture local no
valida buffering sostenido/red, HLS, URLs firmadas, text tracks, codec final ni
finalización offline. No abrir tercera ronda sin un problema físico real.

## Promover / retirar

Promover tras aceptación: unión de intervalos/tests con límites documentados,
propiedad del player/cobertura, controles/fullscreen nativos y presentación.
Integrar luego modo/duración/evidencia del contrato real y validación backend.
Retirar flag, ID fijo, fixtures/generador, modo/inyector/métricas DEV; reemplazar
gate experimental. Quitar imports de fixtures antes de shipping para no incluirlos.

## Validación

```powershell
npm run typecheck
node --test tests/video-spike.test.cjs tests/lesson-runs.test.cjs tests/lessons-replay.test.cjs
$env:EXPO_PUBLIC_VIDEO_SPIKE = '1'
npx expo export --platform android --output-dir dist/video-spike --dev
```

Validación de la segunda iteración previa al microcierre: TypeScript OK; 56 tests OK (10 spike + 46 Lessons/run/replay); Android DEV export OK (1262 módulos, MP4 completo de 395169 bytes y poster); git diff --check OK. Export verifica
bundling, tests lógicos no sustituyen aceptación Android. Sin tests Backend.



## Microcierre tras segunda aceptación Android

El usuario confirmó inline, controles, seek libre, coverage, REQUIRED/OPTIONAL,
fullscreen/landscape, error/retry y completion >=90%. Se mantiene el algoritmo
sin cambios, así como no-resume y el alcance exclusivamente Mobile.

Causa comprobable en código de la pausa: el listener JS pausaba en cualquier
AppState no-active; Android abre otra Activity para fullscreen. Expo ya tiene
VideoManager.shouldPauseVideo que excluye isInFullscreen y FullscreenPlayerActivity
que pausa al abandonar realmente esa Activity. Ahora Android delega en ese lifecycle
nativo (staysActiveInBackground=false). AppState sólo corta el ancla de coverage;
playing del player nativo decide si hay reproducción. Sin play automático ni
restaurar snapshots obsoletos que podrían ignorar una pausa del usuario.
Los callbacks fullscreen tampoco hacen seek, pause o play. En Android se elimina
la orientación concurrente de Navigation y fullscreenOptions pide landscape.

Black frame: NO se reprodujo con trazas en dispositivo y no se afirma una causa
única confirmada. La implementación instalada transfiere el ExoPlayer a otra
PlayerView y lo vuelve a adjuntar en finish/exitFullscreen. Se mitiga el problema
de superficie inline usando textureView constante, manteniendo VideoPlayer y
VideoView montados, y eliminando la reorientación concurrente del host. No se
reemplaza source, cambia key, fuerza seek ni recrea player al volver. Validar
especialmente retorno pausado y al final; un fallo persistente requiere evidencia
nativa y seguiría bloqueando el cierre.

Se elimina el PlayCircle custom inicial. El poster queda detrás del VideoView,
sin interceptar gestos; onFirstFrameRender lo retira. El Play es nativo desde el
inicio. Este callback sólo gestiona el poster: no pretende reparar la superficie.

PlayerBuilderOptions (tercer argumento de useVideoPlayer, disponible en 57.0.5):
Android seekBackwardIncrement=5, seekForwardIncrement=10, unidades segundos.
iOS no recibe estas opciones Android-only. Pending usa Clock3 y el copy corto
“Mira el video para continuar.”; completado usa CircleCheck y conserva su copy.
OPTIONAL conserva el copy aprobado. Status reserva dos líneas (46 * fontScale),
sin altura máxima ni truncar fuente grande. DEV sigue colapsado y funcional.

Al terminar loop=false: no hay handler que rebobine o reinicie cobertura. La
posición final queda bajo control nativo y la barra debe mostrarse completa;
el Play/replay nativo puede empezar de nuevo por decisión del usuario, sin borrar
completion. Tests verifican ausencia de reset; frame/barra requieren teléfono.

Retest final (misma ruta/flag):
1. Antes del primer Play, confirmar poster/frame preparado y un solo Play nativo.
2. Reproduciendo, entrar/salir fullscreen varias veces, rotar y cerrar con Back:
   conservar reproducción, posición y coverage, sin negro ni pérdida de controles.
3. Pausar antes de entrar; entrar/salir: conservar pausa y frame. Repetir pausando
   dentro de fullscreen antes de salir. No debe haber autoplay.
4. Home/background real tanto inline como fullscreen: pausa, no crédito oculto;
   volver no debe forzar Play. Comprobar el comportamiento nativo en Expo Go.
5. Llegar al final inline y fullscreen, salir: frame/controles útiles, barra completa,
   sin rewind automático. Replay nativo funciona y mantiene completion satisfecho.
6. Verificar botones −5/+10, copy corto/Clock3 → CircleCheck sin salto perceptible;
   comprobar fuente grande, OPTIONAL y error/retry en Pruebas DEV.

No hay bloqueo de código conocido adicional; continuidad/superficie y final nativos
siguen sujetos a este retest. Si pasa, cerrar spike y promover en la siguiente tarea.

Validación del microcierre: TypeScript OK; 58/58 tests (12 spike + 46 Lessons/run/replay); Android DEV export OK, 1262 módulos y fixtures completos; git diff --check OK. Retest físico pendiente.

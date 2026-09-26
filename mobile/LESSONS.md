> Referencia vigente: «Lessons Mobile V7» al final para arranque y aceptación; «Lessons Session Semantics v1» para reglas. V2–V6 son historial. V7 reproduce audio dentro de la app.

# Mobile Lessons v2 — UX y prueba Android

V2 conserva el cliente/API y flujo local de V1. No cambia scoring, Review, resume, completion ni acceso. No añade dependencias. Las capturas Android suministradas son el punto de partida V1; los mockups versionados son dirección visual.

## Cambios V2

- Cabecera propia compacta: chevron azul, topic, posición, progreso real debajo. Sin título grande repetido en activities. Back de Android y chevron vuelven al paso anterior; desde el primero salen a Roadmap. Los tabs permanecen ocultos durante Lesson/Result.
- Back/forward conserva respuestas y feedback de esta sesión sin reenviarlos. Tras reabrir, resume usa el pointer real del backend. Los required anteriores pueden leerse sin inventar attempts; un optional no se considera completado por estar antes del pointer. No hay restart ni borrado implícito.
- TEXT con foco y título azul; EXAMPLE con conversación y burbuja; SUMMARY con «Lo que aprendiste» y círculos numerados. No se infiere que secondaryText sea un interlocutor: el contrato también permite traducción. No hay audio ficticio.
- Fill blank centra la frase, mantiene input/opciones y Pista contextual solo cuando hay hint. No inventa imágenes.
- Incorrecto: Continuar + Intentar de nuevo. Correcto: solo Continuar. Retry correcto con Review pendiente usa «¡Ahora sí!» y explica que el primer intento sigue contando.
- Matching TAP: anchors, azul emparejado, curvas con segmentos nativos medidos por layout; verde/rojo y check/texto después del feedback real. Sin Par 1/Par 2. DRAG no implementado.
- Result compacto: check, título, score «correctas al primer intento», progreso, Review informativo. Premium se integra como SIGUIENTE LECCIÓN + título + requiere acceso. No hay compra ni botón Review muerto.
- Roadmap espera datos frescos y geometría medida, posiciona una vez por entrada cerca de CURRENT (también ACCESS) o última lección completada al finalizar el curso. Arrastrar cancela el posicionamiento pendiente; refresh no vuelve a perseguir el nodo.

## Arranque exacto (PowerShell)

Terminal 1, usando la configuración backend de desarrollo existente, sin editar `.env`:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\backend
node --import tsx scripts/seed-courses-demo.ts --reset --lessons
node --import tsx scripts/seed-courses-demo.ts --check
npm run dev
```

El reset borra solo el aprendizaje demo del usuario de desarrollo configurado y deja A1 **2/8**, A2 sin iniciar. Debe haber 11 bloques y 4 actividades; guards siguen exigiendo teacher_alma_dev local. VIDEO opcional sin URL en Nice to meet you! permite probar composición/scroll sin proveedor externo. No es contenido definitivo de Alma.

Terminal 2:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\mobile
$lan = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1
$env:EXPO_PUBLIC_API_URL = 'http://' + $lan.IPv4Address.IPAddress + ':3000'
npx expo start --host lan --port 8081
```

Usar la interfaz LAN compartida con el teléfono; comprobar `$lan` si hay VPN. Backend usa puerto 3000 salvo configuración local diferente. PC y Android en la misma red; Expo Go compatible con SDK 57. Escanear QR, o recargar la sesión existente después del seed. Verificar `http://<IP-PC>:3000/health` desde el teléfono si falla la conexión. Si backend/Metro ya están ejecutándose, reutilizar esas terminales evitando duplicar puertos.

## Recorrido físico V2

1. Cursos → Inglés A1: Roadmap debe abrir cerca de **3. Nice to meet you!**, no arriba. Desplazarse libremente y refrescar: no debe recolocarse durante esa visita.
2. Abrir lección 3. Confirmar chevron azul, topic/posición en cabecera y progreso. Revisar TEXT, burbujas EXAMPLE y VIDEO preview. El preview avisa que aún no hay video; no tiene un botón de reproducción inactivo. Hacer scroll hasta Continuar.
3. Multiple choice: elegir **Goodbye!** → Comprobar. Debe quedarse en feedback incorrecto. Solo Continuar primaria e Intentar de nuevo secundaria.
4. Intentar de nuevo → **Nice to meet you!** → Comprobar. Debe decir **¡Ahora sí!**, explicar primer intento y conservar Review; **Intentar de nuevo desaparece**. Pulsar Continuar.
5. Fill options: Pista revela «Empieza con un saludo». Ocultar pista debe funcionar. Seleccionar **Hello** → Verificar → Continuar.
6. Summary: un solo heading «Resumen de la lección», card «Lo que aprendiste», puntos numerados y Finalizar lección. No hay frases/audio/rewards inventados.
7. Result de lección 3: **1/2 correctas al primer intento**, **1 ejercicio para reforzar**, curso **3/8**, próxima «Verb to be». No hay CTA de Review. Pulsar Siguiente lección.
8. En lección 4 revisar Content y avanzar a Fill Blank. La frase «I _____ a student.» debe destacar. Pista muestra la ayuda real. Escribir **om** → Verificar: feedback incorrecto sin avanzar.
9. Intentar de nuevo → escribir **am** → Verificar. Confirmar ¡Ahora sí!, explicación y ausencia de retry. Continuar.
10. Matching: Book → taza y Cup → libro produce pares incorrectos. Antes de enviar, se puede cambiar la asignación sin duplicar imagen. Comprobar debe mostrar conectores/anchors de error y feedback general. Retry: Book → libro, Cup → taza. Comprobar debe mostrar pares verdes, ¡Ahora sí! y solo Continuar.
11. Desde Matching usar chevron: vuelve a Fill Blank anterior con respuesta/feedback de esta sesión. Volver otra vez lleva a Content. Continuar permite recorrer los pasos previos sin reenviar attempts. El back físico Android sigue el mismo comportamiento (con teclado abierto, primero puede cerrar teclado).
12. Summary → Finalizar. Result de lección 4: **0/2 correctas al primer intento**, **2 ejercicios para reforzar**, curso **4/8**. Haber acertado en retry no sustituye las primeras respuestas.
13. Próxima: «Mi familia», Contenido Premium / Requiere acceso, Obtener acceso. Pulsarlo solo muestra información; no abre contenido ni compra. Volver a la ruta debe mostrar la quinta dorada cerca de la posición inicial y las posteriores grises. Salir al catálogo y reabrir A1 también debe llevar cerca de esa quinta lección.
14. Para PERFECT, resetear con --reset --lessons y acertar desde el principio: Nice to meet you!, Hello; después am; Book → libro y Cup → taza. Cada Result muestra **2/2**, sin Review pendiente, misma progresión real.
15. Entrada normal y Replay: usar el recorrido Session Semantics v1 al final.
16. Comprobar pantalla estrecha, fuente ampliada, teclado, safe area, scroll, doble toque y red desconectada. No hay reintentos automáticos. Si se perdió la respuesta de un attempt, salir/reanudar antes de reenviar. El estado de curso completo usa la última lección completada: no requiere ni introduce un escenario de acceso falso.

Para restaurar el dataset Courses habitual **A1 3/8 + A2 sin iniciar**:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\backend
node --import tsx scripts/seed-courses-demo.ts --reset
```

## Verificación y límites

```powershell
# Desde mobile
node node_modules/typescript/bin/tsc --noEmit
node --test tests/*.test.cjs
npx expo install --check
npx expo export --platform android --output-dir dist-lessons-v2-check
# Desde backend
node node_modules/typescript/bin/tsc -p scripts/tsconfig.json
node --import tsx --test scripts/courses-demo.test.ts scripts/lessons-demo.test.ts
node --import tsx scripts/check-lessons-demo.ts --run
node --import tsx scripts/seed-courses-demo.ts --check
```

No hay lint configurado. Check demo valida HTTP/PostgreSQL, VIDEO dentro de CONTENT, score/retry/Review, PERFECT, ACCESS e idempotencia; termina listo en 2/8. El preview en memoria de Courses no sirve para Lessons.

Pendiente: aceptación visual física V2, DRAG, video real/reproducción integrada, audio y Review real. No se muestra contador global de actividades completadas en Summary: GET no distingue completitud individual de todos los optional tras resume. No se altera contrato para inventarlo. Solo dos lecciones tienen contenido demo. Result sigue desplazable cuando pantalla, fuente o texto requieren más altura.

Los tests/build no sustituyen probar el dispositivo. No hay cambios en reglas backend/API/schema/dependencias ni commit/push de esta iteración.

## Lessons Mobile V3 — Visual Fidelity & Motion

V3 conserva el flujo de V2. Usa Lucide React Native 1.47.0 (imports de siete iconos, licencia ISC) y react-native-svg 15.15.4, versión incluida en la matriz local de Expo SDK 57. SVG se comparte entre iconos y conectores; no hay motor de gestos adicional. Las dependencias y el lockfile mobile cambiaron, sin cambios de dependencias backend.

- Roadmap: scroll nativo animado tras medir y recibir el reload de foco; una vez por entrada. Tocar o arrastrar cancela el posicionamiento pendiente. No se vuelve a posicionar al refrescar durante esa visita.
- Loading: spinner pequeño y texto secundario sin CTA. Los errores conservan Reintentar/Volver a la ruta.
- Header: chevron Lucide azul, área de toque 44 × 48, topic flexible y posición compacta; títulos largos pueden ocupar varias líneas sin truncarse.
- Content: description real cuando existe, concepto con icono y borde suave, EXAMPLE con separación entre textos sin asignar hablantes A/B, video horizontal compacto. En pantalla estrecha/fuente grande se apila con preview de 120 px, sin playback simulado.
- Activities: composición que aprovecha la altura disponible, radios de 25 px, opciones de al menos 72 px, frase Fill Blank destacada, input de 68 px y pista con Lightbulb. Acciones se apilan en pantallas estrechas/fuentes grandes.
- Matching: paths cúbicos y nodos SVG en las mismas coordenadas derivadas del layout. La capa visual no recibe toques; permanece TAP. Demo Book/Cup/Ball con PNG local original.
- Result solo reutiliza Check; Summary mantiene su composición. Score, retry, Review, acceso y progresión no cambian.

La fixture agrega descripciones en las dos lecciones demo y una pelota en Matching; conserva IDs, guards, apply idempotente y reset. El caption de video se acorta. No se modifica ningún contrato ni regla backend.

### Preparación Android V3

Terminal backend (reutilizar el servidor si ya está levantado):

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\backend
node --import tsx scripts/seed-courses-demo.ts --reset --lessons
node --import tsx scripts/seed-courses-demo.ts --check
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

Terminal mobile (PC y teléfono en la misma LAN):

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\mobile
$lan = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1
$env:EXPO_PUBLIC_API_URL = 'http://' + $lan.IPv4Address.IPAddress + ':3000'
node node_modules/expo/bin/cli start --host lan --port 8081 --clear
```

Estos comandos usan las dependencias locales y evitan el npx global roto detectado en esta máquina. Escanear el QR con Expo Go compatible con SDK 57. Si se usa development build propio en vez de Expo Go, reconstruirlo para incorporar react-native-svg. No duplicar Metro si el puerto 8081 está ocupado: detener la sesión anterior o reutilizarla.

### Recorrido físico V3

1. Cursos → A1: observar desplazamiento animado hacia Nice to meet you! Tocar/arrastrar durante la entrada y comprobar que toma el control. Desplazarse lejos y refrescar: no debe perseguir ni recolocar durante esa visita. Salir y reentrar debe posicionar una vez.
2. Abrir lección 3: carga breve sin botón Volver a la ruta; errores de red sí ofrecen acciones. No se añade un retraso artificial para hacer visible el loader.
3. Revisar chevron azul, topic largo y 3 de 8, alineación de progreso y safe area. Confirmar título y descripción debajo.
4. Concepto: foco Lucide y heading azul alineados, cuerpo legible. EXAMPLE: textos diferenciados sin etiquetas A/B inventadas. Video: preview a la izquierda y metadata a la derecha, aviso de no disponibilidad sin botón muerto.
5. Multiple Choice: revisar estado sin selección y radio grande. Goodbye! → Comprobar → incorrecto; Intentar de nuevo → Nice to meet you! → ¡Ahora sí!, solo Continuar. Se conserva la explicación de primer intento/Review.
6. Fill options: revisar frase y blank azul, Pista/Ocultar pista y selección. Para el recorrido con Result 1/2, elegir Hello desde el primer intento. En una segunda pasada, elegir Please primero y luego Hello para comprobar incorrecto/retry.
7. Finalizar Summary: Result 1/2, un ejercicio pendiente, curso 3/8. Siguiente lección → Verb to be.
8. Fill text: Pista; escribir om → incorrecto; retry con am → ¡Ahora sí! Revisar teclado, input y Verificar, fuente ampliada y ancho estrecho. Con teclado abierto, back físico primero debe cerrarlo.
9. Matching tiene Book, Cup y Ball. Conectar Book→taza, Cup→libro, Ball→pelota. Verificar que curvas cruzadas llegan exactamente al centro de los nodos. Comprobar: dos pares incorrectos y uno correcto, con texto y color.
10. Retry: Book→libro, Cup→taza, Ball→pelota. Comprobar: verde y ¡Ahora sí!, solo Continuar. Antes de enviar, cambiar un par no debe duplicar imagen. Probar también ancho estrecho/fuente grande: textos crecen y conectores siguen sus nodos tras layout.
11. Chevron desde Matching vuelve a Fill Blank con estado de sesión, luego a Content. Continuar vuelve a recorrer los pasos ya visitados sin reenviar attempts. Probar también back físico con teclado cerrado.
12. Finalizar lección 4: Result 0/2 al primer intento y dos ejercicios pendientes, curso 4/8. Premium es el siguiente paso; Volver a la ruta anima hacia Mi familia. Desplazarse libremente y comprobar que no hace otro auto-scroll en esa visita.

Para restaurar el escenario habitual A1 3/8 + A2 sin iniciar:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\backend
node --import tsx scripts/seed-courses-demo.ts --reset
```

### Validación V3

- Mobile TypeScript y 24 tests: PASS.
- Scripts demo TypeScript y 4 tests: PASS. El primer intento bajo sandbox falló por uv_os_get_passwd ENOMEM; el mismo comando fuera del sandbox pasó sin cambios para el entorno.
- HTTP/PostgreSQL: PASS; cuatro actividades, tres pares, retry/score/Review, PERFECT, ACCESS, apply/reset idempotentes. Termina A1 2/8, A2 sin iniciar.
- Expo install --check: detecta únicamente Expo 57.0.24 frente al parche recomendado ~57.0.25. SVG/Lucide no producen incompatibilidades; no se amplía la actualización de Expo en V3.
- La aceptación visual Android sigue pendiente: ADB no encontró dispositivos. Bundle/tests no acreditan por sí solos calidad visual, fluidez real, TalkBack o comportamiento del teclado.
- Deuda visual intencional: fidelidad final de Summary/Result, medios reales y DRAG quedan fuera de V3.
- Android export final: PASS, 1009 módulos y bundle Hermes de 2,2 MB en `mobile/dist/lessons-v3-check` (salida ignorada por Git). Imports públicos por icono evitan recorrer toda la biblioteca Lucide.
- `git diff --check`: PASS. Sin commit, push ni merge.

# Lessons Mobile V4 — High Fidelity

Esta sección sustituye las observaciones visuales V2/V3 anteriores. V4 usa el Content Contract v2 ya versionado, sin cambios de backend, API, schema, dataset ni dependencias.

## Implementación

- `ContextualHeader`: mismo chevron azul, touch target de 44 × 48, título flexible y safe area para Lesson, Roadmap y Course Detail. Lesson añade posición y progreso. Se conservan los handlers de navegación y la lógica de posicionamiento de Roadmap.
- `LearningIcon`: discos saturados con halo suave, concept blanco y diálogo sólido vectorial; pencil, hint, video y check comparten la familia. Sin nuevos paquetes.
- Content: heading con nivel, título y descripción; TEXT usa exclusivamente segments/KEY, fallback body. Concepto con icono lateral y columna de texto. EXAMPLE DIALOGUE renderiza cada turn con su speakerLabel y traducción, separado de los demás. Se conserva el título configurado («Una conversación sencilla» en el dataset actual); no se cambia por «Ejemplos» mediante heurísticas. EXAMPLE v1 mantiene sus textos/nota sin inventar interlocutores.
- Video: preview 57% / metadata restante cuando hay espacio; apilado en ancho menor de 360 o fontScale mayor de 1.25. Preview neutral sin URL, sin texto técnico ni botón muerto. Una URL real abre externamente; no hay reproductor integrado.
- Activities: título de 27/33, instruction real con fallback, contexto opcional y respuestas siguiendo un orden natural sin centrado vertical expansivo. MC DIALOGUE usa la pregunta de la familia «¿Qué responderías?» y el contexto estructurado, omitiendo el prompt situacional legacy para no repetirlo. TEXT/IMAGE context conservan también el prompt. Fill siempre conserva la frase completa en navy, sin regex ni imágenes inventadas. Opciones/radios grandes; hint y CTA se apilan en pantallas estrechas/fuente grande.
- Feedback: icono, geometría y jerarquía refinados; conserva incorrect → Continue/retry, retry correcto → ¡Ahora sí! y Continue. Button sigue mostrando busy real y bloqueando doble submit.
- Matching: utiliza sin transformar las tres imágenes coloridas que entrega el backend. TAP y unicidad de pares se conservan. Curvas/nodos usan los bordes y centros medidos de cada card y la posición real de la columna derecha, incluso cuando crece el texto. Estados azul, verde y rojo con texto de feedback.
- Summary: título/subtitle real, takeaways con KEY, círculos y divisores; keyPhrases en sección rosa con texto/traducción; fallback points sin frases inferidas. Contador informativo de actividades completadas, sin ratio ni barra que penalice optional pendiente.
- Result: hero SVG de 150 px con halo/check/confeti, celebración perfecta, identidad real de lesson/course/level, score al primer intento, progreso y Review informativo. Próxima accesible/Premium según backend. Siempre la misma acción secundaria azul «Volver a la ruta», incluso sin siguiente lección. No hay monedas, rachas, Review CTA ni Ver mi progreso.
- AudioButton: solo aparece con URL HTTP(S) válida sin credenciales; abre audio externo con mensaje de error si falla. No simula playback ni fabrica audio. Los fixtures actuales no contienen audio, por lo que no muestran controles.

## Contador de Summary y Continue

El contador normal usa activityProgress de las respuestas del run. GET solo expone histórico durable; Replay calcula su contador local. El feedback y Continue no esperan un GET secundario.

La primera publicación de feedback sigue ocurriendo atómicamente con busy=false. La lectura de metadata no cambia attempts, first-attempt score, Review, required progression ni completion.

## Prueba física Android V4 — preparación exacta

No se ha reseteado la base de datos durante esta iteración. Estos comandos preparan deliberadamente el escenario demo para aceptación. Reutilizar backend/Metro existentes si ya ocupan los puertos.

Terminal backend, con la configuración local de desarrollo existente:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\backend
node --import tsx scripts/seed-courses-demo.ts --reset --lessons
node --import tsx scripts/seed-courses-demo.ts --check
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

El reset guardado afecta al aprendizaje demo del usuario de desarrollo configurado, deja A1 2/8 y A2 sin iniciar y aplica el contenido v2 de las lecciones 3/4. PostgreSQL local teacher_alma_dev debe estar disponible. No usar otro dataset ni entorno.

Terminal mobile:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\mobile
$lessonLan = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1
$env:EXPO_PUBLIC_API_URL = 'http://' + $lessonLan.IPv4Address.IPAddress + ':3000'
node node_modules/expo/bin/cli start --host lan --port 8081 --clear
```

PC y Android en la misma LAN; revisar la interfaz elegida si hay VPN. Backend debe escuchar en puerto 3000 y ser accesible desde el teléfono. Escanear QR con Expo Go compatible con SDK 57 o usar el development build existente con react-native-svg. Esta iteración no requiere nuevas dependencias nativas. Los comandos de Expo usan el CLI local para evitar el npx global roto de esta máquina.

## Recorrido Android V4

1. Cursos → Inglés A1 → Roadmap. Debe posicionarse cerca de **3. Nice to meet you!** una vez. Revisar header azul; desplazarse/arrastrar y refrescar sin que persiga de nuevo el nodo. Course Detail conserva su contenido y comparte el mismo back treatment.
2. Abrir lección 3. Header con topic largo, **3 de 8** y progreso real. Content: nivel, título y descripción; frases KEY azules; concepto con glyph blanco/disco azul; turnos **A/B** en burbujas separadas y traducciones. No hay botones de audio porque no hay URLs en el dataset. Video neutral ancho, título/caption, sin aviso de no disponibilidad. Continuar.
3. MC: título grande/instruction, **D** con burbuja «Hi, I’m Daniel.» y traducción; no repetir «Alguien dice…». Ver estado sin selección, seleccionar **Goodbye!** y comprobar radio centrado/azul. Comprobar → incorrecto. Tocar Continuar una vez debe avanzar; para recorrer retry, usar primero **Intentar de nuevo → Nice to meet you! → Comprobar**. Debe mostrar **¡Ahora sí!**, conservar Review y ocultar retry. Continuar una vez.
4. Fill options: frase **_____, I’m Sofía.** con blank navy, sin una imagen ficticia ni grandes huecos. Pista/Ocultar pista; elegir **Hello** desde el primer intento → Verificar → Continuar.
5. Summary v2: subtitle, takeaways con separadores/KEY, sección **Frases clave de la lección** con dos frases/traducciones, sin audio ficticio. Debe mostrar **2 actividades completadas** cuando llega GET; si hay red lenta el contador aparece después, sin bloquear Finalizar. Finalizar lección.
6. Result no perfecto de este recorrido: **1/2 correctas al primer intento**, **1 ejercicio para reforzar**, A1 **3/8 (38%)**, curso/nivel y próxima **Verb to be** accesible. Revisar hero/confeti, tarjetas y acción secundaria azul. Siguiente lección.
7. Lección 4: Content v1 sigue legible sin labels ni key phrases inferidos. Fill text muestra contexto «Preséntate como estudiante.», frase **I _____ a student.**, input y pista. Escribir **om** → Verificar → incorrecto; retry con **am** → ¡Ahora sí! → Continuar. Probar que el teclado no tape la acción y que un tap con teclado abierto se procese.
8. Matching: **Book/Cup/Ball** y dibujos coloridos (libro, taza, pelota). Conectar Book→taza, Cup→libro, Ball→pelota. Cambiar un par antes de enviar no duplica imagen. Comprobar: dos errores y uno correcto, curvas/nodos unidos. Retry: Book→libro, Cup→taza, Ball→pelota → Comprobar → pares verdes y ¡Ahora sí! → Continuar una vez.
9. Summary v1 de lección 4 usa points; no añade subtitle/keyPhrases inexistentes. Contador **2 actividades completadas**, aunque hubo retries. Finalizar. Result **0/2**, dos ejercicios para reforzar, A1 **4/8 (50%)**, próxima **Mi familia** con Premium/Obtener acceso. Obtener acceso solo muestra información existente; Volver a la ruta lleva al nodo ACCESS, sin alterar acceso.
10. Pasada perfecta: repetir reset --lessons, recargar la app y acertar desde el primer intento: **Nice to meet you!**, **Hello**, luego **am** y los tres pares correctos. Result de cada lección: **2/2**, ¡Excelente trabajo!, sin errores para repasar; accesible tras lección 3 y Premium tras lección 4. Misma acción secundaria en ambos casos.
11. Back: chevron y back físico recorren pasos previos, mantienen respuesta/feedback local y vuelven al frontier sin reenviar attempts. Con teclado abierto, back físico puede cerrarlo primero. Desde el primer paso sale a Roadmap. Cerrar/reabrir después de enviar reanuda el siguiente required del backend; no reinicia ni cambia score.
12. Red/doble tap: durante envío, botón con spinner y estado deshabilitado real. Dos taps rápidos generan un attempt. Cuando aparece feedback, el primer tap de Continue avanza. Una lectura lenta/fallida de activityProgress no deja Continue deshabilitado ni reenvía el attempt.
13. Repetir a ancho normal y estrecho (aprox. 320–360 dp), fuente aumentada (1.3–1.5), portrait/landscape cuando esté habilitado, títulos largos y scroll. Verificar safe areas, radios, burbujas, video apilado, conectores después de layout, Summary largo y Result desplazable. Revisar TalkBack en back/opciones/audio si se dispone de contenido con URL real.

Para restaurar el escenario habitual Courses A1 3/8 + A2 sin iniciar:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\backend
node --import tsx scripts/seed-courses-demo.ts --reset
```

## Validación V4 y límites

- TypeScript mobile: PASS.
- Tests mobile: 30/30 PASS (25 existentes + 5 de v2/metadata/races). Incluyen first-feedback ready, doble submit, lectura lenta/fallida, respuesta fuera de orden, dispose, resume y optional traversal counts.
- Android export: PASS, 1013 módulos, bundle Hermes de 2,2 MB en `mobile/dist/lessons-v4-check` (ignorado por Git).
- Expo install --check: salida 1 por el desfase preexistente expo 57.0.24 vs ~57.0.25. No se cambian dependencias. El primer intento sandbox no pudo consultar red; la ejecución con acceso sí devolvió la comparación de versiones.
- git diff --check: PASS. Las advertencias de conversión LF/CRLF corresponden a la configuración Git de Windows.
- ADB no detectó dispositivos. No se acredita todavía aceptación visual física, teclado, TalkBack ni una cifra de fidelidad del 90–95%. Layout revisado en código y bundle, no mediante capturas nuevas del dispositivo.
- No se repiten tests backend: no se modificó backend. No se ejecutó seed/reset ni se cambió el aprendizaje actual durante la implementación.
- Deuda: fotografías/video/audio reales dependen del contenido; audio/video abren externamente, sin reproductor integrado; celebración estática, sin animación adicional; títulos legacy siguen siendo contenido configurado. Result sin next/course y campos v2 ausentes conservan fallback, pero sus estados visuales requieren datos reales para aceptación física. DRAG, Review real, rewards y Progress quedan fuera.
- Sin commit, push ni merge. Revisión y aceptación Android pendientes antes del checkpoint.

# Lessons Mobile V5 — Fidelity & Consistency Pass

V5 continúa sobre el checkpoint V4 `de47457`. Los cambios previos al corte de uso se conservaron. No se modifica `flow.ts`, el contrato ni ninguna regla backend.

## Cambios y alcance

Antes del corte ya estaban implementados: estado de Matching controlado por `matchingDraft` (reset de pares y palabra seleccionada), feedback incorrecto simplificado, tipografía Lessons body 16/24 y caption 14/20, normalización de course metadata, bubble con tail, discos sin doble halo, fixture IMAGE y servidor estático demo, Summary enriquecido, precisión porcentual y progreso Result.

Después del corte: revisión del diff, bubbles cortas que ajustan su ancho al mensaje, reducción del espacio vertical de la oración Fill Blank, validación real del asset HTTP, ejecución de los tests de fixture fuera del sandbox, validaciones finales y este recorrido de aceptación.

- Courses conserva su theme; la nueva escala se limita a `lessonStyles`. Traducciones, instrucciones y video metadata heredan una lectura más cómoda.
- Content/Summary muestran el título real del curso (por ejemplo Inglés A1), sin un chip A1 redundante. Result mantiene una referencia única en su identidad y la referencia contextual bajo progreso.
- Dialogue A/B y MC D comparten bubble redondeada sin borde pesado, tail solo cuando hay speaker real, traducción secundaria y audio arriba a la derecha únicamente con URL válida. `showTranslation` permite composición futura sin crear Settings. Los ejemplos no-DIALOGUE mantienen fallback v1.
- MC conserva radios y estados V4. El contexto de diálogo tiene menos padding; la bubble corta ya no ocupa forzosamente todo el ancho.
- Fill options demo tiene una ilustración original de Sofía saludando, encima de la frase. La imagen usa contain en un marco panorámico. Fill text de lección 4 conserva su contexto TEXT y sirve para comprobar el fallback sin imagen. No se inventa imagen en el renderer.
- Matching: retry resetea pares y palabra seleccionada en una sola transición del reducer; el handler existente elimina feedback. Desaparecen conexiones y estados rojo/verde, permanecen anchors neutrales. Comprobar queda deshabilitado hasta reconstruir todos los pares. El siguiente envío es un nuevo attempt. La respuesta esperada se obtiene exclusivamente del feedback del servidor; en incorrecto reemplaza la explicación larga redundante.
- Summary v2 conserva subtitle configurado, takeaways con KEY en los tres puntos y key phrases. Descriptor genérico «Practica y memoriza estas frases clave». Phrase cards alineadas con el texto del heading; en ancho menor de 360 o fontScale mayor de 1.3 recuperan ancho para legibilidad. Contador de actividades intacto.
- Result prioriza PRECISIÓN y porcentaje redondeado, manteniendo «x de y correctas al primer intento». No usa retries para recalcular score ni modifica isPerfect. Progreso coloca porcentaje junto al heading, barra a todo el ancho y metadata inferior de lecciones obligatorias. Review, Premium, siguiente lección y Volver a la ruta conservan su comportamiento.
- Iconos de sección usan un disco saturado limpio y glyph blanco. Se conserva el halo celebratorio del hero de Result.
- No se añade audio demo, TTS ni reproductor. URLs reales siguen abriéndose externamente; sin URL no hay control.

## Archivos V5

Mobile: `components/{ActivityStep,ContentBlocks,LearningIcon,MatchingPairs,RichContent,lessonStyles}`, `contentPresentation.ts`, nuevo `matchingDraft.ts`, screens `LessonScreen`/`LessonResultScreen`, `tests/lessons.test.cjs` y este documento.

Demo: `backend/scripts/lessons-demo-data.ts`, `lessons-demo.test.ts`, nuevos `assets/greeting.png`, `assets/generate-greeting.ps1` y `serve-lesson-assets.mjs`.

El PNG es una ilustración original, reproducible con System.Drawing, sin media externa. El servidor estático de desarrollo entrega exclusivamente ese PNG en puerto 3001; está separado de la API. No se agrega ningún endpoint al backend de aplicación. IMAGE context requiere HTTP(S), por eso no se usa un data URL ni se cambia su validador.

## Preparación física Android V5

No se ejecutó seed/reset durante esta iteración. Para preparar la aceptación, usar tres terminales. PC y teléfono deben compartir LAN. Reutilizar backend/Metro si ya están levantados; evitar duplicar puertos.

Terminal 1 — asset demo (dejar abierta):

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\backend
node scripts/serve-lesson-assets.mjs
```

Terminal 2 — seed y backend, con el PostgreSQL de desarrollo existente:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\backend
$v5Lan = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1
$env:LESSONS_DEMO_ASSET_BASE_URL = 'http://' + $v5Lan.IPv4Address.IPAddress + ':3001'
node --import tsx scripts/seed-courses-demo.ts --reset --lessons
node --import tsx scripts/seed-courses-demo.ts --check
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

Comprobar la interfaz si hay VPN. La variable debe estar configurada ANTES del seed: la URL queda almacenada en la fixture. No usar localhost para Android físico. El reset guardado afecta al aprendizaje demo del usuario de desarrollo y deja A1 2/8, A2 sin iniciar. Si cambia la IP de la PC, volver a aplicar la fixture con la nueva variable usando `--apply` (sin borrar aprendizaje).

Terminal 3 — Metro:

```powershell
Set-Location C:\software-development\projects\teacher-alma-app\mobile
$v5Lan = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1
$env:EXPO_PUBLIC_API_URL = 'http://' + $v5Lan.IPv4Address.IPAddress + ':3000'
node node_modules/expo/bin/cli start --host lan --port 8081 --clear
```

Abrir desde el navegador del teléfono `http://<IP-PC>:3001/greeting.png` y verificar que aparece Sofía saludando. Si falla, resolver conectividad LAN/puerto 3001 antes de evaluar IMAGE. Escanear QR con Expo Go compatible con SDK 57 o usar el development build existente. No hay nuevas dependencias nativas.

## Recorrido exacto V5

1. Cursos → Inglés A1 → Nice to meet you! Confirmar un chip **Inglés A1**, título y descripción. Concepto con KEY. Dialogue A/B con tail hacia cada speaker, frase protagonista y traducción legible secundaria. Revisar video preview predominante y metadata. Sin audio ficticio. Continuar.
2. MC: bubble **D — Hi, I’m Daniel.** compacta, traducción y nueva instrucción. Seleccionar **Goodbye!**; radio centrado y azul. Comprobar → incorrecto. Retry → **Nice to meet you!** → ¡Ahora sí! → Continue al primer tap. Score sigue basado en el primer intento.
3. Fill options: imagen de Sofía arriba, frase **_____, I’m Sofía.** debajo, opciones, Pista/Verificar. Mostrar/ocultar pista. Elegir **Hello** al primer intento y continuar.
4. Summary de lección 3: subtitle «¡Muy bien!...», tres takeaways más descriptivos con KEY, descriptor de frases clave y alineación con la columna del heading. Traducciones visibles. **2 actividades completadas**, sin barra 2/3. Finalizar.
5. Result: **PRECISIÓN 50%**, **1 de 2 correctas al primer intento**, una referencia Inglés A1 (sin chip A1 adicional), un ejercicio para reforzar, curso **38% / 3 de 8**. Porcentaje junto a Progreso del curso, barra a todo el ancho. Siguiente lección accesible: Verb to be.
6. Lección 4: verificar Content v1; Fill text sin IMAGE mantiene contexto textual e input. Escribir **am** correctamente desde el primer intento, verificar y continuar. Probar teclado, hint y back físico.
7. Matching: conectar **Book→taza, Cup→libro, Ball→pelota**, comprobar. Debe mostrar dos pares incorrectos, uno correcto y feedback simplificado con pares esperados.
8. Pulsar **Intentar de nuevo**. Confirmar inmediatamente: **cero conexiones, ninguna palabra seleccionada, colores neutrales, feedback anterior ausente y Comprobar deshabilitado**. Tocar primero una imagen no debe usar una palabra seleccionada antes del retry. Construir **Book→libro, Cup→taza, Ball→pelota** desde cero; comprobar → verde/¡Ahora sí! → Continue al primer tap.
9. Summary v1 de lección 4 mantiene points, sin frases/subtitle inventados, y contador 2 actividades. Finalizar: **50%**, **1 de 2 al primer intento**, un ejercicio pendiente, curso **50% / 4 de 8**. Mi familia es próxima Premium; Obtener acceso muestra información existente. Volver a la ruta conserva el mismo botón secundario.
10. Pasada perfecta: repetir `--reset --lessons` con la variable LAN configurada y recargar. Acertar Nice to meet you!, Hello, am y los tres pares desde el primer envío. Result de ambas lecciones muestra **100%**, ¡Excelente trabajo! y 2 de 2 al primer intento; no aparece Review pendiente. No convertir retries en 100%.
11. Repetir con ancho estrecho y fuente 1.3–1.5. Revisar wrapping de headings, burbujas, traducciones y video apilado; key phrases recuperan ancho. Matching debe mantener conectores unidos al centro de sus nodos tras medir nuevas alturas. Result y Summary deben poder desplazarse sin overflow; teclado no debe tapar el CTA. Back/forward y resume mantienen semántica V4.

## Validación y deuda

- TypeScript Mobile y scripts demo: PASS.
- Mobile: 32/32 tests PASS, incluidos reset Matching, precisión, normalización, first-feedback ready y doble submit.
- Fixture Lessons: 2/2 tests PASS. El intento previo al corte falló por `uv_os_get_passwd ENOMEM` en tsx dentro del sandbox; el mismo test fuera del sandbox pasó sin cambios de entorno/código para ocultarlo.
- Asset HTTP: GET 200 con bytes idénticos al PNG original; ruta inexistente 404. Sin seed/reset de datos en esta validación.
- No se ejecutan suites completas backend: solo cambian fixtures y herramientas de demo.
- Pendiente aceptación visual física V5, fuente ampliada, teclado y TalkBack. No se acredita una cifra de fidelidad antes de esa prueba. La imagen es ilustración demo, no fotografía como el mockup; video/audio reales siguen fuera. Expo patch warning preexistente no se modifica.
- Sin cambios de schema/migrations, reglas backend, API, dependencias ni archivos .env. Sin commit, push ni merge.
- Android export final: PASS, 1014 módulos y bundle Hermes de 2,2 MB en `mobile/dist/lessons-v5-check` (ignorado por Git).
- `git diff --check`: PASS; solo advertencias de conversión LF/CRLF propias de Windows.

## Lessons Session Semantics v1 — implementación actual

NORMAL_RUN reemplaza NORMAL/RESUME. GET incompleto inicia un run nuevo a 0%; COMPLETED abre Replay local sin crear run. La barra y el contador de actividades normales proceden de las respuestas del run. Los endpoints normales requieren runId. El requestKey se conserva solo para reintentar el start de la misma entrada, no entre montajes.

Chevron, hardware Back y salida de navegación muestran «¿Salir de la lección?». «Seguir aprendiendo» conserva run, step, respuesta y feedback. «Salir» envía abandon y vuelve inmediatamente a la ruta, sin esperar una red caída. El siguiente start abandona cualquier ACTIVE stale. No hay AsyncStorage ni navegación al step anterior en NORMAL_RUN. Al llegar a completion, Back sale directamente y no abandona. Replay conserva su navegación local.

Los attempts ACTIVE no crean Review ni progreso durable. El feedback dice que se guardará al terminar. Complete consolida score del primer intento de cada actividad en ese run, Review y progreso de forma atómica e idempotente. Los errores de un run abandonado no afectan el siguiente. Replay sigue usando replay/check read-only, precisión local y frontier real al volver.

### Preparación y recorrido Android

Reutilizar backend/Metro existentes. Si no están activos, usar los comandos de arranque al principio de este documento (mismo API LAN y Expo SDK).

Desde backend:

```powershell
node --import tsx scripts/seed-courses-demo.ts --reset --lessons
node --import tsx scripts/seed-courses-demo.ts --check
```

1. Confirmar A1 2/8, lección 3 actual, 4 incompleta y A2 no iniciado.
2. Abrir lección 3: 0%, respuestas vacías.
3. Avanzar y enviar al menos una actividad incorrecta; probar retry.
4. Hardware Back: aparece el modal, no el step anterior.
5. Seguir aprendiendo: mismo punto, selección y feedback.
6. Chevron → Salir: vuelve a la ruta (también con red desconectada).
7. Reabrir con red: 0%, respuestas limpias; el error anterior no afecta este run.
8. Enviar la última actividad: 100% ya implica completion. Cerrar/reabrir aquí debe abrir Replay aunque no se haya visto Summary.
9. Confirmar Result normal, precisión del primer intento de este run y ruta 3/8.
10. En una ejecución continua, pasar del feedback a Summary y Ver resultado sin escritura adicional; reabrir 3 inicia Repaso a 0%.
11. Volver a la ruta: frontier real en 4.

Stale/crash reproducible: ejecutar `node --import tsx scripts/seed-courses-demo.ts --reset --stale-run`. Deja un ACTIVE con error y traversal, sin Review/progreso durable. Abrir 3 debe reemplazarlo y mostrar 0%. También se puede matar la app durante un run y reabrir. Restablecer finalmente `--reset --lessons` para dejar 2/8.

### Validación reproducible

Backend: Prisma validate/generate, migrate deploy, TypeScript; `RUN_LESSONS_DB_TESTS=1` con `node --import tsx --test src/modules/lessons/*.test.ts`; `node --import tsx scripts/check-lessons-demo.ts --run` (restaura 2/8 al terminar).
Mobile: `node node_modules/typescript/bin/tsc --noEmit`; `node --test tests/*.test.cjs`; `node node_modules/expo/bin/cli export --platform android --output-dir dist/lessons-session-check`.

La exportación no sustituye la aceptación física de gestos/modal/red. Sin V6 visual ni cambio de provider/dependencias.

## Completion boundary: ACTIVE 0–99%, COMPLETED 100%

A pedagogical requirement is a required block whose type is not SUMMARY; a required ACTIVITY also requires a valid submission in this run, regardless of correctness. Required-step counters exclude Summary and optional-only steps. ACTIVE percentage is capped at 99; only a successfully committed COMPLETED run returns 100.

The mutation that satisfies the final requirement (content traversal or activity submission) also consolidates completion in that same transaction. Failure rolls back the final attempt/traversal and all durable effects. Responses include status and completion (the normal Result payload, or null while ACTIVE). A nonempty lesson with no required pedagogical blocks completes during start; empty lessons remain rejected.

Summary is post-completion presentation, excluded from prerequisites and completion validation even if marked required in legacy content. Mobile shows the last feedback, then Summary and Result locally from the persisted completion payload. Neither requires a network call or further submission. Closing after 100% preserves COMPLETED and reopening enters Replay. Back after completion exits directly, without abandonment.

An immediate retry offered on the final feedback is now post-completion: it uses the existing read-only replay check, leaves the run closed and cannot alter its first-attempt score or Review. Earlier retries within ACTIVE runs remain persisted and numbered normally. No new Practice/Review session is introduced.

POST run complete remains an idempotent confirmation/result read for completed runs (and validates eligibility if ACTIVE); mobile does not rely on it to reach completion. Optional unanswered activities remain in the existing score denominator.

Validación final (2026-09-25): Prisma validate/generate y migrate status PASS; migración aplicada a teacher_alma_dev; TypeScript backend/mobile/scripts PASS; Lessons PostgreSQL + unitarios + backfill aislado 30/30; mobile 37/37; export Android PASS (1014 módulos, Hermes 2,2 MB) en dist/lessons-session-check; seed/check y git diff --check PASS. Baseline final A1 2/8, lección 3 actual/incompleta, 4 incompleta, A2 sin iniciar, sin runs ACTIVE ni attempts/Review demo. Pendiente aceptación física Android; no se afirma validación táctil.

## Lessons Mobile V6 — Final Fidelity / Interaction Polish

V6 conserva Session Semantics v1: no cambios en flow, dominio, schema, migraciones, scoring, Review, access o progression. Working tree inicialmente limpio en feature/lessons-v1. Sin commit, push, merge ni git reset.

### Presentación frente a V5

- RichContent: speaker más compacto (32 mínimo), burbuja con padding 10/radio 16 y tail alineado; traducción 14/20, frase 17/24 y audio de 44 px a la derecha. No se infieren contenido ni speakers. Se conserva body 16/24.
- ActivityStep: contexto MC se ajusta al contenido, padding 8 y radio 18; contextos generales padding 12. Menos distancia entre heading, contexto y opciones, manteniendo targets. Fill IMAGE usa la fixture original, ahora servida por API.
- ContentBlocks: preview VIDEO horizontal menos alto, sin play ficticio; Summary reduce padding vertical de takeaways y phrase cards. Traducción secundaria 14/20. En teléfonos menores de 390 o fuente >1.15 las frases recuperan todo el ancho. KEY y fallbacks v1 intactos.
- MatchingPairs/matchingDraft: palabra→imagen e imagen→palabra equivalentes; tocar el elemento seleccionado cancela selección. Una sola selección, reemplazo sin duplicados, borde seleccionado más fuerte y anchors de ambos lados. Gap entre columnas 40 permite imágenes algo mayores. Conectores medidos, capa sin taps, feedback y retry se conservan; retry elimina pares, ambas selecciones, feedback y draft cacheado.
- LessonResultScreen: el curso normal aparece una sola vez como chip en progreso; «3 de 8 lecciones completadas». Se preserva el denominador real del backend. Hero, PRECISIÓN, primer intento, Review informativo y siguiente acción permanecen. Replay conserva su identidad, precisión local, «primer intento de esta repetición» y Continuar mi ruta, sin progreso/Review histórico.
- ContextualHeader/LessonScreen: mismo chevron, safe areas, topic/posición y progreso; etiqueta accesible «Salir de la lección» en NORMAL_RUN. Modal ACTIVE y salida directa tras completion intactos. Summary sigue mostrando Ver resultado y contador de esta sesión; no se vuelve a implementar completion ni navegación anterior.

La mejora propuesta de fidelidad está en densidad de conversación/contexto, ancho de frases y jerarquía de Result. No se acredita fidelidad física por exportación: aún no hay capturas V6. Se conservaron intencionalmente iconos, hero, tamaños body/caption, controles de feedback y semántica de sesión. No se replica el engranaje flotante de las capturas ni el diseño de Duolingo.

### Media demo y arranque (solo backend + Expo)

La API monta `/demo-media` solo con NODE_ENV=development y sirve únicamente greeting.png, sofia-greeting.wav y nice-to-meet-you.wav. El resto responde 404; producción no expone fixtures. Soporta HEAD/ranges con sendFile. No se sirve el directorio entero ni scripts. Tanto src/shared como dist/shared resuelven backend/scripts/assets.

Los WAV están versionados: no requieren generación durante seed ni playback. Son voz sintética local de Windows pregenerada para demo, no voz definitiva de Alma. Regeneración opcional: Windows PowerShell con System.Speech y voz en-US, ejecutando backend/scripts/assets/generate-audio.ps1. No hay provider ni TTS en tiempo real.

Audio disponible en turno A de Content y primera key phrase de Summary. El segundo turno y la segunda phrase prueban ausencia del control. El botón conserva apertura externa vía Linking, con label/hint accesible y error recuperable; volver a Expo conserva la sesión montada. La reproducción embebida sigue pendiente.

Ya se actualizó la fixture con --apply usando http://192.168.1.64:3000. El baseline existente se conservó, sin reset de DB: A1 2/8, 3/4 incompletas, A2 sin iniciar, cero ACTIVE/attempts/Review demo. La revisión automática rechazó el reset; la alternativa no destructiva --apply fue autorizada y ejecutada después de verificar el baseline con consultas.

Si cambia la IP LAN, actualizar la fixture (no usar localhost para Android):

```powershell
# Terminal backend; usar la IP de Wi-Fi compartida con el teléfono.
Set-Location C:\software-development\projects\teacher-alma-app\backend
$env:LESSONS_DEMO_ASSET_BASE_URL = 'http://192.168.1.64:3000'
node --import tsx scripts/seed-courses-demo.ts --apply
node --import tsx scripts/seed-courses-demo.ts --check
npm run dev
```

Reutilizar backend activo o reiniciarlo si no usa watch. No arrancar serve-lesson-assets.mjs/3001. --apply conserva aprendizaje existente; no restaura automáticamente 2/8 después de probar.

```powershell
# Terminal Expo; usar la misma IP.
Set-Location C:\software-development\projects\teacher-alma-app\mobile
$env:EXPO_PUBLIC_API_URL = 'http://192.168.1.64:3000'
node node_modules/expo/bin/cli start --host lan --port 8081
```

Abrir Expo Go compatible SDK 57. Si ya existe Metro, recargar la app. Imagen: http://192.168.1.64:3000/demo-media/greeting.png. Audio: /demo-media/sofia-greeting.wav y /demo-media/nice-to-meet-you.wav en el mismo origen. La LAN/firewall solo necesita la API y Metro; no un tercer proceso.

### Un recorrido físico compacto

1. Roadmap: confirmar A1 2/8, lección 3 actual, 4 incompleta y A2 sin iniciar. Abrir 3: 0%, Content con Inglés A1, título/descripción, KEY, diálogo compacto. Abrir audio del turno A, escucharlo y volver a Expo; turno B sin botón. VIDEO es preview neutral sin control muerto.
2. MC: elegir Goodbye! → Comprobar → incorrecto. Hardware Back → Seguir aprendiendo conserva respuesta/feedback; chevron → Salir vuelve a Roadmap. Reabrir 3 empieza a 0% fresh. Repetir MC wrong → retry → Nice to meet you! → Continuar. El primer intento continúa siendo incorrecto.
3. Fill: imagen de Sofía visible sin puerto 3001. Probar Pista; elegir Hello al primer envío. Verificar llega a 100% real antes de Summary. Continuar → Summary: KEY, frases, audio en la primera, 2 actividades completadas y Ver resultado. Ya no hay advertencia de pérdida al salir tras 100%.
4. Result normal: 50%, 1 de 2 correctas al primer intento, un ejercicio para reforzar, curso 38%/3 de 8 e Inglés A1 una sola vez. Volver a la ruta enfoca lección 4.
5. Abrir 3 completada: Inglés A1 · Repaso, primer step, 0%, respuestas/feedback vacíos. Acertar MC/Fill desde el primer envío → Summary → Result Replay 100%, ¡Repaso completado!, copy de primer intento de esta repetición, sin Review histórico ni falso unlock. Continuar mi ruta vuelve al frontier 4. También cubre presentación de precisión perfecta sin reset.
6. Lección 4: Content legacy, Fill TEXT; escribir am, comprobar teclado/scroll y continuar. Matching: Book→taza (word→image), libro→Cup (image→word), Ball→pelota. Antes de enviar probar cambio/cancelación de selección y reemplazo sin duplicados; dejar dos pares mal y comprobar rojo/verde.
7. Retry final: cero conexiones/selecciones/feedback, Comprobar deshabilitado. Reconstruir libro→Book, Cup→taza, pelota→Ball; comprobar y continuar. Summary → Result sigue 50%/1 de 2, curso 4/8; el retry post-completion no reescribe score ni Review. Próxima Mi familia muestra acceso Premium informativo.
8. Repetir las pantallas más densas con fuente 1.3–1.5/ancho estrecho y TalkBack: scroll completo, safe areas, labels, controles de audio y conectores unidos a anchors. Para PERFECT normal, en una pasada separada y con autorización para borrar aprendizaje demo, usar el reset documentado --reset --lessons y acertar todos los primeros envíos (Nice to meet you!, Hello, am y los tres pares correctos). No se ejecutó este reset en V6.

### Validación V6 (2026-09-25)

- TypeScript mobile, backend y scripts: PASS.
- Mobile: 41/41 PASS; nuevos casos de Matching bidireccional/toggle/reemplazo/reset, imágenes habilitadas primero y bloqueo/taps, audio ausente/inseguro/presente y acción externa, Result normal con metadata única. Regresiones existentes: Replay fresh, retry/draft, 100% antes de Summary/Result, retry final read-only y modal/Back.
- Fixtures/media: 4/4 PASS (3 fixture + 1 HTTP), bytes exactos PNG/WAV, rangos 206, content types, ausencia en producción y rutas fuera de allowlist. tsx requirió ejecución fuera del sandbox por uv_os_get_passwd ENOMEM.
- Seed --apply / --check: PASS; resetUserProgress=false. Baseline verificado sin mutación de aprendizaje.
- API local en ejecución: health, greeting.png y ambos WAV = 200. GET lesson 3 publica las tres URLs /demo-media y no contiene :3001.
- Android export final: PASS, 1014 módulos, Hermes 2.2 MB, mobile/dist/lessons-v6-check (ignorado por Git). Expo requirió ejecución fuera del sandbox por EPERM al crear la salida.
- git diff --check: PASS. Sin nuevas dependencias ni cambios de .env.
- ADB: cero dispositivos. Pendientes aceptación física, reproducción externa real en Android, fuente ampliada, teclado y TalkBack. Pruebas de componentes verifican props/interacciones con primitives stubbed; no prueban layout/touch nativo.

Deuda explícita: reproductor embebido, grabaciones/imagen/video definitivos y aceptación visual V6; DRAG, Review/Practice, settings, rewards y pagos continúan fuera de alcance. La foto del mockup no se reemplaza por una fotografía inventada. No se tocó dominio backend ni se ejecutó commit/push/merge/reset.

## Lessons Mobile V7 — Polish, Audio Playback & Demo Quality

V6 fue aceptada físicamente y versionada. V7 parte de working tree limpio en feature/lessons-v1 y conserva dominio, contratos, LessonRun, completion, score, Review, access/progression y Matching. No migrations, gamification, video hosting final ni git commit/push/merge/reset.

### Cambios y archivos

- AudioButton.tsx + lessonAudio.ts: expo-audio ~57.0.5, única dependencia directa nueva (Expo SDK 57). Un propietario activo, loading/playing/replay/error; tocar el activo lo detiene, tocar otro reemplaza el anterior. Cancela starts pendientes, ignora eventos obsoletos, libera listener/player al terminar o salir/cambiar source/step/lesson. AppState/focus detienen el audio; timeout 15 s permite reintentar carga fallida. Sin Linking, browser, micrófono, lockscreen ni background playback. app.json deshabilita explícitamente permisos de grabación y servicios de background del plugin. Mantiene audioUrl HTTP(S) como abstracción.
- RichContent: cada turno es una card completa con badge circular integrado, inglés dominante, traducción secundaria y audio azul filled. MC usa ancho disponible y badge mayor; no se alteran opciones/feedback de MC.
- ActivityStep + fillPresentation: una raya explícita se sustituye visualmente por la opción elegida; Fill TEXT tiene un único input dentro de la oración. No se infieren respuestas; solo se reconoce un único marcador de underscores. Prompts legacy sin marcador único conservan fallback. Selección azul, feedback verde/rojo, retry vuelve a la raya y deshabilita CTA. flow.ts solo limpia draft de respuesta en retry para evitar que reaparezca al revisitar en Replay; no cambia semántica de sesión.
- ContentBlocks: section heading 20/700 > key phrase 17/600 > traducción 14/20. Result agrupa chip de curso + «3 de 8» con flexWrap para fallback vertical, manteniendo label accesible completo.
- MatchingPairs/matchingDraft no se modificaron. Se mantienen tests de TAP bidireccional, replacement, connectors y retry neutral.
- Fixtures: lección 3 conserva Content/VIDEO, Dialogue A/B y ambas key phrases ahora con audio; traducciones «¡Mucho gusto!»/«¡El gusto es mío!». Tercera actividad: Fill TEXT «Nice to meet you _____!» → too.
- Lección 4: concepto I am/It is con KEY, ejemplos completos de estudiante/libro/taza/pelota, takeaways y dos key phrases con audio («I am a student.»/«It is a book.»). Tercera actividad MC IMAGE: elegir «It is a ball.». No se agrega VIDEO ni diálogo artificial. Cada demo tiene 3 actividades; esto no es una regla de producto.
- greeting.png se regenera desde su fuente editable generate-greeting.ps1: «Hello!», mismo cartoon/layout. WAV adicionales pregenerados localmente con generate-audio.ps1; no TTS en runtime. Media sigue en /demo-media de la API de desarrollo, allowlist de archivos exactos y soporte de rangos. No proceso 3001.

### Preparación

Backend existente + Expo, mismas instrucciones LAN de V6. Los fixtures quedaron configurados para http://192.168.1.64:3000 (usar IP actual de la PC si cambia). Reiniciar Metro tras instalar la dependencia; Expo Go compatible SDK 57 incluye expo-audio. Un development build previo necesita reconstrucción nativa para incorporar expo-audio y la configuración de permisos. Exportar JS no reconstruye un development build.

```powershell
# Backend, solo si no está activo:
Set-Location C:\software-development\projects\teacher-alma-app\backend
npm run dev
# En otra terminal:
Set-Location C:\software-development\projects\teacher-alma-app\mobile
$env:EXPO_PUBLIC_API_URL = 'http://192.168.1.64:3000'
node node_modules/expo/bin/cli start --host lan --port 8081 --clear
```

Tras autorización explícita del usuario se ejecutó el check HTTP que restablece el usuario demo. Baseline final: A1 2/8, lección 3 actual/incompleta, 4 incompleta, A2 no iniciado, cero ACTIVE/attempts/Review demo; 13 bloques y 6 actividades. Para reaplicar URLs sin borrar aprendizaje: configurar LESSONS_DEMO_ASSET_BASE_URL con el origen API y usar seed-courses-demo.ts --apply. Para volver al baseline después de aceptación: reset demo --reset --lessons, nunca git reset.

### Recorrido físico V7

1. A1 2/8 → lección 3 a 0%. Revisar Content, cards A/B y traducciones. Reproducir A y tocar B antes de terminar: solo B continúa, sin salir de Expo. Al acabar repetir; probar salir de pantalla/background durante audio. VIDEO conserva preview neutral.
2. MC: contexto D con más presencia y audio. Antes de completar probar Back → Seguir aprendiendo y chevron → Salir; reabrir fresh. Luego enviar Goodbye! incorrecto → retry correcto, para un resultado non-perfect.
3. Fill: imagen «Hello!», elegir Hello y ver «Hello, I’m Sofía.» inmediatamente. Tercera actividad: escribir too dentro de la oración. Tras verificar llega a 100%; Summary muestra 3 actividades, heading dominante y dos audios. Ver resultado: 67% (2/3 al primer intento), Review y curso 3/8; no 50%, porque esta fixture ahora tiene tres actividades. Los tests de Result 50% siguen vigentes.
4. Volver a ruta, reabrir 3 como Replay: 0%, sin respuestas/feedback previo. Acertar las tres → Result Replay 100%, sin Review histórico ni falso unlock. Continuar mi ruta enfoca 4.
5. Lección 4: revisar concepto KEY y ejemplos. Fill inline am; Matching en ambos sentidos, reemplazo antes de enviar, wrong/retry con conexiones/selección limpias; tercera MC elegir It is a ball. Comprobar Summary enriquecido, dos audios y contador 3. Result conserva primer intento (67% si solo falló Matching); curso 4/8 y próximo acceso Premium.
6. Pasada estrecha/fuente 1.3–1.5: wrapping del diálogo, input y Summary, teclado/scroll, targets audio/TalkBack y metadata Result que se apila si no cabe. Desconectar red antes de tocar un audio nuevo: error recuperable y retry; ninguna carga bloquea progression. Para perfecto normal, usar baseline de nuevo y acertar cada primer envío.

### Validación y deuda

- TypeScript mobile, backend y scripts PASS.
- Tests mobile Lessons: 36/36 PASS. Incluyen exclusividad/async cancel/timeout/interrupción/replay/cleanup de audio, metadata/controls nativos, Fill inline/typed/retry, jerarquía Summary y regresiones Matching, Replay, Back/modal, completion→Summary/Result y precisión 50/100.
- Tests fixture/media: 5/5 PASS. Cada demo tiene tres actividades, v2 validado, v1 fallback conservado, WAV/PNG bytes exactos, MIME/ranges y allowlist solo development.
- check-lessons-demo.ts --run PASS en PostgreSQL real: seis actividades vía HTTP, incorrect/retry, perfect, Review, access, Replay y baseline final. seed --check PASS. Sin suites backend ajenas.
- Android export PASS: 1029 módulos, Hermes 2.2 MB, mobile/dist/lessons-v7-check (ignorado). Esto valida bundle, no reproducción/touch nativos.
- git diff --check PASS. Sin cambios .env ni archivos de dominio/migración.
- ADB sin dispositivos: pendiente aceptación física V7, audio nativo/reconexión, wrapping y teclado. Se revisó la imagen regenerada «Hello!»; no se presentan capturas sintéticas como evidencia Android.

Antes de cerrar Lessons solo queda confirmar esta aceptación y corregir bugs concretos que aparezcan. Voz/imagen/video definitivos siguen siendo contenido futuro; no se añadieron Review UI, Practice, DRAG, settings ni rewards.

## Lessons Mobile V8 — Final Interaction & Fidelity Pass

Implementation on feature/lessons-v1; physical Android acceptance pending. V7 remains
the accepted checkpoint. All V8 changes are local, without commit/push/merge/git reset.

### Changed surface

- AudioButton + lessonAudio: idle/loading/playing/error. Completion and interruption
  restore speaker; tapping again creates a fresh player at the beginning. Single-owner,
  replacement, pending-start cancellation, focus/step/unmount/AppState cleanup remain.
- RichContent/types + backend lesson.content: optional authored dialogue segments reuse
  the existing KEY shape, sanitized recursively with required plain text fallback.
  Lesson 3 separates introductions from KEY greetings. A/B remain explicit badges;
  translation stays secondary and audio remains on the right. MC contextual variant
  places a larger D badge outside a content-sized white bubble, in the blue container.
- ContentBlocks + demo fixture: illustrated VIDEO poster with decorative centered Play
  and explicit preview-only caption. No dead pressable; actual video action remains
  conditional on a valid video URL. Existing posterUrl contract; no hosting integration.
- greeting-hello-v8.png and generator: versioned filename bypasses the old Android
  greeting.png cache. Fill and VIDEO reference this URL. Visually inspected Hello!;
  running API on port 3000 returned exact PNG bytes and the new URLs/segments.
- ActivityStep + LessonScreen: Activity owns its ScrollView and a sibling footer in
  normal flex layout (not an overlay). Only Activity is sticky; Content/Summary CTA
  stays at the end, Result unchanged. Body has trailing padding and maxWidth 640.
  Empty → disabled Comprobar; ready → enabled; feedback → Continuar. Wrong feedback
  keeps Intentar de nuevo inside the scroll body. Retry clears Fill/hint and existing
  Matching state without changing scoring. Feedback reveals its start smoothly only
  when below the viewport, retaining preceding answer context.
- fillPresentation: 40-character presentation fallback, single-line manual input,
  bounded width and native horizontal text scrolling. No answer-derived limit or
  dynamic font shrinking. One 2px underline: neutral, blue focus/pending, green/red
  feedback; no underscore placeholder, native Android underline or text decoration.
  Options still substitute their public label inline; legacy prompts retain fallback.
- app.json: Android resize keyboard mode explicit. iOS keeps KeyboardAvoidingView;
  focused input is measured against the resized scroll viewport and revealed if needed.
  Footer stays outside scrolling, respects bottom inset and stacks hint/action at
  narrow width/large text. Native config changes require rebuilding a development build;
  an Expo export does not validate the installed host's keyboard behavior.
- seed-courses-demo: removed obsolete updates to unrelated legacy test courses;
  reset/apply now only mutate named demo fixtures and the configured demo user's state.

### Validation

- Mobile Lessons: 41/41 PASS including speaker restoration/restart, ownership, bounded
  input, single underline, six-option/image activity with footer outside scroll,
  feedback/retry, Matching, Replay, first-attempt/completion and unchanged Result.
  Native primitives are mocked: these tests do not prove pixel layout or keyboard.
- Backend content/fixture/media: 11/11 PASS, recursive allowlist/legacy fallback,
  versioned poster and Fill, exact bytes/MIME/ranges and production media isolation.
- TypeScript mobile/backend/scripts PASS. Android export PASS, 1029 modules, Hermes
  2.3 MB, dist/lessons-v8-check ignored. git diff --check PASS.
- Authorized check-lessons-demo --run PASS with real PostgreSQL/HTTP: six activities,
  wrong/retry, perfect, Review, access, Replay and stale-run regression. Final seed
  check: A1 2/8, lesson 3 current/incomplete, 4 incomplete, A2 unstarted, zero ACTIVE,
  attempts and Review demo. API/media LAN origin: http://192.168.1.64:3000.
- ADB: no connected devices. No physical Android result is claimed.

### Compact physical V8 route

1. Lesson 3 Content: A/B introduction + KEY + translation. Play A→B; stop/background;
   let audio end, verify speaker returns and one tap restarts. Inspect illustrated VIDEO.
2. MC: D outside white bubble, smaller audio; disabled/enabled sticky Comprobar.
3. Fill Options: fresh Hello! illustration, choose Hello inline, verify one constant
   underline through neutral/pending/feedback; test a wrong answer and clean retry.
4. Manual Fill: type too, then paste a long string (max 40), move cursor/delete;
   keyboard must leave input and Comprobar usable. Repeat at narrow width/font 1.3–1.5.
5. Scroll long/image activity to its last option and feedback; body must pass fully
   above footer. Correct → sticky Continuar; wrong → scrollable retry or Continue.
   Six-option long-content structure is covered automatically; current demos retain 3.
6. Summary: both audios return to speaker; typography unchanged. Result unchanged.
   Reopen Lesson 3 as fresh Replay and verify no previous answer/feedback or durable
   progress/Review mutation. Lesson 4 quick pass: am, bidirectional Matching/retry,
   image MC, Summary audio, three activities, Result/next Premium access unchanged.

### Remaining debt

A. Closing Lessons MVP still requires physical V8 acceptance: Android keyboard/resize,
   narrow font scaling, last-option scroll, feedback and TalkBack. No known failing
   automated check; export cannot substitute for this acceptance.
B. Final media/content layer: replace demo voices with suitable speaker/persona voices
   (in particular Sofía), curated recordings/illustrations and final video. No TTS,
   streaming/provider infrastructure, Review/Practice or gamification added.
C. Optional polish only after physical feedback; no automatic V9 scope.

No backend domain redesign, migrations, new dependencies, gamification or final
video/TTS infrastructure. No other users or non-demo learning reset.

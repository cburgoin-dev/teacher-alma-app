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
15. Resume: cerrar/reabrir tras enviar una actividad; entrar a la lección. Debe reanudar el siguiente required del backend, sin restart. GET no trae respuestas históricas: volver a actividades anteriores permite Continuar sin reenviar o Responder de nuevo explícitamente. Una lección completada se lee sin resetear; los intentos nuevos conservan score original y pueden generar Review según backend.
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

GET es la fuente del contador de actividades. Tras un attempt exitoso se invalida el contador anterior y se solicita una lectura independiente, sin bloquear feedback ni Continue. Se publica solo activityProgress de esa lectura: nunca su pointer/status. Mientras llega, o si falla, se omite el contador. No se inventa a partir de score, índices o progreso requerido. Una versión de lectura descarta respuestas anteriores tras otro attempt/reload; dispose cancela/ignora pendientes. Resume usa el contador de su GET inicial.

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

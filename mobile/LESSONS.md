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

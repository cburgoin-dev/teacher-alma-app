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

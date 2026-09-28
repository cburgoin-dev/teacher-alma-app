# Reunión con Alma — feedback de producto y dirección futura

**Fecha:** 2026-09-27  
**Estado:** notas de producto / descubrimiento. No todas las ideas aquí son compromiso de MVP.

## Resumen

Alma revisó el estado actual de la app y la recepción general fue positiva. Le gustaron especialmente Courses, el Roadmap, la idea del bus como indicador de progreso y el concepto de Unit Challenge. El feedback principal fue hacer que ciertas pantallas se sientan más vivas, vistosas y visualmente completas.

La reunión también sirvió para explorar identidad visual, gamificación, monetización, posibles funciones futuras y costos operativos.

## 1. Dirección visual

### Feedback principal
- Algunas pantallas se perciben algo vacías.
- Conviene evitar, cuando sea razonable, pantallas importantes sin un ancla visual clara.
- Se pueden incorporar ilustraciones, imágenes, iconografía protagonista o elementos de marca para dar más vida a la experiencia.
- El objetivo no es saturar la UI, sino mantenerla agradable, reconocible y visualmente atractiva.

### Muñeca / personaje de Alma
Alma quiere aportar una fotografía de una muñeca asociada a su marca. La intención es evaluar una versión digitalizada/ilustrada para usarla como personaje guía de la app.

Posibles usos:
- pistas;
- explicaciones cortas;
- feedback posterior a ejercicios;
- resúmenes de lecciones;
- mensajes como “En esta lección aprendiste…”;
- estados vacíos o momentos donde una pantalla necesite mayor presencia visual.

**Dirección provisional:** el personaje puede convertirse en una huella visual importante de la app, pero debe usarse con intención y no como decoración repetitiva en todas las pantallas.

## 2. Gamificación

### Monedas
Se discutió darles utilidad real, no solo acumulativa.

Idea con buena recepción:
- gastar monedas en pistas u otras ayudas;
- estudiar después si también pueden utilizarse para otros consumibles.

### Protector de racha
Alma propuso presentarlo con un lenguaje más amable, por ejemplo:
- “Descansa un día”;
- “Tómate un día libre”.

Conceptualmente sigue siendo un protector/restaurador de racha, pero el copy puede alinearse mejor con una experiencia de aprendizaje sana.

## 3. Unit Challenges

Alma reaccionó positivamente al concepto de Unit Challenge y al Roadmap con hitos especiales.

Dirección actual:
- el Unit Challenge se siente como una pequeña misión al final de una unidad/topic;
- debe ser más especial y desafiante que una actividad normal;
- no debe sentirse como un examen tradicional de 5–10 preguntas;
- puede combinar distintas fases configurables;
- no todos los Unit Challenges tienen que usar siempre las mismas mecánicas.

Primeras mecánicas consideradas:
- **Conversation Challenge**: bien recibido; conversación guiada por pasos, sin asumir speaking en MVP;
- **Mini-crossword**: permanece como candidata inicial, especialmente para recall de vocabulario;
- **Sentence Builder** y **Listening Challenge**: candidatas futuras;
- **Ahorcado**: idea planteada durante la reunión como posible juego/actividad futura. Requiere evaluar valor pedagógico, UX móvil y riesgo de repetición antes de aprobarlo.

La idea general de “Juegos” gustó, pero no se toma todavía como una sección o vertical confirmada. Puede solaparse con Unit Challenges o futuras actividades de Practice.

## 4. Speaking y video interactivo

Alma mencionó referencias como Lingopanda/Teuida, donde el aprendizaje puede transcurrir sobre video y pausar para pedir interacción al alumno.

### Speaking
No queda aprobado para MVP.

Hay distintos niveles de complejidad:
- reproducir audio;
- grabar voz;
- speech-to-text;
- reconocimiento de intención;
- evaluación de pronunciación.

La app actual no debe asumir micrófono/speaking en Unit Challenges ni en Lessons hasta definir alcance técnico, costo y experiencia.

### Video interactivo
Idea futura:
- reproducir video;
- pausar en determinados puntos;
- mostrar preguntas/opciones;
- continuar según la respuesta.

Puede ser atractivo sin necesidad de speaking, pero implica una capa de sincronización y estado que debe evaluarse aparte. **No es compromiso de MVP.**

## 5. Monetización

### Precio inicial discutido
Rango de lanzamiento considerado razonable:
- **79–89 MXN/mes**.

Promoción de lanzamiento explorada:
- primer mes con aproximadamente 50% de descuento;
- referencia conversada: **39–49 MXN**.

Estos precios son hipótesis comerciales iniciales, no reglas cerradas. Deben validarse antes del lanzamiento.

### Planes
Alma mencionó interés futuro en distintos tipos de plan/suscripción.

**Estado:** post-MVP / por definir.

### Ads / patrocinadores
Alma planteó que usuarios gratuitos puedan generar algo de ingreso mediante publicidad o patrocinadores, tomando como referencia apps freemium del sector.

**Estado:** idea futura, no MVP.

Antes de incorporarlo habrá que definir:
- qué usuarios ven anuncios;
- frecuencia y formatos;
- impacto en UX;
- privacidad/consentimiento;
- SDK/proveedor;
- impacto sobre suscripciones;
- si los patrocinadores serían publicidad programática o acuerdos directos de marca.

## 6. Costos de distribución e infraestructura

Diferenciar siempre:

### Desarrollo
Precio del proyecto / implementación.

### Operación
Costos recurrentes o de terceros necesarios para mantener el producto publicado y funcionando, por ejemplo:
- hosting/backend;
- PostgreSQL;
- almacenamiento y entrega de imágenes/video/audio;
- dominio;
- correo transaccional;
- servicios de IA;
- observabilidad/analytics;
- cuentas de distribución;
- futuras integraciones de voz o publicidad.

### Cuentas de tiendas
Pendiente definir contractualmente quién es propietario y quién paga las cuentas de distribución.

Dirección recomendada para estudiar:
- que las cuentas productivas y los gastos recurrentes pertenezcan al negocio de Alma cuando sea posible;
- evitar que el desarrollador quede obligado a costear indefinidamente la operación de un producto comercial ajeno;
- el presupuesto inicial puede incluir un periodo de puesta en marcha si se acuerda explícitamente.

Costos de referencia revisados al 2026-09-27:
- Apple Developer Program: USD 99 por año.
- Google Play Console: USD 25 de registro único.

Estos importes deben volver a verificarse al momento de publicación.

## 7. Reglas/direcciones de diseño que surgen de la reunión

Estas son direcciones, no reglas rígidas de layout:

1. Evitar que pantallas importantes se sientan vacías o muertas.
2. Buscar al menos un ancla visual significativa cuando aporte valor: ilustración, personaje, imagen, icono protagonista, progreso o composición gráfica.
3. Mantener el lenguaje ya establecido: base clara, azul estructural, rojo de acción/acento, formas redondeadas, sombras suaves y gamificación amable.
4. Priorizar identidad propia de Alma sobre assets genéricos cuando el material de marca esté disponible.
5. La muñeca/personaje debe cumplir una función de producto —guía, pista, explicación, celebración— además de decorar.
6. No introducir capacidades técnicas nuevas únicamente para hacer un mockup más vistoso.
7. Los mockups son dirección visual; la implementación final puede superarlos si conserva intención y coherencia.

## 8. Qué sigue en Assessment / Unit Challenge

Mockups ya definidos:
1. Roadmap + bus + nodo de Unit Challenge.
2. Unit Challenge Start / intro.

Pendientes:
3. Conversation Challenge.
4. Mini-crossword.
5. Unit Challenge Result.

Antes de implementar la vertical se deben cerrar los mockups y luego formalizar semántica, modelo de datos y contratos necesarios.

## 9. Pendientes de producto derivados de la reunión

- recibir de Alma la foto/material de la muñeca;
- definir tratamiento visual/digitalización del personaje;
- identificar pantallas actuales que necesitan más riqueza visual;
- definir economía de monedas antes de implementar gasto real;
- decidir alcance de pistas y dónde pueden comprarse con monedas;
- evaluar Ahorcado y otras mecánicas como candidatas, no como compromiso;
- mantener speaking fuera de MVP salvo decisión explícita posterior;
- estudiar video interactivo como feature futura independiente;
- definir modelo comercial definitivo antes del lanzamiento;
- estimar costos operativos reales con proveedores concretos;
- decidir titularidad/pago de cuentas Apple/Google y demás infraestructura productiva.

---

Estas notas capturan la reunión y sirven como insumo para futuras decisiones. Cuando alguna idea se apruebe formalmente, debe trasladarse a los documentos de arquitectura, business rules, screens, gamification, monetization o contratos correspondientes, en lugar de tratar esta minuta como fuente de verdad técnica.

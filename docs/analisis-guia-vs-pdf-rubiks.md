# Análisis pedagógico: guía "Resuélvelo paso a paso" vs. PDF oficial de Rubik's

## Contexto

La guía interactiva (`src/Guide.tsx`) enseña a resolver el 3×3 con un método **capa por
capa (LBL)**: 7 pasos con un texto `qué`/`cómo`, un solver que detecta en qué paso está tu
cubo y una pista de "siguiente movimiento" oculta tras un check. El objetivo de este
documento es compararla con el método del PDF oficial _"You Can Do The Rubik's Cube –
Solution Guide"_ (36 págs.) y proponer mejoras para que sea **pedagógicamente un mejor
curso**.

Decisiones de alcance (acordadas con el usuario):

- **Entregable**: solo este documento de análisis y sugerencias. No se modifica código.
- **Dirección pedagógica**: _en capas_. Mantener el modo guiado para principiantes y
  **añadir una capa de aprendizaje opcional** para quien quiera resolverlo sin pistas.

> Nota: este archivo es un informe, no un plan de implementación. Las referencias a
> ficheros (`Guide.tsx`, `lbl.ts`…) indican _dónde aterrizaría_ cada mejora si más
> adelante se decide construirla.

---

## 1. Los dos métodos, lado a lado

Ambos usan el **mismo método LBL para principiantes**. La secuencia coincide casi 1:1:

| #   | Nuestro paso (`StepId`)   | Paso del PDF                          | Mismo concepto        |
| --- | ------------------------- | ------------------------------------- | --------------------- |
| 1   | `cross` (cruz blanca)     | L1·Step 1 Daisy + Step 2 Cruz blanca  | ✅ (incl. la "daisy") |
| 2   | `first-corners`           | L1·Step 3 Esquinas blancas            | ✅                    |
| 3   | `middle-layer`            | Middle Layer (mover izq./der.)        | ✅                    |
| 4   | `last-cross` (cruz amar.) | Final·Step 1 Cruz amarilla            | ✅                    |
| 5   | `last-face` (cara amar.)  | Final·Step 2 Orientar esquinas (Sune) | ✅                    |
| 6   | `permute-corners`         | Final·Step 3 Posicionar esquinas      | ✅                    |
| 7   | `permute-edges`           | Final·Step 4 Posicionar aristas       | ✅                    |

Incluso compartimos detalles finos: nuestro `solveCross` construye primero la **daisy**
(aristas blancas con el blanco hacia abajo) antes de subir la cruz — exactamente el truco
con el que abre el PDF (pág. 12). Y nuestro paso 5 se llama **"Sune"** en el código, el
mismo algoritmo del PDF.

### Diferencia técnica clave: amarillo-abajo vs. amarillo-arriba

El PDF resuelve la **capa blanca arriba**, luego **da la vuelta al cubo** y resuelve la
última capa con **amarillo arriba**. Nuestro solver (`lbl.ts`: `FIRST_FACE = U`,
`LAST_FACE = D`) mantiene **el amarillo siempre abajo y nunca reorienta el cubo**.

Por eso nuestros algoritmos son los **mismos en forma pero espejados a otra cara**:

| Etapa           | PDF (amarillo arriba)         | Nuestro `lbl.ts` (amarillo abajo) |
| --------------- | ----------------------------- | --------------------------------- |
| Cruz amarilla   | `F U R U' R' F'`              | `F L D L' D' F'`                  |
| Sune (orientar) | `R U R' U R U2 R'`            | `L D L' D L D2 L'`                |
| Posic. esquinas | `R' F R' B2 R F' R' B2 R2 U'` | `L' F L' B2 L F' L' B2 L2`        |
| Posic. aristas  | `F2 U L R' F2 L' R U F2`      | `L D' L D L D L D' L' D' L2`      |

**Implicación pedagógica (importante):** las mnemotecnias famosas del PDF —_"FUR says
U'R'F'"_, _"Run to me fast"_, _"Feed the fish"_— están atadas a la convención
**amarillo-arriba, mano derecha (U/R/F)**. En nuestra convención (D/L/B) esos cánticos
**no encajan literalmente**. Esto es la tensión central de la "capa de aprendizaje" (ver §5).

A favor de nuestra elección: no obligar a voltear el cubo elimina la mayor fuente de
confusión del PDF ("ahora gíralo, mantén el frente…"). En un 3D interactivo es claramente
mejor. El coste es perder compatibilidad con los recursos estándar de internet.

---

## 2. Lo que nuestra guía ya hace mejor (mantener)

El PDF es papel: toda su pedagogía vive en texto, imágenes y mnemotecnias. Nosotros
tenemos un medio interactivo y lo explotamos bien:

- **3D manipulable**: giras libremente y ves cada movimiento, sin ambigüedad de "cómo
  sujetarlo".
- **Solver adaptativo**: detecta automáticamente tu paso (`currentStep`) — el PDF te obliga
  a auto-diagnosticarte con tablas de imágenes.
- **Pista de siguiente movimiento** contextual y **saltar a cualquier paso** (`playToStep`).
- **Escaneo del cubo real** (`CubeScan`) y **cubo de ejemplo** (`GuidedMode`).
- **Texto que explica el _porqué_ del objetivo** (no solo el qué): "no basta con que el
  blanco mire arriba… el segundo color debe coincidir con el centro". Eso ya es buena
  pedagogía y supera a muchas guías.

---

## 3. Lo que el PDF enseña mejor (oportunidades)

Técnicas pedagógicas del PDF que hoy nos faltan:

1. **Memorabilidad** — cánticos y mnemotecnias por algoritmo ("FUR…", "Run to me fast",
   "Feed the fish", "None left", "I see two, my left thumb's on you", "tail lights").
2. **Independencia** — el PDF te entrena para **memorizar y resolver solo**; nuestra guía
   permite terminar el cubo pulsando "mostrar movimiento" sin aprender nada.
3. **El _porqué_ a nivel de cada movimiento** — "D aparta la esquina, L baja su posición,
   D' la coloca, L' la sube". Nosotros explicamos la meta de la etapa, no la mecánica.
4. **Reconocimiento de casos** — punto → L → línea → cruz; "una esquina / ninguna / dos".
   Reconocer el patrón _es_ la habilidad; nuestro solver lo decide por dentro y el usuario
   nunca aprende a verlo.
5. **Checkpoints visuales** — "cuando tu cubo se vea ASÍ, pasa al siguiente paso" (imagen
   objetivo). Cierra cada etapa con una meta concreta.
6. **Andamiaje emocional** — "Mindset is critical… tú PUEDES", "ya tienes 1/3 resuelto",
   felicitaciones entre etapas. Sostiene la motivación en una tarea difícil.
7. **Sub-pasos ("Action 1, 2, 3")** dentro de cada etapa: trocea la etapa en micro-objetivos.
8. **Analogías del mundo real** para el sentido de giro (tapón de botella, noria, pomo).
9. **Consejos de práctica** — "domina una capa re-mezclando antes de pasar a la siguiente".

---

## 4. Plan de mejoras (en capas, priorizado)

Estructurado según la filosofía elegida: **Capa A** refuerza el modo guiado para _todos_;
**Capa B** añade aprendizaje opcional para _independizarse_.

### Capa A — Refuerzo del modo guiado (alto impacto / bajo coste)

**A1. Progreso global y refuerzo emocional.**
Mostrar "Paso 4 de 7" + barra/anillo de progreso y, en los saltos de tercio, mensajes tipo
"¡Primera capa lista, 1/3!". Ya calculamos `currentIdx` en `Guide.tsx:120`; el flash de
etapa (`Guide.tsx:124-138`) puede enriquecerse con el hito. Añadir además una frase de
_mindset_ en el arranque ("Cuesta, pero es cuestión de constancia: lo vas a sacar").

**A2. El _porqué_ del siguiente movimiento.**
Cuando "Mostrar movimiento" está activo (`Guide.tsx:161-166`), añadir una línea de
intención: no "Gira Izquierda", sino "Gira Izquierda — _aparta esta arista sin romper la
cruz_". Requiere que el solver etiquete cada movimiento con un rol (setup / inserción /
restauración). Es la mejora que más acerca "seguir" a "entender".

**A3. Tercer campo "sabrás que terminaste cuando…" por etapa.**
Hoy `STEP_INFO` tiene `title/what/how` (`Guide.tsx:14-50`). Añadir `done`: el checkpoint
en palabras ("…cuando veas una cruz blanca con los laterales casando con cada centro").
Equivale al "When your cube looks like this…" del PDF, pero en texto.

**A4. Decir en qué caso estás.**
En `last-cross` y `last-face`, el solver ya sabe el patrón (punto/L/línea; 0/1/2 esquinas).
Surfacearlo: "Ahora mismo tienes una **L** — colócala arriba-izquierda y aplica el
algoritmo". Convierte un paso opaco en uno legible.

**A5. Imagen/estado objetivo de cada etapa.**
Un mini-render del cubo "como se verá al acabar esta etapa" junto al texto (reutilizando
`IntroCube`/`Scene` en modo estático). Es el equivalente visual del checkpoint del PDF.

### Capa B — Capa de aprendizaje opcional (independencia)

**B1. Toggle "Aprender" que revela el algoritmo de la etapa.**
Para las 4 etapas de última capa, mostrar la secuencia en notación (p. ej. `L D L' D L D2
L'`) con su nombre ("Sune") y resaltar que se repite. Es opt-in: el principiante lo ignora;
el que quiere memorizar lo usa.

**B2. Mnemotecnias propias (decisión de §5).**
Crear cánticos para _nuestra_ convención (D/L/B) o, alternativamente, reorientar solo la
última capa a amarillo-arriba para reutilizar los del PDF. Sin esto, B1 enseña símbolos sin
gancho memorístico.

**B3. "Practica esta etapa" → Modo práctica.**
Enlace desde una etapa de la guía al `practice` mode con re-mezcla, materializando el
consejo del PDF "domina una capa antes de seguir". La sección `practice` ya existe
(`sections.ts`).

**B4. Enseñar a reconocer casos como destreza.**
Evolución de A4: en vez de decirte el caso, una micro-actividad de "¿qué caso ves?" antes de
aplicar el algoritmo (punto/L/línea, pez/ninguna/dos). Convierte el reconocimiento en
aprendizaje activo.

### Priorización sugerida

1. **A1 + A3 + A5** (progreso, checkpoint en texto, estado objetivo): barato, mejora la
   sensación de curso de inmediato, solo toca copy + un render estático.
2. **A4** (decir el caso): alto valor pedagógico, reutiliza lo que el solver ya sabe.
3. **A2** (porqué del movimiento): el más transformador; requiere etiquetar roles de
   movimiento en `lbl.ts`.
4. **B1–B4** (capa de aprendizaje): mayor alcance; depende de resolver §5 primero.

---

## 5. Decisión de diseño pendiente: ¿qué notación enseña la capa B?

Antes de construir la Capa B hay que elegir (es una decisión de producto, no técnica):

- **Opción 1 — Enseñar nuestra convención (amarillo abajo, D/L/B).** Coherente con lo que el
  usuario ve en pantalla. Coste: inventar mnemotecnias nuevas; el usuario no podrá seguir
  tutoriales estándar de YouTube tal cual.
- **Opción 2 — Reorientar la última capa a amarillo-arriba (U/R/F) solo en modo aprendizaje.**
  Permite reutilizar "FUR", "Sune", "Run to me fast" y todo el ecosistema estándar. Coste:
  introducir el "voltea el cubo" que hoy evitamos, e implementar una variante del solver.

Recomendación: **Opción 1 para el modo guiado** (mantener la consistencia visual que ya es
una ventaja) y evaluar la **Opción 2 solo dentro del toggle "Aprender"**, porque ahí el
objetivo explícito es transferir a recursos del mundo real.

---

## 6. Sugerencias de copy por paso (concretas)

Mejoras de redacción aplicando A2/A3/A4. Formato propuesto por etapa: **qué · cómo · _caso
actual_ · sabrás que terminaste**.

- **`cross` (cruz blanca).** Añadir checkpoint: _"Terminas cuando los 4 laterales de la cruz
  casan con su centro (forman una T en cada cara)."_ El `what`/`how` actual ya es bueno.
- **`first-corners`.** Nombrar la maniobra como un ciclo de 3 movimientos ("apartar → bajar
  → subir") y el checkpoint: _"…cuando toda la cara de arriba es blanca y la primera fila de
  cada lateral casa con su centro."_
- **`middle-layer`.** Explicitar la bifurcación izq./der. como _decisión del usuario_
  ("¿su otro color está a la izquierda o a la derecha del frente?") en vez de dejarla al
  solver. Checkpoint: dos tercios de cada lateral completos.
- **`last-cross`.** Introducir el reconocimiento de casos (punto → L → línea → cruz) y, con
  A4, decir el caso actual. Mnemotecnia propia para `F L D L' D' F'`.
- **`last-face` (Sune).** Decir cuántas esquinas amarillas hay arriba (0/1/2) y cómo
  orientar el cubo antes de repetir el Sune. Es el paso que más se beneficia de A4.
- **`permute-corners` / `permute-edges`.** Aclarar que aquí **ya no cambia la orientación,
  solo el lugar** (ya lo dice el texto; reforzar con "tres piezas rotan en ciclo, las demás
  no se tocan"). Checkpoint final = cubo resuelto, con felicitación a la altura.

---

## 7. Cómo usar este documento / próximos pasos

1. Revisar §4 y decidir qué mejoras entran en el roadmap (sugerencia: empezar por A1+A3+A5).
2. Resolver la decisión de §5 antes de planificar la Capa B.
3. Cuando se quiera implementar, convertir las mejoras elegidas en un plan de cambios sobre
   `Guide.tsx` (copy y estructura de `STEP_INFO`), `lbl.ts` (roles de movimiento para A2,
   detección de caso para A4) y un render estático de estado objetivo (A5).

No se requiere verificación de código porque este entregable no modifica el sistema.

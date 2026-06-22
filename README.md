# Rubik

Cubo de Rubik 3×3×3 interactivo en 3D, construido con **React + React Three Fiber**.
El cubo se renderiza en WebGL; el resto de la interfaz es HTML de React. Preparado
además para empaquetarse como **SCORM** (build estático con rutas relativas).

🔗 **Demo en vivo:** https://studiolxd.github.io/rubik/

## Características

- **Cubo 3D estilo clásico** (cuerpo negro, pegatinas de colores estándar, bordes
  redondeados) con giros animados. Órbita con el ratón y zoom.
- **Arranca siempre mezclado** — mezcla fuerte de 30 movimientos aplicada al instante,
  que no se puede resolver de forma trivial.
- **Modo Libre:** gira las caras con el teclado (`U` `D` `L` `R` `F` `B`, y `Shift` para
  el giro inverso) o con los botones del panel. Botón **Mezclar** para reordenar.
- **Modo Paso a paso:** calcula la solución y te indica **qué tecla pulsar** en cada
  giro. Tú la pulsas, se anima el movimiento y avanza solo al siguiente paso, hasta
  resolverlo.
- **Solucionador** mediante el algoritmo de Kociemba ([`cubejs`](https://www.npmjs.com/package/cubejs)),
  soluciones de ~20 movimientos.

## Controles

| Tecla | Acción |
|-------|--------|
| `U` `D` `L` `R` `F` `B` | Giro horario de la cara (Arriba, Abajo, Izquierda, Derecha, Frente, Atrás) |
| `Shift` + cara | Giro antihorario (inverso) |
| Ratón (arrastrar) | Rotar la vista |
| Rueda del ratón | Zoom |

En **modo Paso a paso** las mismas teclas solo ejecutan el giro que toca según la
solución; el panel te indica cuál pulsar.

## Stack

- [Vite](https://vite.dev/) + React 19 + TypeScript
- [React Three Fiber](https://r3f.docs.pmnd.rs/) + [drei](https://github.com/pmndrs/drei) sobre [three.js](https://threejs.org/)
- [`cubejs`](https://www.npmjs.com/package/cubejs) — modelo y solucionador del cubo
- **`@studiolxd/brand`** — sistema de diseño de la marca (componentes + tokens); toda la interfaz (salvo el visor 3D) usa sus componentes y variables
- Gestor de paquetes: **pnpm**

## Desarrollo

```bash
pnpm install     # instalar dependencias
pnpm dev         # servidor de desarrollo (http://localhost:5173)
pnpm build       # build de producción a dist/
pnpm preview     # previsualizar el build
pnpm verify:cube # verifica que el motor coincide con cubejs (50 mezclas)
```

## Arquitectura

Todo lo de Three.js vive en `src/three/`; el resto es HTML de React.

```
src/
├── App.tsx                 # layout (viewport + panel) y atajos de teclado
├── Controls.tsx            # panel de control (HTML de React)
└── three/
    ├── Scene.tsx           # <Canvas>: cámara, luces, OrbitControls
    └── cube/
        ├── engine.ts       # motor lógico puro (notación WCA), sin dependencias
        ├── solver.ts       # integración con cubejs (Kociemba)
        ├── useCube.ts       # controlador/estado compartido entre 3D y UI
        ├── CubeView.tsx    # render + animación de giros (R3F)
        ├── Cubie.tsx       # una pieza: cuerpo + pegatinas
        └── engine.verify.ts # comprobación cruzada contra cubejs (pnpm verify:cube)
```

**Decisión de diseño clave:** el motor 3D propio y una instancia de `cubejs` reciben
exactamente los mismos movimientos en notación WCA. Así `cubejs` actúa como fuente de
verdad lógica y como solucionador (`cube.solve()`), evitando por completo el mapeo de
"facelets". La equivalencia entre ambos está verificada automáticamente
(`pnpm verify:cube`, también en CI).

## Despliegue

Cada push a `main` dispara el workflow de GitHub Actions
(`.github/workflows/deploy.yml`): verifica el motor, compila y publica `dist/` en
GitHub Pages. El `base: './'` de Vite hace que el mismo build funcione tanto en Pages
(subruta `/rubik/`) como dentro de un paquete SCORM.

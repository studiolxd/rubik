# Notas de producto — Rubik

> Documento de trabajo. Solo recoge lo que queda **pendiente**.
> Lo ya implementado se ha eliminado de este documento.
> Última actualización: 2026-06-22.

## Pendientes

### 1. Modo guiado — estado inicial real → virtual ✅ implementado (falta prueba en dispositivo)

Escaneo del cubo físico con la cámara: al entrar en Modo guiado se elige entre
"Escanear mi cubo" o "Cubo de ejemplo". El escáner pide las 6 caras una a una,
clasifica los colores (calibrado con los centros del propio cubo), valida que el
cubo sea resoluble y carga ese estado en el cubo 3D para guiar su resolución.

Piezas: `colors.ts` (clasificación), `facelets.ts` (ensamblado + validación +
`buildFromFacelets`), `CubeScan.tsx` (UI cámara), `Guiado.tsx` (flujo). Tests:
`pnpm verify:facelets` y `pnpm verify:colors`.

- **PENDIENTE de prueba en dispositivo real:** la orientación de la rejilla por
  cara (`CELL_ORDER` en `CubeScan.tsx`) se asume identidad; si alguna cara sale
  girada/espejada en el móvil, se ajusta ahí. Una orientación mal mapeada NO
  engaña: la validación rechaza el cubo (no resoluble).
- Sin cámara (permiso denegado) no hay alternativa manual: callejón sin salida
  aceptado.

### 2. Modo cronometrado — persistencia de usuario y tiempo

El temporizador ya funciona, pero al resolver el tiempo **solo se muestra, no se
guarda**. Falta decidir dónde y cómo se guardan **usuario y tiempo**
(¿local?, ¿backend?) — alimenta el ranking.

### 3. Ranking

Sección aún **vacía** (sin ruta ni contenido). Falta:

- Definir alcance: **local** vs **global/backend**.
- Qué se muestra: usuario, tiempo, fecha…
- Orden del listado.
- Implementarla y conectarla con la persistencia del modo cronometrado (ver #2).

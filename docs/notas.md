# Notas de producto — Rubik

> Documento de trabajo. Solo recoge lo que queda **pendiente**.
> Lo ya implementado se ha eliminado de este documento.
> Última actualización: 2026-06-22.

## Pendientes

### 1. Modo cronometrado — persistencia de usuario y tiempo

El temporizador ya funciona, pero al resolver el tiempo **solo se muestra, no se
guarda**. Falta decidir dónde y cómo se guardan **usuario y tiempo**
(¿local?, ¿backend?) — alimenta el ranking.

### 2. Ranking

Sección aún **vacía** (sin ruta ni contenido). Falta:

- Definir alcance: **local** vs **global/backend**.
- Qué se muestra: usuario, tiempo, fecha…
- Orden del listado.
- Implementarla y conectarla con la persistencia del modo cronometrado (ver #2).

### 3. Iconos de los botones de views controls

- Crear iconos representativos de cada opción: pista, etc.

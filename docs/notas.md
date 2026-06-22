# Notas de producto — Rubik

> Documento de trabajo para recoger información y decidir más adelante cómo
> reflejarla en la aplicación. **No implementado todavía** salvo donde se indique.
> Última actualización: 2026-06-22.

## Identidad

- **Slogan:** *Gira. Aprende. Resuelve. Compite.*

## Navegación

- **Sin menú persistente** durante toda la aplicación.
- Habrá un **menú inicial** (pantalla de inicio) desde el que se entra a cada sección.
- En cada pantalla/sección habrá un **botón "Volver al menú"** que **siempre vuelve
  al menú inicial** (no al paso/pantalla anterior).

## Estructura general

La aplicación tendrá **varias secciones**, accesibles desde el menú inicial.
Listado y detalle de cada una:

---

### 1. Sobre Studio LXD
- Breve descripción de Studio LXD.
- Enlace a nuestra web.

### 2. Saber más
- **Historia** del cubo de Rubik.
- **Curiosidades**.

### 3. Introducción al cubo
- **Partes** del cubo (piezas: centros, aristas, esquinas…).
- **Algoritmos**.
- **Consejos**.

### 4. Guía paso a paso
- Un **tutorial** que explica cómo montar el cubo.

### 5. Modo guiado
- Es el **paso a paso actual** (ya implementado): te indica qué tecla pulsar
  para ir haciendo cada giro en tu cubo de Rubik físico.
- **PENDIENTE:** cómo establecer el **estado inicial** del cubo virtual a partir
  del **estado actual del cubo real** (que el usuario introduzca/lea la
  configuración real de su cubo para resolver justo ese).

### 6. Modo práctica
- Parte del modo paso a paso actual, **pero modificado**:
  - Se comporta como el **modo libre** (mueves las caras tú libremente).
  - Botón **Pista**:
    - 1ª pulsación → te dice **qué cara** tienes que girar.
    - 2ª pulsación → te dice **en qué sentido**.
  - Si giras **lo que no es** → se hace el efecto de girar y **vuelve atrás**,
    avisando de que **no es correcto**.
  - Si giras **bien** → te dice **OK**.

### 7. Modo libre
- El **modo libre actual** tal cual (ya implementado).

### 8. Modo cronometrado
- Un **temporizador**.
- Al **completarlo** (resolver el cubo): guardar **usuario y tiempo**.
- **PENDIENTE:** cómo guardamos usuario y tiempo (persistencia, ranking…).

### 9. Ranking
- Sección que muestra el **ranking** de tiempos (alimentado por el modo cronometrado).
- **PENDIENTE:** definir alcance (local vs global/backend), qué se muestra
  (usuario, tiempo, fecha…) y orden.

---

## Pendientes / preguntas abiertas

1. **Estado inicial real → virtual** (modo guiado): mecanismo para capturar la
   configuración del cubo físico del usuario y reflejarla en el cubo 3D.
2. **Persistencia de tiempos** (modo cronometrado): dónde y cómo se guarda el
   usuario y su tiempo (¿ranking?, ¿local?, ¿backend?).

## Estado actual (ya en la app)
- **Navegación**: menú inicial con el slogan y las 9 secciones; botón "Volver al
  menú" en cada pantalla (siempre al inicio).
- Secciones **con contenido**: **Modo libre** y **Modo guiado** (el paso a paso,
  conectados al cubo 3D).
- Resto de secciones: **vacías, solo con el título** (pendientes de contenido):
  Sobre Studio LXD, Saber más, Introducción al cubo, Guía paso a paso,
  Modo práctica, Modo cronometrado, Ranking.

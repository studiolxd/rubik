import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { Quaternion, Vector3 } from 'three'
import { Modal } from '@studiolxd/brand/modal'
import { Kbd } from '@studiolxd/brand/kbd'
import { Button } from '@studiolxd/brand/button'
import { Icon } from '@studiolxd/brand/icon'
import { List } from '@studiolxd/brand/list'
import { VisuallyHidden } from '@studiolxd/brand/visually-hidden'

/** Subconjunto de la API de TrackballControls que usamos desde los botones. */
export interface ViewControlsHandle {
  /** Activar/desactivar el orbitado (se apaga mientras se arrastra un giro de capa). */
  enabled: boolean
  object: { position: Vector3; up: Vector3 }
  target: Vector3
  position0: Vector3
  target0: Vector3
  up0: Vector3
  minDistance: number
  maxDistance: number
  reset: () => void
  update: () => void
  addEventListener: (type: 'change', listener: () => void) => void
  removeEventListener: (type: 'change', listener: () => void) => void
}

const EPS = 1e-3

/** Filas de la leyenda de teclas (cara → tecla → nombre). */
const KEY_ROWS: { key: string; label: string }[] = [
  { key: 'U', label: 'Arriba' },
  { key: 'D', label: 'Abajo' },
  { key: 'L', label: 'Izquierda' },
  { key: 'R', label: 'Derecha' },
  { key: 'F', label: 'Frente' },
  { key: 'B', label: 'Atrás' },
]

/** Radio máximo (px) que recorre la bolita desde el centro. */
const JOY_RADIUS = 26

/** Velocidad de orbitación de la vista (radianes por segundo a tope de entrada). */
const ROT_SPEED = 2.4

/**
 * Joystick virtual (una "bolita" dentro de una base circular). Devuelve por
 * `onVector` un vector normalizado en [-1,1] (x derecha+, y arriba+); (0,0) al soltar.
 */
function Joystick({ onVector }: { onVector: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const moveTo = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current
      if (!base) return
      const r = base.getBoundingClientRect()
      let dx = clientX - (r.left + r.width / 2)
      let dy = clientY - (r.top + r.height / 2)
      const dist = Math.hypot(dx, dy)
      if (dist > JOY_RADIUS) {
        dx = (dx / dist) * JOY_RADIUS
        dy = (dy / dist) * JOY_RADIUS
      }
      setKnob({ x: dx, y: dy })
      onVector(dx / JOY_RADIUS, -dy / JOY_RADIUS) // y de pantalla es hacia abajo → invertimos
    },
    [onVector],
  )

  const onPointerDown = (e: ReactPointerEvent) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    moveTo(e.clientX, e.clientY)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (dragging.current) moveTo(e.clientX, e.clientY)
  }
  const release = () => {
    dragging.current = false
    setKnob({ x: 0, y: 0 })
    onVector(0, 0)
  }

  return (
    <div
      ref={baseRef}
      className="joystick"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      role="presentation"
      aria-label="Joystick para girar la vista"
      title="Arrastra para girar la vista"
    >
      <div
        className="joystick__knob"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}

/**
 * Controles flotantes de cámara (esquina inferior izquierda del viewport):
 *  - Acercar / Alejar el zoom (desactivados en los topes de zoom).
 *  - Restaurar la vista inicial (desactivado si ya está en la vista inicial).
 */
export function ViewControls({
  controlsRef,
  mode,
  timed,
  free,
  practice,
  step,
}: {
  controlsRef: RefObject<ViewControlsHandle | null>
  /** Modo activo: decide qué atajos propios del modo se muestran en la ayuda.
   *  `view` = solo se gira la vista (sin teclas de giro de caras). */
  mode: 'free' | 'step' | 'practice' | 'timed' | 'view'
  /** Solo en cronometrado: estado y acciones del crono. Si se pasa, se muestra un
   *  primer botón (play/stop) que sustituye a Comenzar/Reiniciar del antiguo panel. */
  timed?: {
    started: boolean
    solved: boolean
    busy: boolean
    onStart: () => void
    onRestart: () => void
  }
  /** Solo en modo libre: Mezclar + resolver (paso a paso / Kociemba), que antes
   *  vivían en el panel. Los dos resolver muestran el nº de pasos de su solución. */
  free?: {
    busy: boolean
    solved: boolean
    lblLength: number
    kociembaLength: number | null
    onScramble: () => void
    onSolveStep: () => void
    onSolveKociemba: () => void
  }
  /** Solo en modo práctica: el botón de Pista (revela cara → sentido), que antes
   *  vivía en el panel. El texto de la pista/feedback va en el HUD del visor. */
  practice?: {
    canHint: boolean
    hintLevel: number
    onHint: () => void
  }
  /** Solo en modo guiado (paso a paso): toggle para mostrar/ocultar el siguiente
   *  movimiento (que se pinta en el HUD del visor). */
  step?: {
    showMove: boolean
    onToggleMove: () => void
  }
}) {
  // Estado de los botones, derivado de la cámara (se recalcula al moverla).
  const [{ atInitial, atMin, atMax }, setState] = useState({
    atInitial: true,
    atMin: false,
    atMax: false,
  })
  const [helpOpen, setHelpOpen] = useState(false)

  // --- Giro de la vista con flechas del teclado y joystick ------------------
  const keysRef = useRef(new Set<string>()) // flechas pulsadas
  const joyRef = useRef({ x: 0, y: 0 }) // vector del joystick (-1..1)
  const rafRef = useRef(0)
  const lastRef = useRef(0)

  // Orbita la cámara alrededor del objetivo: `yaw` sobre el eje vertical (up) y
  // `pitch` sobre el eje horizontal de pantalla. Estilo trackball (gira también el up).
  const orbit = useCallback(
    (yaw: number, pitch: number) => {
      const c = controlsRef.current
      if (!c) return
      const offset = c.object.position.clone().sub(c.target)
      const up = c.object.up.clone().normalize()
      const viewDir = offset.clone().multiplyScalar(-1).normalize()
      const right = new Vector3().crossVectors(viewDir, up).normalize()
      const q = new Quaternion()
        .setFromAxisAngle(up, yaw)
        .multiply(new Quaternion().setFromAxisAngle(right, pitch))
      offset.applyQuaternion(q)
      up.applyQuaternion(q)
      c.object.position.copy(c.target).add(offset)
      c.object.up.copy(up)
      c.update()
    },
    [controlsRef],
  )

  // Bucle de animación: mientras haya entrada (flechas o joystick), orbita cada frame.
  const tick = useCallback(
    (now: number) => {
      const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0
      lastRef.current = now

      const keys = keysRef.current
      let ix = joyRef.current.x
      let iy = joyRef.current.y
      if (keys.has('ArrowLeft')) ix -= 1
      if (keys.has('ArrowRight')) ix += 1
      if (keys.has('ArrowUp')) iy += 1
      if (keys.has('ArrowDown')) iy -= 1
      ix = Math.max(-1, Math.min(1, ix))
      iy = Math.max(-1, Math.min(1, iy))

      if (dt > 0 && (ix !== 0 || iy !== 0)) {
        // Empujar a la derecha/arriba gira el cubo en ese sentido (sensación de arrastre).
        orbit(-ix * ROT_SPEED * dt, iy * ROT_SPEED * dt)
      }

      const active = keys.size > 0 || joyRef.current.x !== 0 || joyRef.current.y !== 0
      if (active) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = 0
        lastRef.current = 0
      }
    },
    [orbit],
  )

  const ensureLoop = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const setJoy = useCallback(
    (x: number, y: number) => {
      joyRef.current = { x, y }
      ensureLoop()
    },
    [ensureLoop],
  )

  // Flechas del cursor: orbitan la vista (no hacen giros de cara).
  useEffect(() => {
    const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
    const onDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName)) return

      // Enter: restaura la vista inicial (igual que el botón "Restablecer").
      // No actúa si hay una modal abierta (p. ej. la ayuda).
      if (e.key === 'Enter') {
        if (e.repeat || document.querySelector('.modal__overlay')) return
        e.preventDefault()
        controlsRef.current?.reset()
        return
      }

      if (!ARROWS.includes(e.key)) return
      e.preventDefault() // evita el scroll de la página
      keysRef.current.add(e.key)
      ensureLoop()
    }
    const onUp = (e: KeyboardEvent) => {
      if (ARROWS.includes(e.key)) keysRef.current.delete(e.key)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [ensureLoop, controlsRef])

  useEffect(() => {
    let raf = 0
    let controls: ViewControlsHandle | null = null

    const recompute = () => {
      const c = controlsRef.current
      if (!c) return
      const dist = c.object.position.distanceTo(c.target)
      const next = {
        atMin: dist <= c.minDistance + EPS, // zoom máximo (más cerca)
        atMax: dist >= c.maxDistance - EPS, // zoom mínimo (más lejos)
        atInitial:
          c.object.position.distanceTo(c.position0) < EPS &&
          c.target.distanceTo(c.target0) < EPS &&
          c.object.up.distanceTo(c.up0) < EPS,
      }
      setState((s) =>
        s.atInitial === next.atInitial && s.atMin === next.atMin && s.atMax === next.atMax
          ? s
          : next,
      )
    }

    // Los controles se montan dentro del <Canvas>; esperamos a que existan.
    const attach = () => {
      const c = controlsRef.current
      if (!c) {
        raf = requestAnimationFrame(attach)
        return
      }
      controls = c
      c.addEventListener('change', recompute)
      recompute()
    }
    attach()

    return () => {
      cancelAnimationFrame(raf)
      controls?.removeEventListener('change', recompute)
    }
  }, [controlsRef])

  // Acerca/aleja la cámara escalando su distancia al objetivo (respeta los límites).
  const dolly = useCallback(
    (factor: number) => {
      const c = controlsRef.current
      if (!c) return
      const offset = c.object.position.clone().sub(c.target)
      const dist = Math.min(c.maxDistance, Math.max(c.minDistance, offset.length() * factor))
      offset.setLength(dist)
      c.object.position.copy(c.target).add(offset)
      c.update()
    },
    [controlsRef],
  )

  const resetView = useCallback(() => controlsRef.current?.reset(), [controlsRef])

  return (
    <>
      <div className="view-controls">
        {/* Modo libre: Mezclar (primary) + resolver paso a paso / Kociemba. Los dos
            resolver muestran el nº de pasos de su solución (en vez de un icono).
            Los iconos son provisionales. */}
        {free && (
          <>
            <Button variant="primary" size="sm" onClick={free.onScramble} disabled={free.busy}>
              <Icon name="sparkles" size="sm" />
              <VisuallyHidden>Mezclar</VisuallyHidden>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={free.onSolveStep}
              disabled={free.busy || free.solved}
            >
              {free.lblLength}
              <VisuallyHidden>Resolver paso a paso</VisuallyHidden>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={free.onSolveKociemba}
              disabled={free.busy || free.solved}
            >
              {free.kociembaLength ?? '…'}
              <VisuallyHidden>Resolver con Kociemba</VisuallyHidden>
            </Button>
          </>
        )}
        {/* Cronometrado: primer botón (primary) para comenzar (play) o reiniciar
            (stop). Sustituye al Comenzar/Reiniciar del antiguo panel. */}
        {timed &&
          (timed.started ? (
            <Button variant="primary" size="sm" onClick={timed.onRestart} disabled={timed.busy}>
              <Icon name="stop" size="sm" />
              <VisuallyHidden>{timed.solved ? 'Nueva partida' : 'Reiniciar'}</VisuallyHidden>
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={timed.onStart}>
              <Icon name="play" size="sm" />
              <VisuallyHidden>Comenzar</VisuallyHidden>
            </Button>
          ))}
        {/* Práctica: primer botón (primary) para pedir pista (cara → sentido). */}
        {practice && (
          <Button
            variant="primary"
            size="sm"
            onClick={practice.onHint}
            disabled={!practice.canHint}
          >
            <Icon name="eye" size="sm" />
            <VisuallyHidden>
              {practice.hintLevel === 0 ? 'Pista: ¿qué cara?' : 'Pista: ¿en qué sentido?'}
            </VisuallyHidden>
          </Button>
        )}
        {/* Guiado: primer botón (primary) para mostrar / ocultar el movimiento. */}
        {step && (
          <Button
            variant="primary"
            size="sm"
            onClick={step.onToggleMove}
            aria-pressed={step.showMove}
          >
            <Icon name={step.showMove ? 'eye-off' : 'eye'} size="sm" />
            <VisuallyHidden>
              {step.showMove ? 'Ocultar movimiento' : 'Mostrar movimiento'}
            </VisuallyHidden>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
          <Icon name="lifebuoy" size="sm" />
          <VisuallyHidden>Ayuda: teclas</VisuallyHidden>
        </Button>
        <Button variant="outline" size="sm" onClick={() => dolly(0.8)} disabled={atMin}>
          <Icon name="zoom-in" size="sm" />
          <VisuallyHidden>Acercar</VisuallyHidden>
        </Button>
        <Button variant="outline" size="sm" onClick={() => dolly(1.25)} disabled={atMax}>
          <Icon name="zoom-out" size="sm" />
          <VisuallyHidden>Alejar</VisuallyHidden>
        </Button>
        <Button variant="outline" size="sm" onClick={resetView} disabled={atInitial}>
          <Icon name="retry" size="sm" />
          <VisuallyHidden>Restaurar vista inicial</VisuallyHidden>
        </Button>

        <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Ayuda">
          <div className="help-keys">
            {free && (
              <>
                <p className="help-keys__intro">Acciones del modo libre:</p>
                <List type="plain" className="help-buttons">
                  <li>
                    <span className="help-buttons__icon">
                      <Icon name="sparkles" size="sm" />
                    </span>
                    <span>
                      <strong>Mezclar</strong> — desordena el cubo.
                    </span>
                  </li>
                  <li>
                    <span className="help-buttons__icon">{free.lblLength}</span>
                    <span>
                      <strong>Resolver paso a paso</strong> — por capas; el número son los
                      movimientos que tomará.
                    </span>
                  </li>
                  <li>
                    <span className="help-buttons__icon">{free.kociembaLength ?? '…'}</span>
                    <span>
                      <strong>Resolver con Kociemba</strong> — solución corta; el número son los
                      movimientos que tomará.
                    </span>
                  </li>
                </List>
              </>
            )}
            {timed && (
              <>
                <p className="help-keys__intro">Acciones del cronómetro:</p>
                <List type="plain" className="help-buttons">
                  <li>
                    <span className="help-buttons__icon">
                      <Icon name="play" size="sm" />
                    </span>
                    <span>
                      <strong>Comenzar</strong> — revela el cubo y arranca el cronómetro.
                    </span>
                  </li>
                  <li>
                    <span className="help-buttons__icon">
                      <Icon name="stop" size="sm" />
                    </span>
                    <span>
                      <strong>Reiniciar</strong> — nueva mezcla y cronómetro a cero.
                    </span>
                  </li>
                </List>
              </>
            )}
            {practice && (
              <>
                <p className="help-keys__intro">Acción del modo práctica:</p>
                <List type="plain" className="help-buttons">
                  <li>
                    <span className="help-buttons__icon">
                      <Icon name="eye" size="sm" />
                    </span>
                    <span>
                      <strong>Pista</strong> — revela primero la cara y luego el sentido del giro.
                    </span>
                  </li>
                </List>
              </>
            )}
            {step && (
              <>
                <p className="help-keys__intro">Acción del modo guiado:</p>
                <List type="plain" className="help-buttons">
                  <li>
                    <span className="help-buttons__icon">
                      <Icon name="eye" size="sm" />
                    </span>
                    <span>
                      <strong>Mostrar / ocultar movimiento</strong> — revela u oculta el siguiente
                      movimiento a hacer.
                    </span>
                  </li>
                </List>
              </>
            )}
            {mode !== 'view' && (
              <>
                <p className="help-keys__intro">Gira las caras del cubo con el teclado:</p>
                <List type="plain" className="help-keys__list">
                  {KEY_ROWS.map(({ key, label }) => (
                    <li key={key}>
                      <Kbd size="sm">{key}</Kbd>
                      <span>{label}</span>
                    </li>
                  ))}
                </List>
                <p className="help-keys__note">
                  Mantén <Kbd size="sm">Shift</Kbd> a la vez para hacer el giro inverso.
                </p>
              </>
            )}
            <p className="help-keys__note">
              Gira la <strong>vista</strong> con las flechas <Kbd size="sm">←</Kbd>{' '}
              <Kbd size="sm">→</Kbd> <Kbd size="sm">↑</Kbd> <Kbd size="sm">↓</Kbd>, con el joystick
              o arrastrando con el ratón.
            </p>
            {(mode === 'free' || mode === 'timed') && (
              <p className="help-keys__note">
                <Kbd size="sm">Esc</Kbd> reinicia el cubo.
              </p>
            )}
            {mode === 'practice' && (
              <p className="help-keys__note">
                <Kbd size="sm">Espacio</Kbd> muestra una pista.
              </p>
            )}
            {mode === 'timed' && (
              <p className="help-keys__note">
                <Kbd size="sm">Espacio</Kbd> comienza la partida.
              </p>
            )}
          </div>
        </Modal>
      </div>

      <div className="view-joystick">
        <Joystick onVector={setJoy} />
      </div>
    </>
  )
}

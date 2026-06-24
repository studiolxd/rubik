import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Quaternion, Vector3 } from 'three'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { Icon } from '@studiolxd/brand/icon'
import { Select } from '@studiolxd/brand/select'
import { CheckboxField } from '@studiolxd/brand/checkbox-field'
import { RadioField } from '@studiolxd/brand/radio-field'
import { List } from '@studiolxd/brand/list'
import { Kbd } from '@studiolxd/brand/kbd'
import { IntroCube, type CubieFocus } from './IntroCube'
import { MovesCube } from './MovesCube'
import { ViewControls, type ViewControlsHandle } from './ViewControls'
import { useMovesCube } from './three/cube/useMovesCube'
import { FACES, type Cubie, type Face, type Vec3 } from './three/cube/engine'

/** Nombre de cada cara para describir sus giros. */
const FACE_LABEL: Record<Face, string> = {
  U: 'de arriba',
  D: 'de abajo',
  L: 'izquierda',
  R: 'derecha',
  F: 'frontal',
  B: 'trasera',
}
/** Notación WCA del giro (R, R', …); sirve también de clave de "practicado". */
const moveNotation = (face: Face, prime: boolean) => face + (prime ? "'" : '')

/** ¿Misma posición de rejilla? */
const sameVec = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
/** Clave estable de una pieza por su posición resuelta. */
const keyOf = (pos: Vec3) => pos.join(',')

/** Pieza interactiva de una pantalla: posición resuelta + frase. */
interface IntroItem {
  pos: Vec3
  text: string
}

/** Una pantalla de la introducción: cubo (con resaltado) a la izquierda + texto a la derecha. */
interface IntroStep {
  /** Bloque temático al que pertenece (p. ej. "Partes del cubo"). */
  group: string
  title: string
  /** Texto introductorio del apartado. */
  intro: ReactNode
  /** Piezas a resaltar en el cubo (las demás se atenúan). */
  focus?: CubieFocus
  /** Piezas clicables: pulsar la pieza en el cubo la marca; pulsar su check enfoca la cámara. */
  items?: IntroItem[]
  /**
   * Grupos seleccionables (p. ej. los niveles). Cada check resalta su grupo y
   * atenúa el resto; con varios marcados se resalta la unión; sin ninguno, todo.
   */
  selectable?: { key: string; text: string; match: CubieFocus }[]
  /**
   * Movimientos a practicar: se monta un cubo interactivo y cada giro se hace
   * pulsando su tecla (o su check). Cada movimiento se marca al practicarlo.
   */
  moves?: { face: Face; prime: boolean }[]
}

/** Los 6 centros: piezas con un solo eje no nulo. */
const isCenter: CubieFocus = (c: Cubie) => c.home.filter((v) => v !== 0).length === 1
/** Las 12 aristas/laterales: piezas con dos ejes no nulos. */
const isEdge: CubieFocus = (c: Cubie) => c.home.filter((v) => v !== 0).length === 2
/** Las 8 esquinas: piezas con los tres ejes no nulos. */
const isCorner: CubieFocus = (c: Cubie) => c.home.filter((v) => v !== 0).length === 3

const STEPS: IntroStep[] = [
  {
    group: 'Partes del cubo',
    title: 'Los centros',
    focus: isCenter,
    intro: (
      <>
        <Paragraph>
          El cubo tiene <strong>6 centros</strong>, uno por cara. Son su brújula: están sujetos al
          núcleo y <strong>nunca cambian de sitio</strong>, ni siquiera al girar.
        </Paragraph>
        <Paragraph>
          Por eso cada centro <strong>fija el color de su cara</strong>: donde está el blanco, esa
          es la cara blanca. Pulsa un centro para marcarlo, o su casilla para girar la cámara hacia
          él.
        </Paragraph>
      </>
    ),
    items: [
      { pos: [1, 0, 0], text: 'El centro rojo es la cara roja.' },
      { pos: [-1, 0, 0], text: 'El centro naranja es la cara naranja.' },
      { pos: [0, 1, 0], text: 'El centro blanco es la cara blanca.' },
      { pos: [0, -1, 0], text: 'El centro amarillo es la cara amarilla.' },
      { pos: [0, 0, 1], text: 'El centro verde es la cara verde.' },
      { pos: [0, 0, -1], text: 'El centro azul es la cara azul.' },
    ],
  },
  {
    group: 'Partes del cubo',
    title: 'Las aristas',
    focus: isEdge,
    intro: (
      <>
        <Paragraph>
          Las <strong>aristas</strong> son las piezas de los bordes. Llevan{' '}
          <strong>dos colores</strong>, uno por cada cara vecina a la que pertenecen. Hay{' '}
          <strong>12</strong> y, a diferencia de los centros, <strong>sí se mueven</strong>.
        </Paragraph>
        <Paragraph>
          Aun así, cada arista tiene <strong>un único sitio</strong>: aquel donde sus dos colores
          casan con los centros de ambas caras. Pulsa una para marcarla, o su casilla para
          enfocarla.
        </Paragraph>
      </>
    ),
    // Pares de caras contiguas (blanco arriba, amarillo abajo; rojo/naranja, verde/azul a los lados).
    items: [
      { pos: [1, 1, 0], text: 'Un lateral blanco y rojo.' },
      { pos: [-1, 1, 0], text: 'Un lateral blanco y naranja.' },
      { pos: [0, 1, 1], text: 'Un lateral blanco y verde.' },
      { pos: [0, 1, -1], text: 'Un lateral blanco y azul.' },
      { pos: [1, -1, 0], text: 'Un lateral amarillo y rojo.' },
      { pos: [-1, -1, 0], text: 'Un lateral amarillo y naranja.' },
      { pos: [0, -1, 1], text: 'Un lateral amarillo y verde.' },
      { pos: [0, -1, -1], text: 'Un lateral amarillo y azul.' },
      { pos: [1, 0, 1], text: 'Un lateral rojo y verde.' },
      { pos: [1, 0, -1], text: 'Un lateral rojo y azul.' },
      { pos: [-1, 0, 1], text: 'Un lateral naranja y verde.' },
      { pos: [-1, 0, -1], text: 'Un lateral naranja y azul.' },
    ],
  },
  {
    group: 'Partes del cubo',
    title: 'Las esquinas',
    focus: isCorner,
    intro: (
      <>
        <Paragraph>
          Las <strong>esquinas</strong> son los vértices del cubo. Llevan{' '}
          <strong>tres colores</strong> porque tocan tres caras a la vez. Hay <strong>8</strong> y,
          como las aristas, <strong>también se mueven</strong>.
        </Paragraph>
        <Paragraph>
          Cada esquina tiene <strong>un único sitio</strong>: aquel donde sus tres colores casan con
          los centros que la rodean. Pulsa una para marcarla, o su casilla para enfocarla.
        </Paragraph>
      </>
    ),
    // Cada esquina toca tres caras contiguas (blanco arriba / amarillo abajo,
    // nunca juntos por ser opuestos; rojo/naranja y verde/azul a los lados).
    items: [
      { pos: [1, 1, 1], text: 'Una esquina blanca, roja y verde.' },
      { pos: [-1, 1, 1], text: 'Una esquina blanca, naranja y verde.' },
      { pos: [1, 1, -1], text: 'Una esquina blanca, roja y azul.' },
      { pos: [-1, 1, -1], text: 'Una esquina blanca, naranja y azul.' },
      { pos: [1, -1, 1], text: 'Una esquina amarilla, roja y verde.' },
      { pos: [-1, -1, 1], text: 'Una esquina amarilla, naranja y verde.' },
      { pos: [1, -1, -1], text: 'Una esquina amarilla, roja y azul.' },
      { pos: [-1, -1, -1], text: 'Una esquina amarilla, naranja y azul.' },
    ],
  },
  {
    group: 'Partes del cubo',
    title: 'Los niveles',
    intro: (
      <>
        <Paragraph>
          Para resolverlo, imaginamos el cubo dividido en <strong>tres niveles</strong>{' '}
          horizontales: arriba, en medio y abajo.
        </Paragraph>
        <Paragraph>
          El método <strong>capa por capa</strong> los resuelve en orden, de arriba abajo,{' '}
          <strong>sin estropear lo ya hecho</strong>. Pulsa un nivel para resaltarlo y ver qué
          piezas lo forman.
        </Paragraph>
      </>
    ),
    selectable: [
      { key: 'top', text: 'Nivel superior (capa de arriba)', match: (c) => c.home[1] === 1 },
      { key: 'middle', text: 'Nivel medio (capa del centro)', match: (c) => c.home[1] === 0 },
      { key: 'bottom', text: 'Nivel inferior (capa de abajo)', match: (c) => c.home[1] === -1 },
    ],
  },
  {
    group: 'Movimientos del cubo',
    title: 'Movimientos en sentido horario',
    intro: (
      <>
        <Paragraph>
          Cada cara gira de forma independiente. Para un giro en <strong>sentido horario</strong>{' '}
          —mirando esa cara de frente— pulsa la <strong>tecla de su cara</strong> (U, D, L, R, F,
          B).
        </Paragraph>
        <Paragraph>
          Pruébalo: pulsa una tecla y mira cómo gira <strong>solo esa capa</strong>. También puedes
          usar su casilla.
        </Paragraph>
      </>
    ),
    moves: FACES.map((face) => ({ face, prime: false })),
  },
  {
    group: 'Movimientos del cubo',
    title: 'Movimientos en sentido antihorario',
    intro: (
      <>
        <Paragraph>
          El mismo giro, pero al revés: para el <strong>sentido antihorario</strong>, mantén pulsado{' '}
          <strong>Mayús (Shift)</strong> mientras pulsas la tecla de la cara.
        </Paragraph>
        <Paragraph>
          Con estos dos gestos —tecla y Shift+tecla— ya puedes hacer{' '}
          <strong>cualquier movimiento</strong>. Practica cada uno; también desde su casilla.
        </Paragraph>
      </>
    ),
    moves: FACES.map((face) => ({ face, prime: true })),
  },
]

/** Etiqueta breve de cada paso (mismo orden que STEPS), sobre el título del panel. */
const STEP_LABELS = [
  'Centros',
  'Laterales o aristas',
  'Esquinas',
  'Niveles',
  'Movimientos en sentido horario',
  'Movimientos en sentido antihorario',
]

/** Sección "Introducción al cubo": recorrido por pantallas con cubo + explicación. */
export function Introduction() {
  const [index, setIndex] = useState(0)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const step = STEPS[index]
  const isFirst = index === 0
  const isLast = index === STEPS.length - 1
  const controlsRef = useRef<ViewControlsHandle | null>(null)
  const rafRef = useRef(0)
  const movesCtrl = useMovesCube()
  // `doMove` es estable (useCallback): se usa como dependencia de practiceTurn.
  const moveCube = movesCtrl.doMove

  // Cancela cualquier animación de cámara en curso al desmontar.
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const markChecked = (key: string) => setChecked((prev) => new Set(prev).add(key))

  // Practica un giro (de teclado o de arrastre): lo anima y, si está en la lista
  // del paso, lo marca como practicado. Estable por paso (mismo callback para
  // teclado y para el gesto de arrastre del cubo).
  const practiceTurn = useCallback(
    (face: Face, prime: boolean) => {
      moveCube(face, prime)
      if (step.moves?.some((m) => m.face === face && m.prime === prime)) {
        setChecked((prev) => new Set(prev).add(moveNotation(face, prime)))
      }
    },
    [step, moveCube],
  )

  // Practicar giros con el teclado (solo en pasos de movimientos): tecla de cara
  // → giro horario; con Shift → antihorario.
  useEffect(() => {
    if (!step.moves) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      const face = e.key.toUpperCase() as Face
      if (!FACES.includes(face) || e.repeat) return
      e.preventDefault()
      practiceTurn(face, e.shiftKey)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step.moves, practiceTurn])

  // Cambiar de pantalla limpia las marcas y devuelve el cubo de práctica a resuelto.
  const goTo = (next: number) => {
    setIndex(next)
    setChecked(new Set())
    movesCtrl.reset()
  }

  // Selección única (radio): deja marcado solo ese nivel.
  const selectOne = (key: string) => setChecked(new Set([key]))

  // Resaltado del cubo: estático (focus) salvo en pasos seleccionables, donde
  // depende del nivel elegido (sin ninguno se ve todo; con uno, solo ese).
  const cubeFocus: CubieFocus | undefined = step.selectable
    ? (c) =>
        checked.size === 0 ? true : step.selectable!.some((s) => checked.has(s.key) && s.match(c))
    : step.focus

  // Gira la cámara (animada) para dejar de frente la pieza (su normal = posición normalizada).
  const flyToPiece = (pos: Vec3) => {
    const c = controlsRef.current
    if (!c) return
    cancelAnimationFrame(rafRef.current)

    const dist = c.object.position.distanceTo(c.target)
    const fromOffset = c.object.position.clone().sub(c.target)
    const fromUp = c.object.up.clone()
    const toDir = new Vector3(...pos).normalize()
    // Rotación que lleva la dirección de cámara actual a la de la pieza.
    const q = new Quaternion().setFromUnitVectors(fromOffset.clone().normalize(), toDir)
    const qStep = new Quaternion()

    const start = performance.now()
    const DUR = 450
    const tick = (now: number) => {
      const t = Math.min((now - start) / DUR, 1)
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // easeInOutQuad
      qStep.identity().slerp(q, e)
      c.object.position
        .copy(c.target)
        .add(fromOffset.clone().applyQuaternion(qStep).setLength(dist))
      c.object.up.copy(fromUp.clone().applyQuaternion(qStep))
      c.update()
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  // Navegador de pasos (Select de marca). Se pinta en dos sitios y se muestra
  // uno u otro por CSS: arriba sobre el cubo (<1280) o al inicio del aside
  // (≥1280). El componente no reenvía className, así que va envuelto en un div.
  const stepOptions = STEPS.map((s, i) => ({ value: String(i), label: `${i + 1}. ${s.title}` }))
  const renderStepSelect = (className: string) => (
    <div className={className}>
      <Select
        options={stepOptions}
        value={String(index)}
        onValueChange={(v: string) => goTo(Number(v))}
        aria-label="Ir a un paso"
      />
    </div>
  )

  return (
    <div className="intro">
      {renderStepSelect('intro__select intro__select--top')}
      <div className="intro__main">
        <section className="intro__stage">
          {step.moves ? (
            <MovesCube controller={movesCtrl} controlsRef={controlsRef} onTurn={practiceTurn} />
          ) : (
            <IntroCube
              focus={cubeFocus}
              controlsRef={controlsRef}
              onPick={
                step.items
                  ? (c) => {
                      const item = step.items!.find((it) => sameVec(it.pos, c.home))
                      if (item) markChecked(keyOf(item.pos))
                    }
                  : undefined
              }
            />
          )}
          {/* Solo giro de vista: ayuda, zoom y restaurar. El `key` lo remonta al
            cambiar de cubo (estático ↔ interactivo) para re-enlazar los controles. */}
          <ViewControls
            key={step.moves ? 'moves' : 'static'}
            controlsRef={controlsRef}
            mode="view"
          />
        </section>

        {/* Navegación por pasos (como en "El cubo por dentro"): debajo del cubo y
          alineados a la derecha por debajo de 1080px; superpuestos al cubo, uno
          a cada lado, a partir de 1080px. */}
        <div className="intro__arrows">
          <button
            type="button"
            className="intro__chevron"
            onClick={() => goTo(index - 1)}
            disabled={isFirst}
            aria-label="Paso anterior"
          >
            <Icon name="chevron" size="lg" className="intro__chevron-icon--prev" />
          </button>
          <button
            type="button"
            className="intro__chevron"
            onClick={() => goTo(index + 1)}
            disabled={isLast}
            aria-label="Paso siguiente"
          >
            <Icon name="chevron" size="lg" />
          </button>
        </div>
      </div>

      <aside className="intro__panel">
        {renderStepSelect('intro__select intro__select--aside')}

        <div className="intro__content">
          <span className="intro__step">{STEP_LABELS[index]}</span>
          <Heading level={1}>{step.group}</Heading>
          {step.intro}
          {step.items && (
            <List type="plain" className="intro__checks">
              {step.items.map((it) => (
                <li key={keyOf(it.pos)}>
                  <CheckboxField
                    label={it.text}
                    checked={checked.has(keyOf(it.pos))}
                    onCheckedChange={() => {
                      markChecked(keyOf(it.pos))
                      flyToPiece(it.pos)
                    }}
                  />
                </li>
              ))}
            </List>
          )}
          {step.selectable && (
            <List type="plain" className="intro__checks">
              {step.selectable.map((s) => (
                <li key={s.key}>
                  <RadioField
                    name="intro-level"
                    value={s.key}
                    label={s.text}
                    checked={checked.has(s.key)}
                    onChange={() => selectOne(s.key)}
                  />
                </li>
              ))}
            </List>
          )}
          {step.moves && (
            <List type="plain" className="intro__checks">
              {step.moves.map((m) => {
                const key = moveNotation(m.face, m.prime)
                return (
                  <li key={key}>
                    <CheckboxField
                      label={
                        <span className="intro__move-label">
                          <span>
                            <strong>{key}</strong> — gira la cara {FACE_LABEL[m.face]} en sentido{' '}
                            {m.prime ? 'antihorario' : 'horario'}.
                          </span>
                          <span className="keyhint">
                            {m.prime && (
                              <>
                                <Kbd size="sm">Shift</Kbd>
                                <span className="keyhint__plus">+</span>
                              </>
                            )}
                            <Kbd size="sm">{m.face}</Kbd>
                          </span>
                        </span>
                      }
                      checked={checked.has(key)}
                      onCheckedChange={() => {
                        movesCtrl.doMove(m.face, m.prime)
                        markChecked(key)
                      }}
                    />
                  </li>
                )
              })}
            </List>
          )}
        </div>
      </aside>
    </div>
  )
}

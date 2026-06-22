import { useState } from 'react'
import { Button } from '@studiolxd/brand/button'
import { Heading } from '@studiolxd/brand/heading'
import { Paragraph } from '@studiolxd/brand/paragraph'
import { CubeExperience } from './CubeExperience'
import { CubeScan } from './CubeScan'

/**
 * Modo guiado: antes de resolver, elige el punto de partida.
 *  - "Escanear mi cubo" → captura el cubo real con la cámara.
 *  - "Cubo de ejemplo"  → una mezcla aleatoria (comportamiento clásico).
 * Una vez fijado el estado, monta la experiencia paso a paso.
 */
type Phase = 'choose' | 'scan' | 'play'

export function Guiado() {
  const [phase, setPhase] = useState<Phase>('choose')
  const [facelets, setFacelets] = useState<string>()

  if (phase === 'scan') {
    return (
      <CubeScan
        onComplete={(f) => {
          setFacelets(f)
          setPhase('play')
        }}
        onCancel={() => setPhase('choose')}
      />
    )
  }

  if (phase === 'play') {
    // `key` fuerza un montaje limpio del cubo con el estado elegido.
    return <CubeExperience key={facelets ?? 'example'} mode="step" initialFacelets={facelets} />
  }

  return (
    <div className="guided-choose">
      <Heading level={2} size={3} weight="semibold">
        ¿Qué cubo quieres resolver?
      </Heading>
      <Paragraph>
        Escanea tu cubo real con la cámara y te guiamos para resolver justo ese, o practica con un
        cubo de ejemplo mezclado al azar.
      </Paragraph>
      <div className="guided-choose__actions">
        <Button variant="primary" onClick={() => setPhase('scan')}>
          Escanear mi cubo
        </Button>
        <Button variant="outline" onClick={() => setPhase('play')}>
          Usar un cubo de ejemplo
        </Button>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Table } from '@studiolxd/brand/table'
import { Pagination } from '@studiolxd/brand/pagination'
import { Heading } from '@studiolxd/brand/heading'

const TOTAL = 500
const PAGE_SIZE = 20

interface Entry {
  /** Siglas del jugador: 4 letras mayúsculas. */
  user: string
  /** Tiempo de resolución en centésimas de segundo. */
  timeCs: number
}

/** 4 letras mayúsculas A–Z al azar. */
function randomInitials(): string {
  let s = ''
  for (let i = 0; i < 4; i++) {
    s += String.fromCharCode(65 + Math.floor(Math.random() * 26))
  }
  return s
}

/** Centésimas → "mm:ss.cc" con relleno (p. ej. 00:42.07). */
function formatTime(cs: number): string {
  const minutes = Math.floor(cs / 6000)
  const seconds = Math.floor((cs % 6000) / 100)
  const cents = cs % 100
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(minutes)}:${pad(seconds)}.${pad(cents)}`
}

/**
 * Ranking de tiempos: 500 registros aleatorios (usuario + tiempo) en una
 * tabla de marca, ordenados del mejor (menor) al peor tiempo y paginados.
 */
export function Ranking() {
  const [page, setPage] = useState(1)

  // Se generan una sola vez (al montar): no se regeneran al paginar.
  const entries = useMemo<Entry[]>(() => {
    const rows: Entry[] = Array.from({ length: TOTAL }, () => ({
      user: randomInitials(),
      // Entre 5,00 s (500) y 5:00,00 (30000).
      timeCs: 500 + Math.floor(Math.random() * 29501),
    }))
    rows.sort((a, b) => a.timeCs - b.timeCs)
    return rows
  }, [])

  const start = (page - 1) * PAGE_SIZE
  const pageRows = entries.slice(start, start + PAGE_SIZE)

  return (
    <article className="ranking">
      <header className="ranking__intro">
        <Heading level={1}>Ranking</Heading>
      </header>

      <Table caption="Clasificación de tiempos de resolución">
        <Table.Head>
          <Table.Row>
            <Table.Header scope="col">#</Table.Header>
            <Table.Header scope="col">Usuario</Table.Header>
            <Table.Header scope="col">Tiempo</Table.Header>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {pageRows.map((entry, i) => (
            <Table.Row key={start + i}>
              <Table.Cell>{start + i + 1}</Table.Cell>
              <Table.Cell>{entry.user}</Table.Cell>
              <Table.Cell>{formatTime(entry.timeCs)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      <Pagination
        className="ranking__pagination"
        total={TOTAL}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </article>
  )
}

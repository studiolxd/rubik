import Cube from 'cubejs'
import { parseMoves, type Move } from './engine'

let solverReady = false

/** Precalcula (una sola vez) las tablas del solucionador de Kociemba. Es lento (~0.7s). */
export function ensureSolver(): void {
  if (!solverReady) {
    Cube.initSolver()
    solverReady = true
  }
}

/** Devuelve la secuencia de movimientos que resuelve el estado actual de `cube`. */
export function solveCube(cube: Cube): Move[] {
  ensureSolver()
  const solution = cube.solve()
  return solution.trim() ? parseMoves(solution) : []
}

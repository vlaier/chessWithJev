import { describe, expect, it } from 'vitest'
import { algebraicToSquare } from './board'
import { applyMove } from './gameState'
import { parseFEN } from './fen'
import { getLegalMoves } from './legality'
import type { Move } from './types'

function findMove(state: ReturnType<typeof parseFEN>, from: string, to: string): Move {
  const move = getLegalMoves(state, algebraicToSquare(from)).find(
    (m) => m.to === algebraicToSquare(to),
  )
  if (!move) throw new Error(`expected legal move ${from}->${to}`)
  return move
}

describe('SAN disambiguation', () => {
  it('disambiguates by file when two rooks on the same rank could move to the same square', () => {
    const state = parseFEN('4k3/8/8/8/8/K7/8/R6R w - - 0 1')
    const move = findMove(state, 'a1', 'd1')
    const next = applyMove(state, move)
    expect(next.history[0].san).toBe('Rad1')
  })

  it('disambiguates by rank when two rooks on the same file could move to the same square', () => {
    const state = parseFEN('R7/8/8/8/8/7K/4k3/R7 w - - 0 1')
    const move = findMove(state, 'a1', 'a5')
    const next = applyMove(state, move)
    expect(next.history[0].san).toBe('R1a5')
  })

  it('marks captures with x', () => {
    const state = parseFEN('4k3/8/8/8/8/8/5p2/4K2N w - - 0 1')
    const move = findMove(state, 'h1', 'f2')
    const next = applyMove(state, move)
    expect(next.history[0].san).toBe('Nxf2')
  })

  it('marks pawn captures with the origin file', () => {
    const state = parseFEN('4k3/8/8/8/3p4/4P3/8/4K3 w - - 0 1')
    const move = findMove(state, 'e3', 'd4')
    const next = applyMove(state, move)
    expect(next.history[0].san).toBe('exd4')
  })
})

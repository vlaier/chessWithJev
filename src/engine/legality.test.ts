import { describe, expect, it } from 'vitest'
import { algebraicToSquare, squareToAlgebraic } from './board'
import { applyMove, createInitialState } from './gameState'
import { parseFEN } from './fen'
import { getAllLegalMoves, getLegalMoves, isInCheck } from './legality'
import type { GameState } from './types'

const targets = (state: GameState, from: string) =>
  getLegalMoves(state, algebraicToSquare(from))
    .map((m) => squareToAlgebraic(m.to))
    .sort()

describe('pins', () => {
  it('a pinned piece cannot move off the pin line', () => {
    // White king e1, white bishop e2 pinned by black rook e8. Bishop cannot move.
    const state = parseFEN('4r3/8/8/8/8/8/4B3/4K3 w - - 0 1')
    expect(targets(state, 'e2')).toEqual([])
  })

  it('a pinned piece can still move along the pin line', () => {
    // White king e1, white rook e2 pinned by black rook e8 — rook can still move along the e-file.
    const state = parseFEN('4r3/8/8/8/8/8/4R3/4K3 w - - 0 1')
    const result = targets(state, 'e2')
    expect(result).toContain('e3')
    expect(result).toContain('e7')
    expect(result).not.toContain('d2')
  })
})

describe('check evasion', () => {
  it('only moves that escape check are legal', () => {
    // Black king e8 in check from white rook e1; king can only step off the e-file.
    const state = parseFEN('4k3/8/8/8/8/8/8/4R3 b - - 0 1')
    const kingMoves = targets(state, 'e8')
    expect(kingMoves).not.toContain('e7')
    expect(kingMoves.length).toBeGreaterThan(0)
    for (const sq of kingMoves) {
      expect(sq.startsWith('d') || sq.startsWith('f')).toBe(true)
    }
  })

  it('a king cannot step to a square still attacked along the same check line', () => {
    // Black king in check from a rook on the same file — stepping one square
    // up the same file is still in check and must not be offered.
    const state = parseFEN('4k3/8/8/8/8/8/8/4R2K b - - 0 1')
    expect(isInCheck(state.board, 'black')).toBe(true)
    expect(targets(state, 'e8')).not.toContain('e7')
  })
})

describe('checkmate detection', () => {
  it('recognizes a mate position', () => {
    // King+queen mate: Kh8 boxed in by Qg7 (defended by Kg6) with g8/h7 covered.
    const mateState = parseFEN('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1')
    expect(getAllLegalMoves(mateState, 'black')).toEqual([])
    expect(isInCheck(mateState.board, 'black')).toBe(true)
  })

  it('applyMove reports checkmate status', () => {
    // Fool's mate style: after this final move black is checkmated.
    let state = createInitialState()
    const play = (from: string, to: string) => {
      const move = getLegalMoves(state, algebraicToSquare(from)).find(
        (m) => m.to === algebraicToSquare(to),
      )
      if (!move) throw new Error(`no legal move ${from}->${to}`)
      state = applyMove(state, move)
    }
    play('f2', 'f3')
    play('e7', 'e5')
    play('g2', 'g4')
    play('d8', 'h4')
    expect(state.status).toBe('checkmate')
  })
})

describe('stalemate detection', () => {
  it('recognizes a stalemate position', () => {
    // Classic stalemate: black king a8, white king a6, white queen b6 - black has no moves, not in check.
    const state = parseFEN('k7/8/1Q6/K7/8/8/8/8 b - - 0 1')
    expect(getAllLegalMoves(state, 'black')).toEqual([])
    expect(isInCheck(state.board, 'black')).toBe(false)
  })
})

describe('perft (move-count sanity check)', () => {
  function perft(state: GameState, depth: number): number {
    if (depth === 0) return 1
    const moves = getAllLegalMoves(state, state.sideToMove)
    if (depth === 1) return moves.length
    let count = 0
    for (const move of moves) {
      const next = applyMove(state, move)
      count += perft(next, depth - 1)
    }
    return count
  }

  it('matches known perft values from the starting position', () => {
    const state = createInitialState()
    expect(perft(state, 1)).toBe(20)
    expect(perft(state, 2)).toBe(400)
  }, 20000)
})

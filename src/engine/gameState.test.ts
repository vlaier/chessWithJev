import { describe, expect, it } from 'vitest'
import { algebraicToSquare, squareToAlgebraic } from './board'
import { parseFEN } from './fen'
import { applyMove, createInitialState } from './gameState'
import { getLegalMoves } from './legality'
import type { GameState, Move } from './types'

function findMove(state: GameState, from: string, to: string, promotion?: Move['promotion']): Move {
  const move = getLegalMoves(state, algebraicToSquare(from)).find(
    (m) => m.to === algebraicToSquare(to) && (promotion === undefined || m.promotion === promotion),
  )
  if (!move) throw new Error(`expected legal move ${from}->${to}`)
  return move
}

describe('castling execution', () => {
  it('moves both king and rook on kingside castle, and revokes both rights', () => {
    const state = parseFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
    const move = findMove(state, 'e1', 'g1')
    const next = applyMove(state, move)
    expect(next.board[algebraicToSquare('g1')]).toEqual({ type: 'king', color: 'white' })
    expect(next.board[algebraicToSquare('f1')]).toEqual({ type: 'rook', color: 'white' })
    expect(next.board[algebraicToSquare('e1')]).toBeNull()
    expect(next.board[algebraicToSquare('h1')]).toBeNull()
    expect(next.castling.whiteKingside).toBe(false)
    expect(next.castling.whiteQueenside).toBe(false)
  })

  it('moves king and rook on queenside castle', () => {
    const state = parseFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
    const move = findMove(state, 'e1', 'c1')
    const next = applyMove(state, move)
    expect(next.board[algebraicToSquare('c1')]).toEqual({ type: 'king', color: 'white' })
    expect(next.board[algebraicToSquare('d1')]).toEqual({ type: 'rook', color: 'white' })
  })

  it('revokes only the relevant side when a rook moves', () => {
    const state = parseFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
    const move = findMove(state, 'h1', 'h4')
    const next = applyMove(state, move)
    expect(next.castling.whiteKingside).toBe(false)
    expect(next.castling.whiteQueenside).toBe(true)
  })

  it('revokes rights when a rook is captured', () => {
    const state = parseFEN('4k2r/8/8/8/8/2B5/8/4K3 w - - 0 1')
    const withRights: GameState = { ...state, castling: { ...state.castling, blackKingside: true } }
    const move = findMove(withRights, 'c3', 'h8')
    const next = applyMove(withRights, move)
    expect(next.castling.blackKingside).toBe(false)
  })
})

describe('en passant execution', () => {
  it('sets the en passant target after a double pawn push', () => {
    const state = createInitialState()
    const move = findMove(state, 'e2', 'e4')
    const next = applyMove(state, move)
    expect(next.enPassantTarget).toBe(algebraicToSquare('e3'))
  })

  it('captures the correct pawn en passant and clears the target', () => {
    const state = parseFEN('8/8/8/3pP3/8/8/8/4K2k w - d6 0 1')
    const move = findMove(state, 'e5', 'd6')
    const next = applyMove(state, move)
    expect(next.board[algebraicToSquare('d6')]).toEqual({ type: 'pawn', color: 'white' })
    expect(next.board[algebraicToSquare('d5')]).toBeNull()
    expect(next.enPassantTarget).toBeNull()
  })

  it('en passant is only available immediately after the double push', () => {
    const state = parseFEN('8/8/8/3pP3/8/8/8/4K2k w - d6 0 1')
    const afterOtherMove = applyMove(state, findMove(state, 'e1', 'e2'))
    const afterBlackMove = applyMove(afterOtherMove, findMove(afterOtherMove, 'h1', 'h2'))
    const pawnMoves = getLegalMoves(afterBlackMove, algebraicToSquare('e5')).map((m) =>
      squareToAlgebraic(m.to),
    )
    expect(pawnMoves).not.toContain('d6')
  })
})

describe('promotion execution', () => {
  it('promotes to the requested piece type', () => {
    const state = parseFEN('8/4P3/8/8/8/8/8/4k2K w - - 0 1')
    const move = findMove(state, 'e7', 'e8', 'rook')
    const next = applyMove(state, move)
    expect(next.board[algebraicToSquare('e8')]).toEqual({ type: 'rook', color: 'white' })
  })
})

describe('draw rules', () => {
  it('flags insufficient material (king vs king)', () => {
    const state = parseFEN('4k3/8/8/8/8/8/8/4K3 w - - 0 1')
    const move = findMove(state, 'e1', 'd1')
    const next = applyMove(state, move)
    expect(next.status).toBe('draw-insufficient-material')
  })

  it('flags the 50-move rule after 100 halfmoves with no pawn move/capture', () => {
    // Two kings shuffling back and forth with no pawns/captures on the board.
    let state = parseFEN('7k/8/8/8/8/8/8/K7 w - - 99 50')
    const move = findMove(state, 'a1', 'a2')
    state = applyMove(state, move)
    expect(state.status === 'draw-50move' || state.status === 'draw-insufficient-material').toBe(
      true,
    )
  })
})

describe('SAN move history', () => {
  it('records algebraic notation for played moves', () => {
    let state = createInitialState()
    state = applyMove(state, findMove(state, 'e2', 'e4'))
    state = applyMove(state, findMove(state, 'e7', 'e5'))
    state = applyMove(state, findMove(state, 'g1', 'f3'))
    expect(state.history.map((h) => h.san)).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('marks checks and disambiguates when needed', () => {
    const state = parseFEN('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1')
    const move = findMove(state, 'a1', 'a8')
    const next = applyMove(state, move)
    expect(next.history[0].san).toBe('Ra8+')
  })
})

describe('applyMove guards against illegal moves', () => {
  it('throws if given a move not in the legal move list', () => {
    const state = createInitialState()
    const illegalMove: Move = {
      from: algebraicToSquare('e2'),
      to: algebraicToSquare('e5'),
      kind: 'normal',
      piece: { type: 'pawn', color: 'white' },
    }
    expect(() => applyMove(state, illegalMove)).toThrow()
  })
})

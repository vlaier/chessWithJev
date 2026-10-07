import { isSquareAttacked } from './attacks'
import { cloneBoard, fileOf, findKing, rankOf, squareAt } from './board'
import { generateAllPseudoLegalMoves, generatePseudoLegalMoves } from './moves'
import type { Board, Color, GameState, Move, Square } from './types'
import { otherColor } from './types'

/** Applies `move` to a cloned board, for check-simulation purposes only.
 * Does not touch castling rights / en-passant target / clocks. */
export function simulateMove(board: Board, move: Move): Board {
  const next = cloneBoard(board)
  next[move.from] = null

  if (move.kind === 'en-passant') {
    const dir = move.piece.color === 'white' ? -1 : 1
    const capturedSquare = squareAt(fileOf(move.to), rankOf(move.to) + dir)
    if (capturedSquare !== null) next[capturedSquare] = null
    next[move.to] = move.piece
  } else if (move.kind === 'promotion' || move.kind === 'promotion-capture') {
    next[move.to] = { type: move.promotion ?? 'queen', color: move.piece.color }
  } else if (move.kind === 'castle-kingside' || move.kind === 'castle-queenside') {
    const rank = rankOf(move.from)
    next[move.to] = move.piece
    if (move.kind === 'castle-kingside') {
      const rookFrom = squareAt(7, rank) as Square
      const rookTo = squareAt(5, rank) as Square
      next[rookTo] = next[rookFrom]
      next[rookFrom] = null
    } else {
      const rookFrom = squareAt(0, rank) as Square
      const rookTo = squareAt(3, rank) as Square
      next[rookTo] = next[rookFrom]
      next[rookFrom] = null
    }
  } else {
    next[move.to] = move.piece
  }

  return next
}

export function isInCheck(board: Board, color: Color): boolean {
  const kingSquare = findKing(board, color)
  if (kingSquare === null) return false
  return isSquareAttacked(board, kingSquare, otherColor(color))
}

/** The only source of truth for what a piece can legally do: pseudo-legal
 * moves filtered down to those that don't leave the mover's own king in check. */
export function getLegalMoves(state: GameState, from: Square): Move[] {
  const piece = state.board[from]
  if (!piece) return []
  const pseudoLegal = generatePseudoLegalMoves(state, from)
  return pseudoLegal.filter((move) => {
    const resultingBoard = simulateMove(state.board, move)
    return !isInCheck(resultingBoard, piece.color)
  })
}

export function getAllLegalMoves(state: GameState, color: Color): Move[] {
  const moves: Move[] = []
  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq]
    if (piece && piece.color === color) {
      moves.push(...getLegalMoves(state, sq))
    }
  }
  return moves
}

/** Used only for perft-style sanity checks / diagnostics — not part of the public UI-facing API. */
export function countAllPseudoLegalMoves(state: GameState, color: Color): number {
  return generateAllPseudoLegalMoves(state, color).length
}

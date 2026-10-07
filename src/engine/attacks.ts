import { fileOf, rankOf, squareAt } from './board'
import type { Board, Color, Square } from './types'

const KNIGHT_OFFSETS: [number, number][] = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
]

const KING_OFFSETS: [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
]

const BISHOP_DIRS: [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

const ROOK_DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const slidingAttacksInclude = (
  board: Board,
  from: Square,
  target: Square,
  dirs: [number, number][],
): boolean => {
  const file = fileOf(from)
  const rank = rankOf(from)
  for (const [df, dr] of dirs) {
    let f = file + df
    let r = rank + dr
    let sq = squareAt(f, r)
    while (sq !== null) {
      if (sq === target) return true
      if (board[sq]) break
      f += df
      r += dr
      sq = squareAt(f, r)
    }
  }
  return false
}

/** Is `square` attacked by any piece of `byColor`, given the current board? */
export const isSquareAttacked = (board: Board, square: Square, byColor: Color): boolean => {
  const file = fileOf(square)
  const rank = rankOf(square)

  // Pawns: a pawn of byColor attacks `square` if it sits diagonally "behind"
  // it from that pawn's perspective (i.e. one step toward the pawn's forward direction from square).
  const pawnRankDir = byColor === 'white' ? -1 : 1
  for (const df of [-1, 1]) {
    const sq = squareAt(file + df, rank + pawnRankDir)
    if (sq !== null) {
      const piece = board[sq]
      if (piece && piece.type === 'pawn' && piece.color === byColor) return true
    }
  }

  for (const [df, dr] of KNIGHT_OFFSETS) {
    const sq = squareAt(file + df, rank + dr)
    if (sq !== null) {
      const piece = board[sq]
      if (piece && piece.type === 'knight' && piece.color === byColor) return true
    }
  }

  for (const [df, dr] of KING_OFFSETS) {
    const sq = squareAt(file + df, rank + dr)
    if (sq !== null) {
      const piece = board[sq]
      if (piece && piece.type === 'king' && piece.color === byColor) return true
    }
  }

  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq]
    if (!piece || piece.color !== byColor) continue
    if (piece.type === 'bishop' || piece.type === 'queen') {
      if (slidingAttacksInclude(board, sq, square, BISHOP_DIRS)) return true
    }
    if (piece.type === 'rook' || piece.type === 'queen') {
      if (slidingAttacksInclude(board, sq, square, ROOK_DIRS)) return true
    }
  }

  return false
}

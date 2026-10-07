import { isSquareAttacked } from './attacks'
import { fileOf, rankOf, squareAt } from './board'
import type { Board, GameState, Move, Piece, PieceType, Square } from './types'
import { otherColor } from './types'

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

const PROMOTION_PIECES: PieceType[] = ['queen', 'rook', 'bishop', 'knight']

function pushSlidingMoves(
  board: Board,
  from: Square,
  piece: Piece,
  dirs: [number, number][],
  moves: Move[],
) {
  const file = fileOf(from)
  const rank = rankOf(from)
  for (const [df, dr] of dirs) {
    let f = file + df
    let r = rank + dr
    let sq = squareAt(f, r)
    while (sq !== null) {
      const occupant = board[sq]
      if (!occupant) {
        moves.push({ from, to: sq, kind: 'normal', piece })
      } else {
        if (occupant.color !== piece.color) {
          moves.push({ from, to: sq, kind: 'capture', piece, captured: occupant })
        }
        break
      }
      f += df
      r += dr
      sq = squareAt(f, r)
    }
  }
}

function pushStepMoves(
  board: Board,
  from: Square,
  piece: Piece,
  offsets: [number, number][],
  moves: Move[],
) {
  const file = fileOf(from)
  const rank = rankOf(from)
  for (const [df, dr] of offsets) {
    const sq = squareAt(file + df, rank + dr)
    if (sq === null) continue
    const occupant = board[sq]
    if (!occupant) {
      moves.push({ from, to: sq, kind: 'normal', piece })
    } else if (occupant.color !== piece.color) {
      moves.push({ from, to: sq, kind: 'capture', piece, captured: occupant })
    }
  }
}

function pawnMoves(state: GameState, from: Square, piece: Piece): Move[] {
  const { board } = state
  const moves: Move[] = []
  const dir = piece.color === 'white' ? 1 : -1
  const startRank = piece.color === 'white' ? 1 : 6
  const promotionRank = piece.color === 'white' ? 7 : 0
  const file = fileOf(from)
  const rank = rankOf(from)

  const oneStep = squareAt(file, rank + dir)
  if (oneStep !== null && !board[oneStep]) {
    if (rankOf(oneStep) === promotionRank) {
      for (const promo of PROMOTION_PIECES) {
        moves.push({ from, to: oneStep, kind: 'promotion', piece, promotion: promo })
      }
    } else {
      moves.push({ from, to: oneStep, kind: 'normal', piece })
      if (rank === startRank) {
        const twoStep = squareAt(file, rank + 2 * dir)
        if (twoStep !== null && !board[twoStep]) {
          moves.push({ from, to: twoStep, kind: 'double-pawn-push', piece })
        }
      }
    }
  }

  for (const df of [-1, 1]) {
    const target = squareAt(file + df, rank + dir)
    if (target === null) continue
    const occupant = board[target]
    if (occupant && occupant.color !== piece.color) {
      if (rankOf(target) === promotionRank) {
        for (const promo of PROMOTION_PIECES) {
          moves.push({
            from,
            to: target,
            kind: 'promotion-capture',
            piece,
            captured: occupant,
            promotion: promo,
          })
        }
      } else {
        moves.push({ from, to: target, kind: 'capture', piece, captured: occupant })
      }
    } else if (!occupant && target === state.enPassantTarget) {
      const capturedSquare = squareAt(file + df, rank)
      const captured = capturedSquare !== null ? board[capturedSquare] : null
      if (captured) {
        moves.push({ from, to: target, kind: 'en-passant', piece, captured })
      }
    }
  }

  return moves
}

function castlingMoves(state: GameState, from: Square, piece: Piece): Move[] {
  const { board, castling } = state
  const moves: Move[] = []
  const color = piece.color
  const enemy = otherColor(color)
  const rank = color === 'white' ? 0 : 7
  const kingStart = squareAt(4, rank) as Square
  if (from !== kingStart) return moves
  if (isSquareAttacked(board, kingStart, enemy)) return moves

  const canKingside = color === 'white' ? castling.whiteKingside : castling.blackKingside
  if (canKingside) {
    const f = squareAt(5, rank) as Square
    const g = squareAt(6, rank) as Square
    const h = squareAt(7, rank) as Square
    const rook = board[h]
    if (
      !board[f] &&
      !board[g] &&
      rook?.type === 'rook' &&
      rook.color === color &&
      !isSquareAttacked(board, f, enemy) &&
      !isSquareAttacked(board, g, enemy)
    ) {
      moves.push({ from, to: g, kind: 'castle-kingside', piece })
    }
  }

  const canQueenside = color === 'white' ? castling.whiteQueenside : castling.blackQueenside
  if (canQueenside) {
    const b = squareAt(1, rank) as Square
    const c = squareAt(2, rank) as Square
    const d = squareAt(3, rank) as Square
    const a = squareAt(0, rank) as Square
    const rook = board[a]
    if (
      !board[b] &&
      !board[c] &&
      !board[d] &&
      rook?.type === 'rook' &&
      rook.color === color &&
      !isSquareAttacked(board, d, enemy) &&
      !isSquareAttacked(board, c, enemy)
    ) {
      moves.push({ from, to: c, kind: 'castle-queenside', piece })
    }
  }

  return moves
}

/** Pseudo-legal moves for the piece on `from` — legal piece movement/capture
 * rules, but WITHOUT filtering out moves that leave the mover's own king in check. */
export function generatePseudoLegalMoves(state: GameState, from: Square): Move[] {
  const piece = state.board[from]
  if (!piece) return []
  const moves: Move[] = []

  switch (piece.type) {
    case 'pawn':
      moves.push(...pawnMoves(state, from, piece))
      break
    case 'knight':
      pushStepMoves(state.board, from, piece, KNIGHT_OFFSETS, moves)
      break
    case 'bishop':
      pushSlidingMoves(state.board, from, piece, BISHOP_DIRS, moves)
      break
    case 'rook':
      pushSlidingMoves(state.board, from, piece, ROOK_DIRS, moves)
      break
    case 'queen':
      pushSlidingMoves(state.board, from, piece, [...BISHOP_DIRS, ...ROOK_DIRS], moves)
      break
    case 'king':
      pushStepMoves(state.board, from, piece, KING_OFFSETS, moves)
      moves.push(...castlingMoves(state, from, piece))
      break
  }

  return moves
}

export function generateAllPseudoLegalMoves(state: GameState, color: Piece['color']): Move[] {
  const moves: Move[] = []
  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq]
    if (piece && piece.color === color) {
      moves.push(...generatePseudoLegalMoves(state, sq))
    }
  }
  return moves
}

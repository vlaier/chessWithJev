import { createInitialBoard, fileOf, rankOf, squareAt } from './board'
import { isInsufficientMaterial, positionKey } from './draws'
import { getAllLegalMoves, isInCheck, simulateMove } from './legality'
import { moveToSAN } from './notation'
import type { CastlingRights, GameState, Move, Square } from './types'
import { otherColor } from './types'

const INITIAL_CASTLING: CastlingRights = {
  whiteKingside: true,
  whiteQueenside: true,
  blackKingside: true,
  blackQueenside: true,
}

export function createInitialState(): GameState {
  const board = createInitialBoard()
  const key = positionKey(board, 'white', INITIAL_CASTLING, null)
  return {
    board,
    sideToMove: 'white',
    castling: { ...INITIAL_CASTLING },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    history: [],
    positionCounts: new Map([[key, 1]]),
    status: 'active',
  }
}

function nextCastlingRights(state: GameState, move: Move): CastlingRights {
  const rights = { ...state.castling }
  const { piece } = move

  if (piece.type === 'king') {
    if (piece.color === 'white') {
      rights.whiteKingside = false
      rights.whiteQueenside = false
    } else {
      rights.blackKingside = false
      rights.blackQueenside = false
    }
  }

  const clearForRookSquare = (square: Square) => {
    if (square === squareAt(0, 0)) rights.whiteQueenside = false
    if (square === squareAt(7, 0)) rights.whiteKingside = false
    if (square === squareAt(0, 7)) rights.blackQueenside = false
    if (square === squareAt(7, 7)) rights.blackKingside = false
  }

  if (piece.type === 'rook') clearForRookSquare(move.from)
  if (move.captured) clearForRookSquare(move.to)

  return rights
}

function nextEnPassantTarget(move: Move): Square | null {
  if (move.kind !== 'double-pawn-push') return null
  const dir = move.piece.color === 'white' ? -1 : 1
  return squareAt(fileOf(move.to), rankOf(move.to) + dir)
}

/** Applies a move that MUST come from `getLegalMoves(state, move.from)`.
 * Throws if given a move that isn't currently legal — this is the last line
 * of defense against illegal moves ever being applied to the game. */
export function applyMove(state: GameState, move: Move): GameState {
  const legalMoves = getAllLegalMoves(state, move.piece.color)
  const isLegal = legalMoves.some(
    (m) =>
      m.from === move.from &&
      m.to === move.to &&
      m.kind === move.kind &&
      m.promotion === move.promotion,
  )
  if (!isLegal) {
    throw new Error(
      `Illegal move rejected: ${move.piece.color} ${move.piece.type} ${move.from}->${move.to}`,
    )
  }

  const movingColor = move.piece.color
  const opponentColor = otherColor(movingColor)

  const board = simulateMove(state.board, move)
  const castling = nextCastlingRights(state, move)
  const enPassantTarget = nextEnPassantTarget(move)
  const isPawnMoveOrCapture = move.piece.type === 'pawn' || Boolean(move.captured)
  const halfmoveClock = isPawnMoveOrCapture ? 0 : state.halfmoveClock + 1
  const fullmoveNumber = movingColor === 'black' ? state.fullmoveNumber + 1 : state.fullmoveNumber

  const key = positionKey(board, opponentColor, castling, enPassantTarget)
  const positionCounts = new Map(state.positionCounts)
  positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1)

  const nextStateBase: GameState = {
    board,
    sideToMove: opponentColor,
    castling,
    enPassantTarget,
    halfmoveClock,
    fullmoveNumber,
    history: state.history,
    positionCounts,
    status: 'active',
  }

  const opponentInCheck = isInCheck(board, opponentColor)
  const opponentLegalMoves = getAllLegalMoves(nextStateBase, opponentColor)
  const opponentHasMoves = opponentLegalMoves.length > 0

  let status: GameState['status']
  if (!opponentHasMoves) {
    status = opponentInCheck ? 'checkmate' : 'stalemate'
  } else if (halfmoveClock >= 100) {
    status = 'draw-50move'
  } else if ((positionCounts.get(key) ?? 0) >= 3) {
    status = 'draw-repetition'
  } else if (isInsufficientMaterial(board)) {
    status = 'draw-insufficient-material'
  } else {
    status = opponentInCheck ? 'check' : 'active'
  }

  const otherLegalMoves = legalMoves.filter(
    (m) => !(m.from === move.from && m.to === move.to && m.promotion === move.promotion),
  )
  const san = moveToSAN(move, otherLegalMoves, opponentInCheck, status === 'checkmate')

  return {
    ...nextStateBase,
    status,
    history: [...state.history, { move, san }],
  }
}

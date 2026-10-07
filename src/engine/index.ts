export { squareToAlgebraic, algebraicToSquare, fileOf, rankOf } from './board'
export { applyMove, createInitialState } from './gameState'
export { getAllLegalMoves, getLegalMoves, isInCheck } from './legality'
export type {
  Board,
  CastlingRights,
  Color,
  GameState,
  GameStatus,
  HistoryEntry,
  Move,
  MoveKind,
  Piece,
  PieceType,
  Square,
} from './types'

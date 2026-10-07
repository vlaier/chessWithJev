export type Color = 'white' | 'black'

export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'

export interface Piece {
  type: PieceType
  color: Color
}

/** 0-63, a1=0, b1=1, ..., h1=7, a2=8, ..., h8=63 */
export type Square = number

export type Board = (Piece | null)[]

export type MoveKind =
  | 'normal'
  | 'double-pawn-push'
  | 'capture'
  | 'en-passant'
  | 'castle-kingside'
  | 'castle-queenside'
  | 'promotion'
  | 'promotion-capture'

export interface Move {
  from: Square
  to: Square
  kind: MoveKind
  /** piece being moved */
  piece: Piece
  /** piece captured, if any (for en-passant this is not on the `to` square) */
  captured?: Piece
  /** required when kind is promotion / promotion-capture */
  promotion?: PieceType
}

export interface CastlingRights {
  whiteKingside: boolean
  whiteQueenside: boolean
  blackKingside: boolean
  blackQueenside: boolean
}

export type GameStatus =
  | 'active'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'draw-50move'
  | 'draw-repetition'
  | 'draw-insufficient-material'

export interface HistoryEntry {
  move: Move
  san: string
}

export interface GameState {
  board: Board
  sideToMove: Color
  castling: CastlingRights
  /** square a pawn can be captured on via en passant, or null */
  enPassantTarget: Square | null
  halfmoveClock: number
  fullmoveNumber: number
  history: HistoryEntry[]
  /** repetition keys for every position reached, including the current one */
  positionCounts: Map<string, number>
  status: GameStatus
}

export const otherColor = (color: Color): Color => (color === 'white' ? 'black' : 'white')

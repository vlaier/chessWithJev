import { algebraicToSquare, squareAt, squareToAlgebraic } from './board'
import { positionKey } from './draws'
import type { Board, CastlingRights, Color, GameState, Piece, PieceType } from './types'

const LETTER_TO_TYPE: Record<string, PieceType> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

const TYPE_TO_LETTER: Record<PieceType, string> = {
  pawn: 'p',
  knight: 'n',
  bishop: 'b',
  rook: 'r',
  queen: 'q',
  king: 'k',
}

/** Parses a FEN string into a fresh GameState (history/repetition start empty). Test/debug helper. */
export function parseFEN(fen: string): GameState {
  const [placement, activeColor, castlingStr, epStr, halfmove, fullmove] = fen.trim().split(/\s+/)

  const board: Board = new Array(64).fill(null)
  const ranks = placement.split('/')
  for (let i = 0; i < 8; i++) {
    const rank = 7 - i
    let file = 0
    for (const ch of ranks[i]) {
      if (/\d/.test(ch)) {
        file += Number(ch)
      } else {
        const color: Color = ch === ch.toUpperCase() ? 'white' : 'black'
        const type = LETTER_TO_TYPE[ch.toLowerCase()]
        const sq = squareAt(file, rank)
        if (sq !== null) board[sq] = { type, color }
        file += 1
      }
    }
  }

  const sideToMove: Color = activeColor === 'b' ? 'black' : 'white'
  const castling: CastlingRights = {
    whiteKingside: castlingStr.includes('K'),
    whiteQueenside: castlingStr.includes('Q'),
    blackKingside: castlingStr.includes('k'),
    blackQueenside: castlingStr.includes('q'),
  }
  const enPassantTarget = epStr && epStr !== '-' ? algebraicToSquare(epStr) : null
  const halfmoveClock = halfmove ? Number(halfmove) : 0
  const fullmoveNumber = fullmove ? Number(fullmove) : 1

  const key = positionKey(board, sideToMove, castling, enPassantTarget)

  return {
    board,
    sideToMove,
    castling,
    enPassantTarget,
    halfmoveClock,
    fullmoveNumber,
    history: [],
    positionCounts: new Map([[key, 1]]),
    status: 'active',
  }
}

export function toFEN(state: GameState): string {
  const rows: string[] = []
  for (let rank = 7; rank >= 0; rank--) {
    let row = ''
    let empty = 0
    for (let file = 0; file < 8; file++) {
      const piece = state.board[squareAt(file, rank) as number] as Piece | null
      if (!piece) {
        empty += 1
        continue
      }
      if (empty > 0) {
        row += String(empty)
        empty = 0
      }
      const letter = TYPE_TO_LETTER[piece.type]
      row += piece.color === 'white' ? letter.toUpperCase() : letter
    }
    if (empty > 0) row += String(empty)
    rows.push(row)
  }

  const placement = rows.join('/')
  const active = state.sideToMove === 'white' ? 'w' : 'b'
  const castling =
    `${state.castling.whiteKingside ? 'K' : ''}${state.castling.whiteQueenside ? 'Q' : ''}${
      state.castling.blackKingside ? 'k' : ''
    }${state.castling.blackQueenside ? 'q' : ''}` || '-'
  const ep = state.enPassantTarget !== null ? squareToAlgebraic(state.enPassantTarget) : '-'

  return `${placement} ${active} ${castling} ${ep} ${state.halfmoveClock} ${state.fullmoveNumber}`
}

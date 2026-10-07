import type { Board, CastlingRights, Color, Square } from './types'

/** A key uniquely identifying a position for threefold-repetition purposes:
 * board contents + side to move + castling rights + en passant target. */
export function positionKey(
  board: Board,
  sideToMove: Color,
  castling: CastlingRights,
  enPassantTarget: Square | null,
): string {
  const boardPart = board.map((p) => (p ? `${p.color[0]}${p.type[0]}` : '--')).join('')
  const castlingPart = `${castling.whiteKingside ? 'K' : ''}${castling.whiteQueenside ? 'Q' : ''}${
    castling.blackKingside ? 'k' : ''
  }${castling.blackQueenside ? 'q' : ''}`
  return `${boardPart}|${sideToMove}|${castlingPart}|${enPassantTarget ?? '-'}`
}

export function isInsufficientMaterial(board: Board): boolean {
  const pieces = board.filter((p) => p !== null)
  if (pieces.length > 4) return false

  const nonKings = pieces.filter((p) => p!.type !== 'king')

  // K vs K
  if (nonKings.length === 0) return true

  // K+minor vs K
  if (nonKings.length === 1 && (nonKings[0]!.type === 'bishop' || nonKings[0]!.type === 'knight')) {
    return true
  }

  // K+B vs K+B with bishops on the same color square (drawn, insufficient to force mate)
  if (
    nonKings.length === 2 &&
    nonKings[0]!.type === 'bishop' &&
    nonKings[1]!.type === 'bishop' &&
    nonKings[0]!.color !== nonKings[1]!.color
  ) {
    const squares: Square[] = []
    for (let sq = 0; sq < 64; sq++) {
      const piece = board[sq]
      if (piece && piece.type === 'bishop') squares.push(sq)
    }
    if (squares.length === 2) {
      const colorOf = (sq: Square) => (sq + Math.floor(sq / 8)) % 2
      if (colorOf(squares[0]) === colorOf(squares[1])) return true
    }
  }

  return false
}

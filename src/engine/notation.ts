import { fileOf, rankOf, squareToAlgebraic } from './board'
import type { Move, PieceType } from './types'

const PIECE_LETTERS: Record<PieceType, string> = {
  pawn: '',
  knight: 'N',
  bishop: 'B',
  rook: 'R',
  queen: 'Q',
  king: 'K',
}

/** `otherLegalMoves` should be every OTHER legal move (same side) available in
 * the position before `move` was played — used to compute SAN disambiguation. */
export function moveToSAN(
  move: Move,
  otherLegalMoves: Move[],
  isCheck: boolean,
  isCheckmate: boolean,
): string {
  let san: string

  if (move.kind === 'castle-kingside') {
    san = 'O-O'
  } else if (move.kind === 'castle-queenside') {
    san = 'O-O-O'
  } else {
    const isCapture = move.kind === 'capture' || move.kind === 'promotion-capture' || move.kind === 'en-passant'
    const pieceLetter = PIECE_LETTERS[move.piece.type]

    let disambiguation = ''
    if (move.piece.type !== 'pawn') {
      const ambiguous = otherLegalMoves.filter(
        (m) => m.piece.type === move.piece.type && m.to === move.to && m.from !== move.from,
      )
      if (ambiguous.length > 0) {
        const sameFile = ambiguous.some((m) => fileOf(m.from) === fileOf(move.from))
        const sameRank = ambiguous.some((m) => rankOf(m.from) === rankOf(move.from))
        if (!sameFile) {
          disambiguation = squareToAlgebraic(move.from)[0]
        } else if (!sameRank) {
          disambiguation = squareToAlgebraic(move.from)[1]
        } else {
          disambiguation = squareToAlgebraic(move.from)
        }
      }
    }

    const fromFileForPawnCapture =
      move.piece.type === 'pawn' && isCapture ? squareToAlgebraic(move.from)[0] : ''

    const promotionSuffix =
      move.kind === 'promotion' || move.kind === 'promotion-capture'
        ? `=${PIECE_LETTERS[move.promotion ?? 'queen']}`
        : ''

    san = `${pieceLetter}${disambiguation}${fromFileForPawnCapture}${isCapture ? 'x' : ''}${squareToAlgebraic(
      move.to,
    )}${promotionSuffix}`
  }

  if (isCheckmate) san += '#'
  else if (isCheck) san += '+'

  return san
}

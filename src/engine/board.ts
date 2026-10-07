import type { Board, Piece, PieceType, Square } from './types'

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

export const fileOf = (square: Square): number => square % 8
export const rankOf = (square: Square): number => Math.floor(square / 8)

export const squareAt = (file: number, rank: number): Square | null => {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return rank * 8 + file
}

export const squareToAlgebraic = (square: Square): string =>
  `${FILES[fileOf(square)]}${rankOf(square) + 1}`

export const algebraicToSquare = (algebraic: string): Square => {
  const file = FILES.indexOf(algebraic[0] as (typeof FILES)[number])
  const rank = Number(algebraic[1]) - 1
  return rank * 8 + file
}

const backRank = (): PieceType[] => [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
]

export const createInitialBoard = (): Board => {
  const board: Board = new Array(64).fill(null)

  const whiteBack = backRank()
  const blackBack = backRank()
  for (let file = 0; file < 8; file++) {
    board[squareAt(file, 0) as Square] = { type: whiteBack[file], color: 'white' }
    board[squareAt(file, 1) as Square] = { type: 'pawn', color: 'white' }
    board[squareAt(file, 6) as Square] = { type: 'pawn', color: 'black' }
    board[squareAt(file, 7) as Square] = { type: blackBack[file], color: 'black' }
  }

  return board
}

export const cloneBoard = (board: Board): Board => board.slice()

export const findKing = (board: Board, color: Piece['color']): Square | null => {
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq]
    if (piece && piece.type === 'king' && piece.color === color) return sq
  }
  return null
}

import type { Piece as PieceModel } from '../engine/types'

const GLYPHS: Record<PieceModel['type'], string> = {
  king: '♚',
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
  pawn: '♟',
}

export function Piece({ piece }: { piece: PieceModel }) {
  return (
    <span
      className="select-none text-4xl leading-none sm:text-5xl"
      style={{
        color: piece.color === 'white' ? '#ffffff' : '#111827',
        WebkitTextStroke: piece.color === 'white' ? '1.5px #111827' : '1px #f8fafc',
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))',
      }}
      aria-label={`${piece.color} ${piece.type}`}
    >
      {GLYPHS[piece.type]}
    </span>
  )
}

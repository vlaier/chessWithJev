import { squareToAlgebraic } from '../engine/board'
import type { Piece as PieceModel, Square as SquareIndex } from '../engine/types'
import { Piece } from './Piece'

interface SquareProps {
  square: SquareIndex
  piece: PieceModel | null
  isLight: boolean
  isSelected: boolean
  isHoverOrigin: boolean
  isLegalTarget: boolean
  isCapture: boolean
  isLastMoveSquare: boolean
  isKingInCheck: boolean
  onSelect: (square: SquareIndex) => void
  onHoverStart: (square: SquareIndex) => void
  onHoverEnd: () => void
}

export function Square({
  square,
  piece,
  isLight,
  isSelected,
  isHoverOrigin,
  isLegalTarget,
  isCapture,
  isLastMoveSquare,
  isKingInCheck,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: SquareProps) {
  return (
    <button
      type="button"
      data-square={squareToAlgebraic(square)}
      data-legal-target={isLegalTarget || undefined}
      aria-label={`square ${squareToAlgebraic(square)}${piece ? ` ${piece.color} ${piece.type}` : ''}`}
      onClick={() => onSelect(square)}
      onMouseEnter={() => onHoverStart(square)}
      onMouseLeave={onHoverEnd}
      className={[
        'relative flex aspect-square w-full items-center justify-center transition-colors duration-100',
        isLight ? 'bg-white' : 'bg-[#4a7abf]',
        isSelected ? 'outline outline-4 outline-offset-[-4px] outline-amber-400' : '',
        isHoverOrigin && !isSelected ? 'outline outline-4 outline-offset-[-4px] outline-amber-200/70' : '',
        isKingInCheck ? 'bg-red-500/70' : '',
        isLastMoveSquare && !isSelected ? 'after:absolute after:inset-0 after:bg-yellow-300/25' : '',
      ].join(' ')}
    >
      {piece && <Piece piece={piece} />}

      {isLegalTarget && !isCapture && (
        <span className="pointer-events-none absolute h-[28%] w-[28%] rounded-full bg-black/25" />
      )}
      {isLegalTarget && isCapture && (
        <span className="pointer-events-none absolute inset-[6%] rounded-full border-[5px] border-black/30" />
      )}
    </button>
  )
}

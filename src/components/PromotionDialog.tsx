import type { Color, PieceType } from '../engine/types'
import { Piece } from './Piece'

const CHOICES: PieceType[] = ['queen', 'rook', 'bishop', 'knight']

interface PromotionDialogProps {
  color: Color
  onChoose: (piece: PieceType) => void
  onCancel: () => void
}

export function PromotionDialog({ color, onChoose, onCancel }: PromotionDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="flex gap-3 rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {CHOICES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChoose(type)}
            className="flex h-16 w-16 items-center justify-center rounded-md border border-gray-300 bg-gray-50 hover:bg-amber-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-amber-900"
          >
            <Piece piece={{ type, color }} />
          </button>
        ))}
      </div>
    </div>
  )
}

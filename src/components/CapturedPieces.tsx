import type { Color, HistoryEntry, PieceType } from '../engine/types'
import { Piece } from './Piece'

const PIECE_VALUE: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
}

function capturedByColor(history: HistoryEntry[], color: Color): PieceType[] {
  return history
    .map((h) => h.move.captured)
    .filter((p): p is NonNullable<typeof p> => Boolean(p) && p!.color === color)
    .map((p) => p!.type)
    .sort((a, b) => PIECE_VALUE[b] - PIECE_VALUE[a])
}

function Row({ label, pieces }: { label: string; pieces: PieceType[] }) {
  const color: Color = label === 'White captured' ? 'black' : 'white'
  const total = pieces.reduce((sum, p) => sum + PIECE_VALUE[p], 0)
  return (
    <div className="flex min-h-[2rem] items-center gap-1">
      <span className="w-32 shrink-0 text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex flex-wrap gap-0.5">
        {pieces.map((type, i) => (
          <span key={i} className="scale-75">
            <Piece piece={{ type, color }} />
          </span>
        ))}
      </div>
      {total > 0 && <span className="ml-1 text-xs text-gray-400">+{total}</span>}
    </div>
  )
}

export function CapturedPieces({ history }: { history: HistoryEntry[] }) {
  return (
    <div className="w-full rounded-md border border-gray-300 bg-white/60 p-3 dark:border-gray-700 dark:bg-gray-900/40">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Captured
      </h2>
      <Row label="White captured" pieces={capturedByColor(history, 'black')} />
      <Row label="Black captured" pieces={capturedByColor(history, 'white')} />
    </div>
  )
}

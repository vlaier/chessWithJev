import type { Color, GameStatus } from '../engine/types'

function describe(status: GameStatus, sideToMove: Color): string {
  const winner = sideToMove === 'white' ? 'Black' : 'White'
  switch (status) {
    case 'checkmate':
      return `Checkmate — ${winner} wins!`
    case 'stalemate':
      return 'Stalemate — draw.'
    case 'draw-50move':
      return 'Draw — 50-move rule.'
    case 'draw-repetition':
      return 'Draw — threefold repetition.'
    case 'draw-insufficient-material':
      return 'Draw — insufficient material.'
    default:
      return ''
  }
}

interface GameEndBannerProps {
  status: GameStatus
  sideToMove: Color
  onNewGame: () => void
}

export function GameEndBanner({ status, sideToMove, onNewGame }: GameEndBannerProps) {
  const message = describe(status, sideToMove)
  if (!message) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-8 text-center shadow-2xl dark:bg-gray-800">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{message}</p>
        <button
          type="button"
          onClick={onNewGame}
          className="rounded-md bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600"
        >
          New Game
        </button>
      </div>
    </div>
  )
}

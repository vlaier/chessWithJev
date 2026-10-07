import { FILES, fileOf, rankOf } from '../engine/board'
import type { GameState, Move, Square as SquareIndex } from '../engine/types'
import { Square } from './Square'

interface BoardProps {
  state: GameState
  selectedSquare: SquareIndex | null
  highlightOrigin: SquareIndex | null
  highlightedMoves: Move[]
  onSelect: (square: SquareIndex) => void
  onHoverStart: (square: SquareIndex) => void
  onHoverEnd: () => void
}

export function Board({
  state,
  selectedSquare,
  highlightOrigin,
  highlightedMoves,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: BoardProps) {
  const targetByTo = new Map(highlightedMoves.map((m) => [m.to, m]))

  const kingInCheckSquare =
    state.status === 'check' || state.status === 'checkmate'
      ? findKingSquare(state, state.sideToMove)
      : null

  const lastMove = state.history[state.history.length - 1]?.move ?? null

  // Ranks render top (8) to bottom (1); files render left (a) to right (h).
  const ranks = [7, 6, 5, 4, 3, 2, 1, 0]

  return (
    <div className="mx-auto w-full max-w-[min(90vw,640px)]">
      <div className="grid grid-cols-8 overflow-hidden rounded-md border-4 border-[#4a3728] shadow-lg">
        {ranks.map((rank) =>
          FILES.map((_, file) => {
            const square = rank * 8 + file
            const isLight = (fileOf(square) + rankOf(square)) % 2 === 0
            const move = targetByTo.get(square)
            return (
              <Square
                key={square}
                square={square}
                piece={state.board[square]}
                isLight={isLight}
                isSelected={selectedSquare === square}
                isHoverOrigin={selectedSquare === null && highlightOrigin === square}
                isLegalTarget={Boolean(move)}
                isCapture={Boolean(
                  move && (move.kind === 'capture' || move.kind === 'promotion-capture' || move.kind === 'en-passant'),
                )}
                isLastMoveSquare={lastMove !== null && (lastMove.from === square || lastMove.to === square)}
                isKingInCheck={kingInCheckSquare === square}
                onSelect={onSelect}
                onHoverStart={onHoverStart}
                onHoverEnd={onHoverEnd}
              />
            )
          }),
        )}
      </div>
    </div>
  )
}

function findKingSquare(state: GameState, color: GameState['sideToMove']): SquareIndex | null {
  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq]
    if (piece && piece.type === 'king' && piece.color === color) return sq
  }
  return null
}

import { useCallback, useMemo, useState } from 'react'
import { applyMove, createInitialState } from '../engine/gameState'
import { getLegalMoves } from '../engine/legality'
import type { GameState, Move, PieceType, Square } from '../engine/types'

export interface PendingPromotion {
  from: Square
  to: Square
}

export function useChessGame() {
  const [state, setState] = useState<GameState>(() => createInitialState())
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [hoveredSquare, setHoveredSquare] = useState<Square | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)

  const isGameOver = useMemo(
    () =>
      state.status === 'checkmate' ||
      state.status === 'stalemate' ||
      state.status.startsWith('draw'),
    [state.status],
  )

  const legalMovesForSelection = useMemo<Move[]>(() => {
    if (selectedSquare === null) return []
    return getLegalMoves(state, selectedSquare)
  }, [state, selectedSquare])

  // Hover only previews moves when nothing is selected yet, and only for the
  // current player's own pieces — it never reveals opponent moves.
  const legalMovesForHover = useMemo<Move[]>(() => {
    if (selectedSquare !== null || hoveredSquare === null || isGameOver) return []
    const piece = state.board[hoveredSquare]
    if (!piece || piece.color !== state.sideToMove) return []
    return getLegalMoves(state, hoveredSquare)
  }, [hoveredSquare, isGameOver, selectedSquare, state])

  const highlightedMoves = selectedSquare !== null ? legalMovesForSelection : legalMovesForHover
  const highlightOrigin = selectedSquare !== null ? selectedSquare : hoveredSquare

  const highlightedTargetSquares = useMemo(
    () => new Set(highlightedMoves.map((m: Move) => m.to)),
    [highlightedMoves],
  )

  const selectSquare = useCallback(
    (square: Square) => {
      if (isGameOver) return
      const piece = state.board[square]

      if (selectedSquare !== null) {
        const move = legalMovesForSelection.find((m) => m.to === square)
        if (move) {
          if (move.kind === 'promotion' || move.kind === 'promotion-capture') {
            setPendingPromotion({ from: move.from, to: move.to })
          } else {
            setState((prev) => applyMove(prev, move))
          }
          setSelectedSquare(null)
          return
        }
      }

      if (piece && piece.color === state.sideToMove) {
        setSelectedSquare(square)
      } else {
        setSelectedSquare(null)
      }
    },
    [isGameOver, legalMovesForSelection, selectedSquare, state.board, state.sideToMove],
  )

  const resolvePromotion = useCallback(
    (promotion: PieceType) => {
      if (!pendingPromotion) return
      const move = getLegalMoves(state, pendingPromotion.from).find(
        (m) => m.to === pendingPromotion.to && m.promotion === promotion,
      )
      if (move) {
        setState((prev) => applyMove(prev, move))
      }
      setPendingPromotion(null)
    },
    [pendingPromotion, state],
  )

  const cancelPromotion = useCallback(() => setPendingPromotion(null), [])

  const playMove = useCallback((move: Move) => {
    setState((prev) => applyMove(prev, move))
  }, [])

  const newGame = useCallback(() => {
    setState(createInitialState())
    setSelectedSquare(null)
    setHoveredSquare(null)
    setPendingPromotion(null)
  }, [])

  return {
    state,
    selectedSquare,
    hoveredSquare,
    setHoveredSquare,
    highlightedMoves,
    highlightOrigin,
    highlightedTargetSquares,
    pendingPromotion,
    isGameOver,
    selectSquare,
    resolvePromotion,
    cancelPromotion,
    playMove,
    newGame,
  }
}

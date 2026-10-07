import { useEffect, useRef, useState } from 'react'
import { chooseAiMove, type JevDecision } from '../ai/jevPlayer'
import type { JevWorkflowConfig } from '../ai/jevWorkflow'
import type { Color, GameState, Move } from '../engine/types'

const ACTIVE_STATUSES = new Set(['active', 'check'])

export function useJevOpponent(
  state: GameState,
  playMove: (move: Move) => void,
  aiColor: Color,
  workflow: JevWorkflowConfig,
) {
  const [isThinking, setIsThinking] = useState(false)
  const [lastDecision, setLastDecision] = useState<JevDecision | null>(null)
  const requestedPlyRef = useRef<number | null>(null)
  const requestedWorkflowRef = useRef<JevWorkflowConfig | null>(null)

  useEffect(() => {
    const ply = state.history.length
    const isAiTurn = state.sideToMove === aiColor && ACTIVE_STATUSES.has(state.status)

    // Re-request for the same ply if the workflow config changed underneath
    // us (e.g. the user edited it while Jev was "thinking"), so edits apply
    // to Jev's next move immediately rather than being silently skipped.
    if (!isAiTurn || (requestedPlyRef.current === ply && requestedWorkflowRef.current === workflow)) {
      return
    }

    requestedPlyRef.current = ply
    requestedWorkflowRef.current = workflow
    setIsThinking(true)

    let cancelled = false
    chooseAiMove(state, aiColor, workflow)
      .then((decision) => {
        if (cancelled) return
        setLastDecision(decision)
        playMove(decision.move)
      })
      .finally(() => {
        if (!cancelled) setIsThinking(false)
      })

    return () => {
      cancelled = true
    }
  }, [state, aiColor, playMove, workflow])

  return { isThinking, lastDecision }
}

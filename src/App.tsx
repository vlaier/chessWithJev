import { Board } from './components/Board'
import { CapturedPieces } from './components/CapturedPieces'
import { GameEndBanner } from './components/GameEndBanner'
import { JevReasoning } from './components/JevReasoning'
import { JevWorkflowEditor } from './components/JevWorkflowEditor'
import { MoveHistory } from './components/MoveHistory'
import { PromotionDialog } from './components/PromotionDialog'
import { useChessGame } from './hooks/useChessGame'
import { useJevOpponent } from './hooks/useJevOpponent'
import { useJevWorkflowConfig } from './hooks/useJevWorkflowConfig'

function App() {
  const {
    state,
    selectedSquare,
    highlightOrigin,
    highlightedMoves,
    pendingPromotion,
    setHoveredSquare,
    selectSquare,
    resolvePromotion,
    cancelPromotion,
    playMove,
    newGame,
  } = useChessGame()

  const { workflow, setWorkflow, resetToDefault } = useJevWorkflowConfig()
  const { isThinking, lastDecision } = useJevOpponent(state, playMove, 'black', workflow)

  const statusText =
    state.status === 'check'
      ? `${state.sideToMove === 'white' ? 'White' : 'Black'} is in check`
      : `${state.sideToMove === 'white' ? 'White' : 'Black'} to move`

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-gray-100 px-4 py-8 dark:bg-gray-950">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Chess</h1>

      <div className="flex w-full max-w-6xl flex-col gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-1 flex-col items-center gap-6">
          <div className="flex w-full flex-col gap-6 md:flex-row md:items-start md:justify-center">
            <div className="flex flex-col items-center gap-3">
              <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                {statusText}
                {isThinking && (
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Jev is thinking…</span>
                )}
              </p>
              <Board
                state={state}
                selectedSquare={selectedSquare}
                highlightOrigin={highlightOrigin}
                highlightedMoves={highlightedMoves}
                onSelect={selectSquare}
                onHoverStart={setHoveredSquare}
                onHoverEnd={() => setHoveredSquare(null)}
              />
            </div>

            <div className="flex w-full flex-col gap-4 md:w-64">
              <CapturedPieces history={state.history} />
              <MoveHistory history={state.history} />
            </div>
          </div>

          <JevReasoning decision={lastDecision} isThinking={isThinking} />
        </div>

        <JevWorkflowEditor workflow={workflow} onChange={setWorkflow} onReset={resetToDefault} />
      </div>

      {pendingPromotion && (
        <PromotionDialog
          color={state.sideToMove}
          onChoose={resolvePromotion}
          onCancel={cancelPromotion}
        />
      )}

      <GameEndBanner status={state.status} sideToMove={state.sideToMove} onNewGame={newGame} />
    </div>
  )
}

export default App

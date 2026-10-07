import type { JevDecision, JevDecisionStep } from '../ai/jevPlayer'

const PHASE_LABELS: Record<string, string> = {
  'pre-move': 'Pre-move',
  piece: 'Piece',
  destination: 'Destination',
}

function verdictClassName(step: JevDecisionStep): string {
  if (step.chosenKey === 'true') return 'font-semibold text-green-600 dark:text-green-400'
  if (step.chosenKey === 'false') return 'font-semibold text-red-600 dark:text-red-400'
  return 'font-semibold text-gray-800 dark:text-gray-100'
}

function PostMoveLine({ step }: { step: JevDecisionStep }) {
  return (
    <p className="text-sm text-gray-700 dark:text-gray-200">
      <span className="mr-1">{step.instructions}</span>
      <span className={verdictClassName(step)}>{step.chosenLabel}</span>
    </p>
  )
}

interface JevReasoningProps {
  decision: JevDecision | null
  isThinking: boolean
}

export function JevReasoning({ decision, isThinking }: JevReasoningProps) {
  if (!decision && !isThinking) return null

  const postMoveSteps = decision?.steps.filter((s) => s.phase === 'post-move') ?? []
  const treeSteps = decision?.steps.filter((s) => s.phase !== 'post-move') ?? []

  return (
    <div className="w-full max-w-4xl rounded-md border border-gray-300 bg-white/60 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      {!isThinking && postMoveSteps.length > 0 && (
        <div className="mb-4 flex flex-col gap-1 border-b border-gray-300 pb-3 dark:border-gray-700">
          {postMoveSteps.map((step, i) => (
            <PostMoveLine key={`${step.key}-${i}`} step={step} />
          ))}
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Jev's decision tree
      </h2>

      {isThinking && <p className="text-sm text-gray-500 dark:text-gray-400">Jev is thinking…</p>}

      {!isThinking && decision && treeSteps.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Jev couldn't reach a decision, so it played a random legal move.
        </p>
      )}

      {!isThinking && treeSteps.length > 0 && (
        <ol className="flex flex-col gap-3">
          {treeSteps.map((step, i) => (
            <li key={`${step.key}-${i}`} className="text-sm">
              <p className="text-gray-500 dark:text-gray-400">
                <span className="mr-1 font-semibold text-gray-700 dark:text-gray-200">
                  {i + 1}. {PHASE_LABELS[step.phase] ?? step.key}:
                </span>
                {step.instructions}
              </p>
              <p className="ml-4 mt-0.5 font-medium text-gray-800 dark:text-gray-100">
                → {step.chosenLabel}
              </p>
            </li>
          ))}
        </ol>
      )}

      {!isThinking && decision?.usedFallback && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          Jev couldn't finish this decision tree, so it played a random legal move instead.
        </p>
      )}
    </div>
  )
}

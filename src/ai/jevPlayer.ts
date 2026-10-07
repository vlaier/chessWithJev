import { algebraicToSquare, squareToAlgebraic } from '../engine/board'
import { toFEN } from '../engine/fen'
import { getAllLegalMoves, getLegalMoves } from '../engine/legality'
import { renderTemplate, type JevWorkflowConfig, type WorkflowOption } from './jevWorkflow'
import type { Color, GameState, Move, PieceType } from '../engine/types'

const JEV_ENDPOINT = '/api/jev-move'
const RETRY_DELAYS_MS = [0, 0, 10_000, 25_000, 40_000]

interface ChoiceQuestion {
  type: 'choice'
  instructions: string
  criteria: Record<string, string>
}

interface SystemOneRequest {
  model: string
  state: unknown
  questions: Record<string, ChoiceQuestion>
}

interface ChoiceAnswer {
  type: 'choice'
  choice: string
  probabilities?: Record<string, number>
  confidence?: number
}

interface SystemOneResponse {
  model: string
  answers: Record<string, ChoiceAnswer>
}

export type JevStepPhase = 'pre-move' | 'piece' | 'destination' | 'post-move'

export interface JevDecisionStep {
  key: string
  phase: JevStepPhase
  instructions: string
  chosenKey: string
  chosenLabel: string
}

export interface JevDecision {
  move: Move
  steps: JevDecisionStep[]
  usedFallback: boolean
}

const PIECE_LABELS: Record<PieceType, string> = {
  pawn: 'pawn',
  knight: 'knight',
  bishop: 'bishop',
  rook: 'rook',
  queen: 'queen',
  king: 'king',
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function describePieceOrigin(move: Move): string {
  return `${capitalize(move.piece.color)} ${PIECE_LABELS[move.piece.type]} on ${squareToAlgebraic(move.from)}`
}

function describeMoveTarget(move: Move): string {
  const square = squareToAlgebraic(move.to)
  if (move.kind === 'promotion' || move.kind === 'promotion-capture') {
    const promo = move.promotion ?? 'queen'
    const suffix = move.kind === 'promotion-capture' ? ', capturing' : ''
    return `${square} (promote to ${PIECE_LABELS[promo]}${suffix})`
  }
  if (move.kind === 'en-passant' || move.kind === 'capture') {
    return `${square} (capture)`
  }
  if (move.kind === 'castle-kingside') return `${square} (castle kingside)`
  if (move.kind === 'castle-queenside') return `${square} (castle queenside)`
  return square
}

function optionKeyForTarget(move: Move): string {
  const square = squareToAlgebraic(move.to)
  if (move.kind === 'promotion' || move.kind === 'promotion-capture') {
    return `${square}-${(move.promotion ?? 'queen').charAt(0)}`
  }
  return square
}

async function askJev(request: SystemOneRequest): Promise<SystemOneResponse> {
  const res = await fetch(JEV_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    throw new Error(`Jev request failed with status ${res.status}`)
  }
  return (await res.json()) as SystemOneResponse
}

async function retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    const delay = RETRY_DELAYS_MS[attempt]
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    try {
      return await fn()
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function randomMove(moves: Move[]): Move {
  return moves[Math.floor(Math.random() * moves.length)]
}

/** Asks a single choice question and resolves it against `options`. Shared by
 * every step type (custom pre/post-move steps, and the piece/destination
 * steps once their move-derived options are expressed as WorkflowOptions). */
async function askChoiceStep(
  key: string,
  instructions: string,
  options: WorkflowOption[],
  fen: string,
  color: Color,
  carryState: Record<string, string>,
): Promise<{ chosenKey: string; chosenLabel: string }> {
  const criteria: Record<string, string> = {}
  for (const option of options) criteria[option.key] = option.label

  const response = await retryWithBackoff(() =>
    askJev({
      model: 'jev-latest',
      state: { fen, sideToMove: color, ...carryState },
      questions: {
        [key]: { type: 'choice', instructions, criteria },
      },
    }),
  )

  const chosenKey = response.answers[key]?.choice
  const chosenOption = options.find((option) => option.key === chosenKey)
  if (!chosenOption) {
    throw new Error(`Jev returned an unrecognized choice for "${key}": ${chosenKey}`)
  }
  return { chosenKey: chosenOption.key, chosenLabel: chosenOption.label }
}

export async function chooseAiMove(
  state: GameState,
  color: Color,
  workflow: JevWorkflowConfig,
): Promise<JevDecision> {
  const allMoves = getAllLegalMoves(state, color)
  if (allMoves.length === 0) {
    throw new Error('No legal moves available')
  }

  const steps: JevDecisionStep[] = []
  const stepResults: Record<string, string> = {}
  const templateVars: Record<string, string> = {
    color,
    lastPlayerMove: state.history[state.history.length - 1]?.san ?? '',
  }
  const fen = toFEN(state)

  try {
    for (const stepConfig of workflow.preMoveSteps) {
      const instructions = renderTemplate(stepConfig.instructions, templateVars)
      const { chosenKey, chosenLabel } = await askChoiceStep(
        stepConfig.key,
        instructions,
        stepConfig.options,
        fen,
        color,
        stepResults,
      )
      steps.push({ key: stepConfig.key, phase: 'pre-move', instructions, chosenKey, chosenLabel })
      stepResults[stepConfig.key] = chosenKey
      templateVars[`${stepConfig.key}.label`] = chosenLabel
    }

    const originByKey = new Map<string, Move>()
    for (const move of allMoves) {
      const key = squareToAlgebraic(move.from)
      if (!originByKey.has(key)) originByKey.set(key, move)
    }
    const originOptions: WorkflowOption[] = Array.from(originByKey, ([key, move]) => ({
      key,
      label: describePieceOrigin(move),
    }))

    const pieceInstructions = renderTemplate(workflow.pieceStep.instructions, templateVars)
    const pieceAnswer = await askChoiceStep(
      'piece',
      pieceInstructions,
      originOptions,
      fen,
      color,
      stepResults,
    )
    steps.push({
      key: 'piece',
      phase: 'piece',
      instructions: pieceInstructions,
      chosenKey: pieceAnswer.chosenKey,
      chosenLabel: pieceAnswer.chosenLabel,
    })
    stepResults.piece = pieceAnswer.chosenKey
    templateVars['piece.label'] = pieceAnswer.chosenLabel

    const fromSquare = algebraicToSquare(pieceAnswer.chosenKey)
    const movesForPiece = getLegalMoves(state, fromSquare)
    const targetByKey = new Map<string, Move>()
    for (const move of movesForPiece) {
      targetByKey.set(optionKeyForTarget(move), move)
    }
    const targetOptions: WorkflowOption[] = Array.from(targetByKey, ([key, move]) => ({
      key,
      label: describeMoveTarget(move),
    }))

    const destinationInstructions = renderTemplate(workflow.destinationStep.instructions, templateVars)
    const destinationAnswer = await askChoiceStep(
      'destination',
      destinationInstructions,
      targetOptions,
      fen,
      color,
      stepResults,
    )
    const chosenMove = targetByKey.get(destinationAnswer.chosenKey)
    if (!chosenMove) {
      throw new Error(`Jev returned an unrecognized destination choice: ${destinationAnswer.chosenKey}`)
    }
    steps.push({
      key: 'destination',
      phase: 'destination',
      instructions: destinationInstructions,
      chosenKey: destinationAnswer.chosenKey,
      chosenLabel: destinationAnswer.chosenLabel,
    })
    stepResults.destination = destinationAnswer.chosenKey
    templateVars['destination.label'] = destinationAnswer.chosenLabel
    templateVars.chosenMove = `${describePieceOrigin(chosenMove)} to ${describeMoveTarget(chosenMove)}`

    // Post-move steps are purely informational — evaluated after the move is
    // picked, never fed back into which move gets played. Each is wrapped in
    // its own try/catch so a failure here can't trigger the random-move fallback.
    for (const stepConfig of workflow.postMoveSteps) {
      try {
        const instructions = renderTemplate(stepConfig.instructions, templateVars)
        const { chosenKey, chosenLabel } = await askChoiceStep(
          stepConfig.key,
          instructions,
          stepConfig.options,
          fen,
          color,
          stepResults,
        )
        steps.push({ key: stepConfig.key, phase: 'post-move', instructions, chosenKey, chosenLabel })
        stepResults[stepConfig.key] = chosenKey
        templateVars[`${stepConfig.key}.label`] = chosenLabel
      } catch (error) {
        console.warn(`Jev failed to answer the post-move question "${stepConfig.key}".`, error)
      }
    }

    return { move: chosenMove, steps, usedFallback: false }
  } catch (error) {
    console.warn('Jev move selection failed, falling back to a random legal move.', error)
    return { move: randomMove(allMoves), steps, usedFallback: true }
  }
}

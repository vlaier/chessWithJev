import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { algebraicToSquare } from '../engine/board'
import { applyMove, createInitialState } from '../engine/gameState'
import { getLegalMoves } from '../engine/legality'
import { DEFAULT_JEV_WORKFLOW, type JevWorkflowConfig } from './jevWorkflow'
import { chooseAiMove } from './jevPlayer'

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response
}

describe('chooseAiMove', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('asks focus, then piece, then destination — in that order, each conditioned on the last', async () => {
    const state = createInitialState()
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { focus: { type: 'choice', choice: 'development' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { piece: { type: 'choice', choice: 'g1' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          model: 'jev-latest',
          answers: { destination: { type: 'choice', choice: 'f3' } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { playerMoveGood: { type: 'choice', choice: 'true' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { ownMoveGood: { type: 'choice', choice: 'true' } } }),
      )

    const decision = await chooseAiMove(state, 'white', DEFAULT_JEV_WORKFLOW)

    expect(fetchMock).toHaveBeenCalledTimes(5)

    const [focusCall, pieceCall, destinationCall, , ownMoveCall] = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string),
    )

    expect(Object.keys(focusCall.questions)).toEqual(['focus'])
    expect(focusCall.questions.focus.instructions).toMatch(/what should you focus on/i)

    expect(Object.keys(pieceCall.questions)).toEqual(['piece'])
    expect(pieceCall.state.focus).toBe('development')
    expect(pieceCall.questions.piece.instructions).toMatch(/focus on: .*developing/i)

    expect(Object.keys(destinationCall.questions)).toEqual(['destination'])
    expect(destinationCall.state.focus).toBe('development')
    expect(destinationCall.state.piece).toBe('g1')
    expect(destinationCall.questions.destination.instructions).toMatch(/focus on: .*developing/i)
    expect(destinationCall.questions.destination.instructions).toMatch(/knight on g1/i)

    expect(decision.usedFallback).toBe(false)
    expect(decision.move.from).toBe(algebraicToSquare('g1'))
    expect(decision.move.to).toBe(algebraicToSquare('f3'))

    expect(decision.steps.map((s) => s.key)).toEqual([
      'focus',
      'piece',
      'destination',
      'playerMoveGood',
      'ownMoveGood',
    ])
    expect(decision.steps.map((s) => s.phase)).toEqual([
      'pre-move',
      'piece',
      'destination',
      'post-move',
      'post-move',
    ])
    expect(decision.steps[0].chosenKey).toBe('development')
    expect(decision.steps[0].chosenLabel).toMatch(/developing/i)
    expect(decision.steps[1].chosenKey).toBe('g1')
    expect(decision.steps[2].chosenKey).toBe('f3')

    expect(Object.keys(ownMoveCall.questions)).toEqual(['ownMoveGood'])
    expect(ownMoveCall.questions.ownMoveGood.instructions).toMatch(/knight/i)
    expect(decision.steps[4].chosenKey).toBe('true')
  })

  it('also asks about the opponent last move when one exists, without affecting the chosen move', async () => {
    const initial = createInitialState()
    const e4 = getLegalMoves(initial, algebraicToSquare('e2')).find(
      (m) => m.to === algebraicToSquare('e4'),
    )!
    const afterE4 = applyMove(initial, e4)

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { focus: { type: 'choice', choice: 'development' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { piece: { type: 'choice', choice: 'g8' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { destination: { type: 'choice', choice: 'f6' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { playerMoveGood: { type: 'choice', choice: 'true' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { ownMoveGood: { type: 'choice', choice: 'false' } } }),
      )

    const decision = await chooseAiMove(afterE4, 'black', DEFAULT_JEV_WORKFLOW)

    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(decision.move.to).toBe(algebraicToSquare('f6'))

    const playerStep = decision.steps.find((s) => s.key === 'playerMoveGood')
    const ownStep = decision.steps.find((s) => s.key === 'ownMoveGood')
    expect(playerStep?.chosenKey).toBe('true')
    expect(playerStep?.instructions).toMatch(/e4/)
    expect(ownStep?.chosenKey).toBe('false')
    expect(ownStep?.instructions).toMatch(/knight/i)
  })

  it('respects a customized workflow: renamed keys, extra steps, and reworded instructions all reach the network calls', async () => {
    const state = createInitialState()
    const customWorkflow: JevWorkflowConfig = {
      preMoveSteps: [
        {
          id: 'p1',
          key: 'strategy',
          instructions: 'Playing {{color}}, pick a strategy.',
          options: [{ key: 'gambit', label: 'Play a gambit' }],
        },
      ],
      pieceStep: { instructions: 'Strategy: {{strategy.label}}. Pick a piece.' },
      destinationStep: { instructions: 'You picked {{piece.label}}. Where to?' },
      postMoveSteps: [
        {
          id: 'p2',
          key: 'confidence',
          instructions: 'How confident are you in {{chosenMove}}?',
          options: [{ key: 'high', label: 'Very confident' }],
        },
      ],
    }

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { strategy: { type: 'choice', choice: 'gambit' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { piece: { type: 'choice', choice: 'g1' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { destination: { type: 'choice', choice: 'f3' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { confidence: { type: 'choice', choice: 'high' } } }),
      )

    const decision = await chooseAiMove(state, 'white', customWorkflow)

    expect(fetchMock).toHaveBeenCalledTimes(4)
    const [strategyCall, pieceCall, , confidenceCall] = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string),
    )

    expect(Object.keys(strategyCall.questions)).toEqual(['strategy'])
    expect(strategyCall.questions.strategy.instructions).toBe('Playing white, pick a strategy.')

    expect(pieceCall.questions.piece.instructions).toBe('Strategy: Play a gambit. Pick a piece.')

    expect(Object.keys(confidenceCall.questions)).toEqual(['confidence'])
    expect(confidenceCall.questions.confidence.instructions).toMatch(/knight on g1 to f3/i)

    expect(decision.steps.map((s) => s.key)).toEqual(['strategy', 'piece', 'destination', 'confidence'])
    expect(decision.usedFallback).toBe(false)
  })

  it('falls back to a random legal move if Jev returns an unrecognized focus, keeping no steps', async () => {
    const state = createInitialState()
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(
      jsonResponse({ model: 'jev-latest', answers: { focus: { type: 'choice', choice: 'nonsense' } } }),
    )

    const decision = await chooseAiMove(state, 'white', DEFAULT_JEV_WORKFLOW)
    expect(decision.move.piece.color).toBe('white')
    expect(decision.usedFallback).toBe(true)
    expect(decision.steps).toEqual([])
  })

  it('keeps the steps completed before a later failure, and still falls back for the move', async () => {
    vi.useFakeTimers()
    try {
      const state = createInitialState()
      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({ model: 'jev-latest', answers: { focus: { type: 'choice', choice: 'attack' } } }),
        )
        .mockResolvedValue(jsonResponse({}, false))

      const decisionPromise = chooseAiMove(state, 'white', DEFAULT_JEV_WORKFLOW)
      await vi.runAllTimersAsync()
      const decision = await decisionPromise

      expect(decision.usedFallback).toBe(true)
      expect(decision.steps.map((s) => s.key)).toEqual(['focus'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('falls back to a random legal move if the network request fails', async () => {
    vi.useFakeTimers()
    try {
      const state = createInitialState()
      const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      fetchMock.mockRejectedValue(new Error('network down'))

      const decisionPromise = chooseAiMove(state, 'white', DEFAULT_JEV_WORKFLOW)
      await vi.runAllTimersAsync()
      const decision = await decisionPromise

      expect(decision.move).toBeDefined()
      expect(decision.move.piece.color).toBe('white')
      expect(decision.usedFallback).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('a post-move step failure does not affect the chosen move or trigger the fallback', async () => {
    const state = createInitialState()
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { focus: { type: 'choice', choice: 'development' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { piece: { type: 'choice', choice: 'g1' } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ model: 'jev-latest', answers: { destination: { type: 'choice', choice: 'f3' } } }),
      )
      .mockResolvedValue(jsonResponse({}, false))

    vi.useFakeTimers()
    try {
      const decisionPromise = chooseAiMove(state, 'white', DEFAULT_JEV_WORKFLOW)
      await vi.runAllTimersAsync()
      const decision = await decisionPromise

      expect(decision.usedFallback).toBe(false)
      expect(decision.move.from).toBe(algebraicToSquare('g1'))
      expect(decision.move.to).toBe(algebraicToSquare('f3'))
      expect(decision.steps.map((s) => s.key)).toEqual(['focus', 'piece', 'destination'])
    } finally {
      vi.useRealTimers()
    }
  })
})

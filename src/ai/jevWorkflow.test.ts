import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_JEV_WORKFLOW,
  isValidWorkflowConfig,
  renderTemplate,
  slugifyKey,
} from './jevWorkflow'

describe('DEFAULT_JEV_WORKFLOW', () => {
  it('has the expected shape', () => {
    expect(DEFAULT_JEV_WORKFLOW.preMoveSteps).toHaveLength(1)
    expect(DEFAULT_JEV_WORKFLOW.preMoveSteps[0].key).toBe('focus')
    expect(DEFAULT_JEV_WORKFLOW.postMoveSteps.map((s) => s.key)).toEqual([
      'playerMoveGood',
      'ownMoveGood',
    ])
    expect(isValidWorkflowConfig(DEFAULT_JEV_WORKFLOW)).toBe(true)
  })
})

describe('renderTemplate', () => {
  it('substitutes known placeholders', () => {
    expect(renderTemplate('Hello {{color}}!', { color: 'white' })).toBe('Hello white!')
  })

  it('substitutes dotted placeholder names', () => {
    expect(renderTemplate('Focus: {{focus.label}}', { 'focus.label': 'Attack' })).toBe(
      'Focus: Attack',
    )
  })

  it('replaces unresolved placeholders with an empty string', () => {
    expect(renderTemplate('Hi {{unknown}}!', {})).toBe('Hi !')
  })

  it('leaves plain text without placeholders untouched', () => {
    expect(renderTemplate('no placeholders here', { color: 'white' })).toBe(
      'no placeholders here',
    )
  })
})

describe('slugifyKey', () => {
  it('lowercases and dashes non-alphanumeric runs', () => {
    expect(slugifyKey('My New Question!')).toBe('my-new-question')
  })

  it('trims leading/trailing dashes', () => {
    expect(slugifyKey('  --hello--  ')).toBe('hello')
  })

  it('returns an empty string for input with no alphanumerics', () => {
    expect(slugifyKey('!!!')).toBe('')
  })
})

describe('isValidWorkflowConfig', () => {
  it('rejects non-objects', () => {
    expect(isValidWorkflowConfig(null)).toBe(false)
    expect(isValidWorkflowConfig('nope')).toBe(false)
    expect(isValidWorkflowConfig(42)).toBe(false)
  })

  it('rejects an object missing required arrays', () => {
    expect(isValidWorkflowConfig({})).toBe(false)
    expect(
      isValidWorkflowConfig({
        preMoveSteps: [],
        pieceStep: { instructions: 'x' },
        destinationStep: { instructions: 'x' },
        // postMoveSteps missing
      }),
    ).toBe(false)
  })

  it('rejects a custom step with malformed options', () => {
    expect(
      isValidWorkflowConfig({
        preMoveSteps: [{ id: '1', key: 'a', instructions: 'x', options: [{ key: 'a' }] }],
        pieceStep: { instructions: 'x' },
        destinationStep: { instructions: 'x' },
        postMoveSteps: [],
      }),
    ).toBe(false)
  })

  it('accepts a well-formed custom config', () => {
    expect(
      isValidWorkflowConfig({
        preMoveSteps: [
          { id: '1', key: 'a', instructions: 'x', options: [{ key: 'yes', label: 'Yes' }] },
        ],
        pieceStep: { instructions: 'x' },
        destinationStep: { instructions: 'x' },
        postMoveSteps: [],
      }),
    ).toBe(true)
  })
})

describe('localStorage round-trip (via the workflow hook contract)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('serializes and deserializes without loss', () => {
    const json = JSON.stringify(DEFAULT_JEV_WORKFLOW)
    localStorage.setItem('jev-workflow-config', json)
    const parsed = JSON.parse(localStorage.getItem('jev-workflow-config')!)
    expect(isValidWorkflowConfig(parsed)).toBe(true)
    expect(parsed).toEqual(DEFAULT_JEV_WORKFLOW)
  })

  it('flags corrupted stored data as invalid so callers can fall back to default', () => {
    localStorage.setItem('jev-workflow-config', '{"not":"a workflow"}')
    const parsed = JSON.parse(localStorage.getItem('jev-workflow-config')!)
    expect(isValidWorkflowConfig(parsed)).toBe(false)
  })
})

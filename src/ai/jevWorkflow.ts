export interface WorkflowOption {
  key: string
  label: string
}

export interface CustomStepConfig {
  id: string
  key: string
  instructions: string
  options: WorkflowOption[]
}

export interface FixedStepConfig {
  instructions: string
}

export interface JevWorkflowConfig {
  preMoveSteps: CustomStepConfig[]
  pieceStep: FixedStepConfig
  destinationStep: FixedStepConfig
  postMoveSteps: CustomStepConfig[]
}

export const RESERVED_STEP_KEYS = new Set(['piece', 'destination'])

export const DEFAULT_JEV_WORKFLOW: JevWorkflowConfig = {
  preMoveSteps: [
    {
      id: 'default-focus',
      key: 'focus',
      instructions:
        'You are playing {{color}}. Given the game so far, what should you focus on for your next move?',
      options: [
        { key: 'defense', label: 'Defense — shore up weaknesses and avoid giving the opponent targets' },
        {
          key: 'king-safety',
          label: "Protecting your king — improve king safety, e.g. by castling or shielding it",
        },
        { key: 'material', label: 'Taking enemy pieces — look for a move that wins material' },
        {
          key: 'development',
          label: 'Developing your pieces — bring an undeveloped piece into active play',
        },
        { key: 'attack', label: "Attacking — create threats against the opponent's position or king" },
        { key: 'center', label: 'Controlling the center — fight for the central squares' },
      ],
    },
  ],
  pieceStep: {
    instructions:
      'You are playing {{color}} and decided to focus on: {{focus.label}}. Given that focus, which of your pieces do you want to move?',
  },
  destinationStep: {
    instructions:
      'You decided to focus on: {{focus.label}}. You chose to move the {{piece.label}}. Given that focus and that piece, where do you want to move it?',
  },
  postMoveSteps: [
    {
      id: 'default-player-move-good',
      key: 'playerMoveGood',
      instructions: "Your opponent just played {{lastPlayerMove}}. Do you think that was a good move?",
      options: [
        { key: 'true', label: 'Yes, it is a good move' },
        { key: 'false', label: 'No, it is not a good move' },
      ],
    },
    {
      id: 'default-own-move-good',
      key: 'ownMoveGood',
      instructions: 'You just chose to move: {{chosenMove}}. Do you think that is a good move?',
      options: [
        { key: 'true', label: 'Yes, it is a good move' },
        { key: 'false', label: 'No, it is not a good move' },
      ],
    },
  ],
}

const PLACEHOLDER_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g

/** Replaces `{{name}}` placeholders with values from `vars`; unresolved names become empty strings. */
export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(PLACEHOLDER_PATTERN, (_match, name: string) => vars[name] ?? '')
}

export function slugifyKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isWorkflowOption(value: unknown): value is WorkflowOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as WorkflowOption).key === 'string' &&
    typeof (value as WorkflowOption).label === 'string'
  )
}

function isCustomStepConfig(value: unknown): value is CustomStepConfig {
  if (typeof value !== 'object' || value === null) return false
  const step = value as CustomStepConfig
  return (
    typeof step.id === 'string' &&
    typeof step.key === 'string' &&
    typeof step.instructions === 'string' &&
    Array.isArray(step.options) &&
    step.options.every(isWorkflowOption)
  )
}

function isFixedStepConfig(value: unknown): value is FixedStepConfig {
  return (
    typeof value === 'object' && value !== null && typeof (value as FixedStepConfig).instructions === 'string'
  )
}

export function isValidWorkflowConfig(value: unknown): value is JevWorkflowConfig {
  if (typeof value !== 'object' || value === null) return false
  const config = value as JevWorkflowConfig
  return (
    Array.isArray(config.preMoveSteps) &&
    config.preMoveSteps.every(isCustomStepConfig) &&
    isFixedStepConfig(config.pieceStep) &&
    isFixedStepConfig(config.destinationStep) &&
    Array.isArray(config.postMoveSteps) &&
    config.postMoveSteps.every(isCustomStepConfig)
  )
}

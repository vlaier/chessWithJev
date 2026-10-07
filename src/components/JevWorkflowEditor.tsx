import { useId } from 'react'
import {
  RESERVED_STEP_KEYS,
  renderTemplate,
  slugifyKey,
  type CustomStepConfig,
  type FixedStepConfig,
  type JevWorkflowConfig,
  type WorkflowOption,
} from '../ai/jevWorkflow'

const PREVIEW_BASE_VARS: Record<string, string> = {
  color: 'white',
  lastPlayerMove: 'e4',
  chosenMove: 'White knight on g1 to f3',
  'piece.label': 'White knight on g1',
  'destination.label': 'f3',
}

function buildPreviewVars(workflow: JevWorkflowConfig): Record<string, string> {
  const vars = { ...PREVIEW_BASE_VARS }
  for (const step of [...workflow.preMoveSteps, ...workflow.postMoveSteps]) {
    vars[`${step.key}.label`] = step.options[0]?.label ?? `(${step.key || 'answer'})`
  }
  return vars
}

function allStepKeys(workflow: JevWorkflowConfig, excludeId?: string): Set<string> {
  const keys = new Set(RESERVED_STEP_KEYS)
  for (const step of [...workflow.preMoveSteps, ...workflow.postMoveSteps]) {
    if (step.id !== excludeId) keys.add(step.key)
  }
  return keys
}

function dedupeKey(base: string, taken: Set<string>): string {
  const safeBase = base || 'question'
  if (!taken.has(safeBase)) return safeBase
  let n = 2
  while (taken.has(`${safeBase}-${n}`)) n++
  return `${safeBase}-${n}`
}

function reorder<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= list.length) return list
  const next = list.slice()
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function createStep(existingKeys: Set<string>): CustomStepConfig {
  return {
    id: `step-${Math.random().toString(36).slice(2, 10)}`,
    key: dedupeKey('question', existingKeys),
    instructions: 'Given the game so far, what do you think?',
    options: [
      { key: 'yes', label: 'Yes' },
      { key: 'no', label: 'No' },
    ],
  }
}

interface OptionEditorProps {
  option: WorkflowOption
  onChange: (next: WorkflowOption) => void
  onRemove: () => void
  removable: boolean
}

function OptionEditor({ option, onChange, onRemove, removable }: OptionEditorProps) {
  return (
    <div className="flex items-start gap-2">
      <input
        type="text"
        value={option.key}
        onChange={(e) => onChange({ ...option, key: e.target.value })}
        placeholder="key"
        className="w-24 shrink-0 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono dark:border-gray-600 dark:bg-gray-800"
      />
      <textarea
        value={option.label}
        onChange={(e) => onChange({ ...option, label: e.target.value })}
        rows={1}
        placeholder="answer label"
        className="min-w-0 flex-1 resize-y rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!removable}
        aria-label="Remove option"
        className="shrink-0 rounded px-1.5 py-1 text-xs text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-900/40"
      >
        ✕
      </button>
    </div>
  )
}

interface CustomStepEditorProps {
  step: CustomStepConfig
  index: number
  count: number
  previewVars: Record<string, string>
  onChange: (next: CustomStepConfig) => void
  onKeyBlur: (rawValue: string) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}

function CustomStepEditor({
  step,
  index,
  count,
  previewVars,
  onChange,
  onKeyBlur,
  onRemove,
  onMove,
}: CustomStepEditorProps) {
  const headingId = useId()
  const preview = renderTemplate(step.instructions, previewVars)

  return (
    <div
      className="flex flex-col gap-2 rounded border border-gray-300 bg-white/70 p-3 dark:border-gray-600 dark:bg-gray-800/50"
      aria-labelledby={headingId}
    >
      <div className="flex items-center justify-between gap-2">
        <span id={headingId} className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Question
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move question up"
            className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-700"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            aria-label="Move question down"
            className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-700"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove question"
            className="rounded px-1.5 py-0.5 text-xs text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40"
          >
            Remove
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-0.5 text-xs">
        <span className="text-gray-500 dark:text-gray-400">Key (sent to Jev)</span>
        <input
          type="text"
          defaultValue={step.key}
          key={step.key}
          onBlur={(e) => onKeyBlur(e.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1 font-mono dark:border-gray-600 dark:bg-gray-800"
        />
      </label>

      <label className="flex flex-col gap-0.5 text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          Instructions — use <code>{'{{color}}'}</code>, <code>{'{{lastPlayerMove}}'}</code>,{' '}
          <code>{'{{chosenMove}}'}</code>, or <code>{'{{<question key>.label}}'}</code>
        </span>
        <textarea
          value={step.instructions}
          onChange={(e) => onChange({ ...step, instructions: e.target.value })}
          rows={2}
          className="resize-y rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
        />
      </label>

      <p className="rounded bg-gray-100 px-2 py-1 text-xs italic text-gray-600 dark:bg-gray-900/60 dark:text-gray-300">
        Preview: {preview || '(empty)'}
      </p>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">Answer options</span>
        {step.options.map((option, i) => (
          <OptionEditor
            key={i}
            option={option}
            removable={step.options.length > 1}
            onChange={(next) => {
              const options = step.options.slice()
              options[i] = next
              onChange({ ...step, options })
            }}
            onRemove={() => {
              const options = step.options.filter((_, oi) => oi !== i)
              onChange({ ...step, options })
            }}
          />
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...step,
              options: [...step.options, { key: `option-${step.options.length + 1}`, label: '' }],
            })
          }
          className="self-start rounded px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
        >
          + Add option
        </button>
      </div>
    </div>
  )
}

function FixedStepEditor({
  title,
  step,
  previewVars,
  onChange,
}: {
  title: string
  step: FixedStepConfig
  previewVars: Record<string, string>
  onChange: (next: FixedStepConfig) => void
}) {
  const preview = renderTemplate(step.instructions, previewVars)
  return (
    <div className="flex flex-col gap-2 rounded border border-dashed border-gray-400 bg-white/70 p-3 dark:border-gray-500 dark:bg-gray-800/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{title}</span>
        <span className="text-xs italic text-gray-400">Options are auto-generated from legal moves</span>
      </div>
      <textarea
        value={step.instructions}
        onChange={(e) => onChange({ instructions: e.target.value })}
        rows={2}
        className="resize-y rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
      />
      <p className="rounded bg-gray-100 px-2 py-1 text-xs italic text-gray-600 dark:bg-gray-900/60 dark:text-gray-300">
        Preview: {preview || '(empty)'}
      </p>
    </div>
  )
}

interface StepListProps {
  title: string
  steps: CustomStepConfig[]
  workflow: JevWorkflowConfig
  onChangeSteps: (next: CustomStepConfig[]) => void
}

function StepList({ title, steps, workflow, onChangeSteps }: StepListProps) {
  const previewVars = buildPreviewVars(workflow)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </h3>
        <button
          type="button"
          onClick={() => onChangeSteps([...steps, createStep(allStepKeys(workflow))])}
          className="rounded px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
        >
          + Add question
        </button>
      </div>

      {steps.length === 0 && (
        <p className="text-xs italic text-gray-400">No questions in this section.</p>
      )}

      {steps.map((step, index) => (
        <CustomStepEditor
          key={step.id}
          step={step}
          index={index}
          count={steps.length}
          previewVars={previewVars}
          onChange={(next) => {
            const nextSteps = steps.slice()
            nextSteps[index] = next
            onChangeSteps(nextSteps)
          }}
          onKeyBlur={(rawValue) => {
            const taken = allStepKeys(workflow, step.id)
            const nextKey = dedupeKey(slugifyKey(rawValue), taken)
            const nextSteps = steps.slice()
            nextSteps[index] = { ...step, key: nextKey }
            onChangeSteps(nextSteps)
          }}
          onRemove={() => onChangeSteps(steps.filter((s) => s.id !== step.id))}
          onMove={(direction) => onChangeSteps(reorder(steps, index, direction))}
        />
      ))}
    </div>
  )
}

interface JevWorkflowEditorProps {
  workflow: JevWorkflowConfig
  onChange: (next: JevWorkflowConfig) => void
  onReset: () => void
}

export function JevWorkflowEditor({ workflow, onChange, onReset }: JevWorkflowEditorProps) {
  const previewVars = buildPreviewVars(workflow)

  return (
    <div className="flex w-full flex-col gap-4 rounded-md border border-gray-300 bg-white/60 p-4 dark:border-gray-700 dark:bg-gray-900/40 lg:w-96">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Edit Jev's workflow
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          Reset to default
        </button>
      </div>

      <StepList
        title="Before choosing a piece"
        steps={workflow.preMoveSteps}
        workflow={workflow}
        onChangeSteps={(preMoveSteps) => onChange({ ...workflow, preMoveSteps })}
      />

      <FixedStepEditor
        title="Which piece to move"
        step={workflow.pieceStep}
        previewVars={previewVars}
        onChange={(pieceStep) => onChange({ ...workflow, pieceStep })}
      />

      <FixedStepEditor
        title="Where to move it"
        step={workflow.destinationStep}
        previewVars={previewVars}
        onChange={(destinationStep) => onChange({ ...workflow, destinationStep })}
      />

      <StepList
        title="After the move (informational only)"
        steps={workflow.postMoveSteps}
        workflow={workflow}
        onChangeSteps={(postMoveSteps) => onChange({ ...workflow, postMoveSteps })}
      />
    </div>
  )
}

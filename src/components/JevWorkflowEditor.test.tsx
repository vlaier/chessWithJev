import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_JEV_WORKFLOW, type JevWorkflowConfig } from '../ai/jevWorkflow'
import { JevWorkflowEditor } from './JevWorkflowEditor'

function Harness({ initial = DEFAULT_JEV_WORKFLOW }: { initial?: JevWorkflowConfig }) {
  const [workflow, setWorkflow] = useState(initial)
  return (
    <JevWorkflowEditor
      workflow={workflow}
      onChange={setWorkflow}
      onReset={() => setWorkflow(DEFAULT_JEV_WORKFLOW)}
    />
  )
}

describe('JevWorkflowEditor', () => {
  it('renders the default workflow sections', () => {
    render(<Harness />)
    expect(screen.getByText(/before choosing a piece/i)).toBeInTheDocument()
    expect(screen.getByText(/which piece to move/i)).toBeInTheDocument()
    expect(screen.getByText(/where to move it/i)).toBeInTheDocument()
    expect(screen.getByText(/after the move/i)).toBeInTheDocument()
    expect(screen.getAllByText(/question/i).length).toBeGreaterThan(0)
  })

  it('editing an instructions textarea updates the live preview', () => {
    render(<Harness />)
    const textareas = screen.getAllByDisplayValue(/what should you focus on/i)
    expect(textareas).toHaveLength(1)

    fireEvent.change(textareas[0], { target: { value: 'Hello {{color}}, pick wisely.' } })

    expect(screen.getByText(/Preview: Hello white, pick wisely\./i)).toBeInTheDocument()
  })

  it('adds and removes a pre-move question', () => {
    render(<Harness />)
    const before = screen.getAllByText(/^Question$/i).length

    fireEvent.click(screen.getAllByRole('button', { name: /\+ add question/i })[0])
    expect(screen.getAllByText(/^Question$/i)).toHaveLength(before + 1)

    fireEvent.click(screen.getAllByRole('button', { name: /remove question/i })[0])
    expect(screen.getAllByText(/^Question$/i)).toHaveLength(before)
  })

  it('adds and removes an answer option on a question', () => {
    render(<Harness />)
    const optionInputsBefore = screen.getAllByPlaceholderText('key').length

    fireEvent.click(screen.getAllByRole('button', { name: /\+ add option/i })[0])
    expect(screen.getAllByPlaceholderText('key')).toHaveLength(optionInputsBefore + 1)

    fireEvent.click(screen.getAllByRole('button', { name: /remove option/i })[0])
    expect(screen.getAllByPlaceholderText('key')).toHaveLength(optionInputsBefore)
  })

  it('slugifies and dedupes a question key on blur', () => {
    render(<Harness />)
    const keyInput = screen.getByDisplayValue('focus')

    fireEvent.change(keyInput, { target: { value: 'My New Key!' } })
    fireEvent.blur(keyInput)

    expect(screen.getByDisplayValue('my-new-key')).toBeInTheDocument()
  })

  it('reset to default restores the built-in workflow after edits', () => {
    render(<Harness />)

    fireEvent.click(screen.getAllByRole('button', { name: /\+ add question/i })[0])
    expect(screen.getAllByText(/^Question$/i).length).toBeGreaterThan(1)

    fireEvent.click(screen.getByRole('button', { name: /reset to default/i }))

    expect(screen.getAllByText(/^Question$/i)).toHaveLength(3) // focus + playerMoveGood + ownMoveGood
  })
})

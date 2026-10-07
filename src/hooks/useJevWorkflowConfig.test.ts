import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_JEV_WORKFLOW } from '../ai/jevWorkflow'
import { useJevWorkflowConfig } from './useJevWorkflowConfig'

const STORAGE_KEY = 'jev-workflow-config'

describe('useJevWorkflowConfig', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to DEFAULT_JEV_WORKFLOW when nothing is stored', () => {
    const { result } = renderHook(() => useJevWorkflowConfig())
    expect(result.current.workflow).toEqual(DEFAULT_JEV_WORKFLOW)
  })

  it('falls back to the default when stored data is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, '{"not":"valid"}')
    const { result } = renderHook(() => useJevWorkflowConfig())
    expect(result.current.workflow).toEqual(DEFAULT_JEV_WORKFLOW)
  })

  it('loads a previously saved custom workflow', () => {
    const custom = {
      ...DEFAULT_JEV_WORKFLOW,
      preMoveSteps: [],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
    const { result } = renderHook(() => useJevWorkflowConfig())
    expect(result.current.workflow.preMoveSteps).toEqual([])
  })

  it('persists edits to localStorage', () => {
    const { result } = renderHook(() => useJevWorkflowConfig())

    act(() => {
      result.current.setWorkflow({ ...result.current.workflow, preMoveSteps: [] })
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.preMoveSteps).toEqual([])
  })

  it('resetToDefault restores the built-in workflow', () => {
    const { result } = renderHook(() => useJevWorkflowConfig())

    act(() => {
      result.current.setWorkflow({ ...result.current.workflow, preMoveSteps: [] })
    })
    expect(result.current.workflow.preMoveSteps).toEqual([])

    act(() => {
      result.current.resetToDefault()
    })
    expect(result.current.workflow).toEqual(DEFAULT_JEV_WORKFLOW)
  })
})

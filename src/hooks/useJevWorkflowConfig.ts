import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_JEV_WORKFLOW, isValidWorkflowConfig, type JevWorkflowConfig } from '../ai/jevWorkflow'

const STORAGE_KEY = 'jev-workflow-config'

function loadWorkflow(): JevWorkflowConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_JEV_WORKFLOW
    const parsed = JSON.parse(raw)
    return isValidWorkflowConfig(parsed) ? parsed : DEFAULT_JEV_WORKFLOW
  } catch {
    return DEFAULT_JEV_WORKFLOW
  }
}

export function useJevWorkflowConfig() {
  const [workflow, setWorkflow] = useState<JevWorkflowConfig>(() => loadWorkflow())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workflow))
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — edits just won't persist.
    }
  }, [workflow])

  const resetToDefault = useCallback(() => setWorkflow(DEFAULT_JEV_WORKFLOW), [])

  return { workflow, setWorkflow, resetToDefault }
}

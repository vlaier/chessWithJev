import type { HistoryEntry } from '../engine/types'

export function MoveHistory({ history }: { history: HistoryEntry[] }) {
  const rows: [string, string | undefined][] = []
  for (let i = 0; i < history.length; i += 2) {
    rows.push([history[i].san, history[i + 1]?.san])
  }

  return (
    <div className="w-full rounded-md border border-gray-300 bg-white/60 p-3 dark:border-gray-700 dark:bg-gray-900/40">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Moves
      </h2>
      <ol className="max-h-64 overflow-y-auto text-sm">
        {rows.length === 0 && <li className="text-gray-400">No moves yet</li>}
        {rows.map(([white, black], i) => (
          <li key={i} className="flex gap-2 py-0.5">
            <span className="w-6 text-gray-400">{i + 1}.</span>
            <span className="w-16 font-mono">{white}</span>
            <span className="w-16 font-mono">{black ?? ''}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

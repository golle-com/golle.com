export type ProgressCategory = 'active' | 'done' | 'error'

const PROGRESS_COLORS: Record<ProgressCategory, string> = {
  active: '#fef3c7',
  done: '#bbf7d0',
  error: '#fecdd3',
}

const DONE_KEYWORDS = ['downloaded', 'finished', 'ready', 'done', 'complete', 'completed']
const ERROR_KEYWORDS = ['error', 'failed', 'timeout', 'removed']

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max)

export function getProgressCategory(status?: string): ProgressCategory {
  if (!status) {
    return 'active'
  }
  const normalized = status.toLowerCase()
  if (ERROR_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'error'
  }
  if (DONE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'done'
  }
  return 'active'
}

export function getProgressColor(category: ProgressCategory): string {
  return PROGRESS_COLORS[category]
}

export function getProgressFillPercent(category: ProgressCategory, explicitPercent?: number): number {
  if (typeof explicitPercent === 'number' && !Number.isNaN(explicitPercent)) {
    return clamp(explicitPercent)
  }
  if (category === 'done' || category === 'error') {
    return 100
  }
  return 48
}

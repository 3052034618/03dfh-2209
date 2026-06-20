import { InspectionResult, CheckItem, TaskStatus } from '@/types'

export const formatTime = (timeStr: string): string => {
  const date = new Date(timeStr)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export const formatDateTime = (timeStr: string): string => {
  const date = new Date(timeStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hh}:${mm}`
}

export const isDeadlineNear = (deadline: string, hours = 3): boolean => {
  const now = Date.now()
  const dl = new Date(deadline).getTime()
  return dl - now > 0 && dl - now <= hours * 60 * 60 * 1000
}

export const getDeadlineText = (deadline: string): string => {
  const now = Date.now()
  const dl = new Date(deadline).getTime()
  const diffMs = dl - now

  if (diffMs < 0) return '已超时'
  const hours = Math.floor(diffMs / (60 * 60 * 1000))
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000))
  if (hours >= 24) return `${Math.floor(hours / 24)}天后截止`
  if (hours > 0) return `剩 ${hours}小时${minutes}分`
  return `剩 ${minutes}分钟`
}

export const evaluateInspection = (items: CheckItem[]): { result: InspectionResult; issues: string[] } => {
  const issues: string[] = []
  let hasCriticalFail = false
  let hasWarning = false

  items.forEach(item => {
    if (!item.required) return

    if (item.type === 'switch') {
      if (item.value === false) {
        if (item.id === 'door_seal' || item.id === 'power_connection') {
          hasCriticalFail = true
          issues.push(`${item.name}：未通过`)
        } else {
          hasWarning = true
          issues.push(`${item.name}：需确认`)
        }
      }
    } else if (item.type === 'input' && item.passRange && typeof item.value === 'number') {
      const v = item.value
      const { min, max } = item.passRange
      if (v < min || v > max) {
        if (item.failRange) {
          const fmin = item.failRange.min ?? -Infinity
          const fmax = item.failRange.max ?? Infinity
          if (v < fmin || v > fmax) {
            hasCriticalFail = true
            issues.push(`${item.name}：严重偏离 (${v}${item.unit || ''})`)
          } else {
            hasWarning = true
            issues.push(`${item.name}：偏离范围 (${v}${item.unit || ''})`)
          }
        } else {
          hasWarning = true
          issues.push(`${item.name}：偏离范围 (${v}${item.unit || ''})`)
        }
      }
    }
  })

  let result: InspectionResult
  if (hasCriticalFail) {
    result = 'reject'
  } else if (hasWarning) {
    result = 'review'
  } else {
    const allCompleted = items.filter(i => i.required).every(i => {
      if (i.type === 'switch') return i.value === true
      if (i.type === 'input') return i.value !== undefined && i.value !== ''
      return true
    })
    result = allCompleted ? 'pass' : 'review'
  }

  return { result, issues }
}

export const taskStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case 'pending': return 'gray'
    case 'picking': return 'blue'
    case 'shipping': return 'green'
    case 'arrived': return 'orange'
    case 'completed': return 'gray'
  }
}

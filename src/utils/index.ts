import { InspectionResult, CheckItem, TaskStatus } from '@/types'

export const formatTime = (timeStr?: string | null): string => {
  if (!timeStr) return '等待中'
  const date = new Date(timeStr)
  if (isNaN(date.getTime())) return '等待中'
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export const formatDateTime = (timeStr?: string | null): string => {
  if (!timeStr) return '待处理'
  const date = new Date(timeStr)
  if (isNaN(date.getTime())) return '待处理'
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

export const buildTempRanges = (requiredTemp: number) => ({
  passMin: requiredTemp - 2,
  passMax: requiredTemp + 2,
  reviewMin: requiredTemp - 5,
  reviewMax: requiredTemp + 5
})

const parseNum = (v: any): number | undefined => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }
  return undefined
}

export const evaluateInspection = (
  items: CheckItem[],
  requiredTemp: number
): { result: InspectionResult; issues: string[] } => {
  const issues: string[] = []
  let hasCriticalFail = false
  let hasWarning = false

  const { passMin, passMax, reviewMin, reviewMax } = buildTempRanges(requiredTemp)

  console.log('[Inspection] 评估基准 - 要求温度:', requiredTemp, '℃')
  console.log('[Inspection] 可发车范围:', passMin, '~', passMax, '℃')
  console.log('[Inspection] 禁止发车阈值: <', reviewMin, '或 >', reviewMax, '℃')

  const criticalSwitchIds = ['door_seal', 'plug_status', 'power_vehicle']

  items.forEach(item => {
    if (!item.required) return

    if (item.type === 'switch') {
      if (item.value === false) {
        if (criticalSwitchIds.includes(item.id)) {
          hasCriticalFail = true
          issues.push(`${item.name}：未通过`)
        } else {
          hasWarning = true
          issues.push(`${item.name}：需确认`)
        }
      }
    } else if (item.type === 'input') {
      const v = parseNum(item.value)
      if (v === undefined) return

      if (item.id === 'thermo_reading' || item.id === 'set_temp_match') {
        if (v < reviewMin || v > reviewMax) {
          hasCriticalFail = true
          const diff = (v - requiredTemp).toFixed(1)
          const sign = Number(diff) > 0 ? '+' : ''
          issues.push(`${item.name}：严重偏离 (${v}${item.unit || ''}，偏差${sign}${diff}${item.unit || ''})`)
        } else if (v < passMin || v > passMax) {
          hasWarning = true
          const diff = (v - requiredTemp).toFixed(1)
          const sign = Number(diff) > 0 ? '+' : ''
          issues.push(`${item.name}：偏离范围 (${v}${item.unit || ''}，偏差${sign}${diff}${item.unit || ''})`)
        }
      } else {
        if (item.passRange) {
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
      if (i.type === 'input') {
        const n = parseNum(i.value)
        return n !== undefined
      }
      return true
    })
    result = allCompleted ? 'pass' : 'review'
  }

  console.log('[Inspection] 评估结果 -', { hasCriticalFail, hasWarning, result, issues })

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

import React from 'react'
import Taro from '@tarojs/taro'
import { InspectionRecord, ExceptionReport, CheckItem, ExceptionTimelineItem } from '@/types'
import { mockInspectionRecords } from '@/data/inspection'
import { mockExceptionReports } from '@/data/exception'

const STORAGE_KEYS = {
  INSPECTIONS: 'reefer_inspection_records',
  EXCEPTIONS: 'reefer_exception_reports',
  INSPECTION_DRAFT: 'reefer_inspection_draft'
}

const readStorage = <T>(key: string, fallback: T): T => {
  try {
    const data = Taro.getStorageSync(key)
    if (data && Array.isArray(data) && data.length > 0) return data as T
    return fallback
  } catch (e) {
    console.warn('[Store] 读取存储失败:', key, e)
    return fallback
  }
}

const writeStorage = <T>(key: string, data: T) => {
  try {
    Taro.setStorageSync(key, data)
    console.log('[Store] 写入存储成功:', key, '条数:', Array.isArray(data) ? data.length : '-')
  } catch (e) {
    console.warn('[Store] 写入存储失败:', key, e)
  }
}

interface DraftData {
  taskId: string
  containerNo: string
  items: CheckItem[]
  savedAt: string
}

interface AppStore {
  inspections: InspectionRecord[]
  exceptions: ExceptionReport[]
  listeners: Set<() => void>
}

const store: AppStore = {
  inspections: readStorage<InspectionRecord[]>(STORAGE_KEYS.INSPECTIONS, mockInspectionRecords),
  exceptions: readStorage<ExceptionReport[]>(STORAGE_KEYS.EXCEPTIONS, mockExceptionReports),
  listeners: new Set()
}

const notifyListeners = () => {
  store.listeners.forEach(fn => {
    try { fn() } catch (e) { /* ignore */ }
  })
}

const subscribe = (fn: () => void): (() => void) => {
  store.listeners.add(fn)
  return () => store.listeners.delete(fn)
}

const addInspection = (record: InspectionRecord) => {
  store.inspections = [record, ...store.inspections]
  writeStorage(STORAGE_KEYS.INSPECTIONS, store.inspections)
  notifyListeners()
  console.log('[Store] 新增检查记录:', record.containerNo, record.result)
}

const getInspectionById = (id: string): InspectionRecord | undefined => {
  return store.inspections.find(r => r.id === id)
}

const getLatestInspectionByContainer = (containerNo: string): InspectionRecord | undefined => {
  return store.inspections
    .filter(r => r.containerNo === containerNo)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
}

const addException = (report: ExceptionReport) => {
  store.exceptions = [report, ...store.exceptions]
  writeStorage(STORAGE_KEYS.EXCEPTIONS, store.exceptions)
  notifyListeners()
  console.log('[Store] 新增异常上报:', report.containerNo, report.type)
}

const getExceptionById = (id: string): ExceptionReport | undefined => {
  return store.exceptions.find(r => r.id === id)
}

const getLatestExceptionByContainer = (containerNo: string): ExceptionReport | undefined => {
  return store.exceptions
    .filter(r => r.containerNo === containerNo)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
}

const updateExceptionStatus = (id: string, updates: Partial<ExceptionReport>) => {
  const idx = store.exceptions.findIndex(r => r.id === id)
  if (idx === -1) return
  store.exceptions[idx] = { ...store.exceptions[idx], ...updates }
  writeStorage(STORAGE_KEYS.EXCEPTIONS, store.exceptions)
  notifyListeners()
  console.log('[Store] 更新异常状态:', id, updates)
}

const genId = (prefix: string): string => {
  const date = new Date()
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}${ymd}${rand}`
}

const buildAndSaveInspection = (params: {
  taskId: string
  containerNo: string
  items: CheckItem[]
  result: 'pass' | 'review' | 'reject'
  remark?: string
  requiredTemp: number
}): InspectionRecord => {
  const thermoItem = params.items.find(i => i.id === 'thermo_reading')
  const parseN = (v: any): number | undefined => {
    if (typeof v === 'number') return v
    if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? undefined : n }
    return undefined
  }
  const tempReading = parseN(thermoItem?.value)

  const cleanedItems: CheckItem[] = params.items.map(it => {
    const base: CheckItem = { ...it }
    if (it.type === 'input' && (it as any).rawValue !== undefined) {
      (base as any).rawValue = (it as any).rawValue
    }
    return base
  })

  const record: InspectionRecord = {
    id: genId('IR'),
    taskId: params.taskId,
    containerNo: params.containerNo,
    items: cleanedItems,
    result: params.result,
    remark: params.remark,
    operator: '张师傅',
    createdAt: new Date().toISOString(),
    tempReading
  }
  ;(record as any).requiredTemp = params.requiredTemp
  addInspection(record)
  return record
}

const buildAndSaveException = (params: Omit<ExceptionReport, 'id' | 'reporter' | 'status' | 'createdAt'> & {
  reporter?: string
  status?: ExceptionReport['status']
}): ExceptionReport => {
  const now = new Date().toISOString()
  const timeline: ExceptionTimelineItem[] = [
    { time: now, label: '司机提交异常上报', done: true },
    { time: '', label: '等待调度查看', done: false },
    { time: '', label: '调度给出处置意见', done: false },
    { time: '', label: '需要补充信息', done: false },
    { time: '', label: '问题解决，关闭上报', done: false }
  ]
  const report: ExceptionReport = {
    id: genId('ER'),
    reporter: params.reporter || '张师傅',
    status: params.status || 'submitted',
    createdAt: now,
    dispatchViewed: false,
    needSupplement: null,
    timeline,
    ...params
  }
  addException(report)
  return report
}

const saveInspectionDraft = (draft: DraftData) => {
  try {
    Taro.setStorageSync(STORAGE_KEYS.INSPECTION_DRAFT, { ...draft, savedAt: new Date().toISOString() })
    console.log('[Store] 草稿已保存:', draft.containerNo)
  } catch (e) {
    console.warn('[Store] 保存草稿失败:', e)
  }
}

const loadInspectionDraft = (): DraftData | null => {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.INSPECTION_DRAFT)
    if (data && data.taskId && data.items) return data as DraftData
    return null
  } catch (e) {
    console.warn('[Store] 读取草稿失败:', e)
    return null
  }
}

const clearInspectionDraft = () => {
  try {
    Taro.removeStorageSync(STORAGE_KEYS.INSPECTION_DRAFT)
    console.log('[Store] 草稿已清除')
  } catch (e) {
    console.warn('[Store] 清除草稿失败:', e)
  }
}

export const appStore = {
  get inspections() { return [...store.inspections] },
  get exceptions() { return [...store.exceptions] },
  subscribe,
  addInspection,
  getInspectionById,
  getLatestInspectionByContainer,
  addException,
  getExceptionById,
  getLatestExceptionByContainer,
  updateExceptionStatus,
  buildAndSaveInspection,
  buildAndSaveException,
  saveInspectionDraft,
  loadInspectionDraft,
  clearInspectionDraft
}

export const useStoreSnapshot = <T>(selector: (s: { inspections: InspectionRecord[]; exceptions: ExceptionReport[] }) => T): T => {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)
  React.useEffect(() => {
    return subscribe(forceUpdate)
  }, [])
  return selector({ inspections: store.inspections, exceptions: store.exceptions })
}

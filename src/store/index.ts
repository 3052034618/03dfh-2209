import React from 'react'
import Taro from '@tarojs/taro'
import { InspectionRecord, ExceptionReport, CheckItem } from '@/types'
import { mockInspectionRecords } from '@/data/inspection'
import { mockExceptionReports } from '@/data/exception'

const STORAGE_KEYS = {
  INSPECTIONS: 'reefer_inspection_records',
  EXCEPTIONS: 'reefer_exception_reports'
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
  const tempReading = typeof thermoItem?.value === 'number' ? thermoItem.value : undefined

  const record: InspectionRecord = {
    id: genId('IR'),
    taskId: params.taskId,
    containerNo: params.containerNo,
    items: JSON.parse(JSON.stringify(params.items)),
    result: params.result,
    remark: params.remark,
    operator: '张师傅',
    createdAt: new Date().toISOString(),
    tempReading
  }
  // 额外保存要求温度，用于详情展示
  ;(record as any).requiredTemp = params.requiredTemp
  addInspection(record)
  return record
}

const buildAndSaveException = (params: Omit<ExceptionReport, 'id' | 'reporter' | 'status' | 'createdAt'> & {
  reporter?: string
  status?: ExceptionReport['status']
}): ExceptionReport => {
  const report: ExceptionReport = {
    id: genId('ER'),
    reporter: params.reporter || '张师傅',
    status: params.status || 'submitted',
    createdAt: new Date().toISOString(),
    ...params
  }
  addException(report)
  return report
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
  buildAndSaveInspection,
  buildAndSaveException
}

export const useStoreSnapshot = <T>(selector: (s: { inspections: InspectionRecord[]; exceptions: ExceptionReport[] }) => T): T => {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)
  React.useEffect(() => {
    return subscribe(forceUpdate)
  }, [])
  return selector({ inspections: store.inspections, exceptions: store.exceptions })
}

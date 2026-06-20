export type TaskStatus = 'pending' | 'picking' | 'shipping' | 'arrived' | 'completed'

export interface Task {
  id: string
  containerNo: string
  sealNo: string
  requiredTemp: number
  loadingAddress: string
  deadline: string
  pickupTime: string
  customer: string
  status: TaskStatus
  portName: string
  cargoType: string
}

export type CheckItemStatus = 'pass' | 'fail' | 'pending'

export type InspectionResult = 'pass' | 'review' | 'reject'

export interface CheckItem {
  id: string
  name: string
  description: string
  type: 'switch' | 'input' | 'select'
  unit?: string
  required: boolean
  status: CheckItemStatus
  value?: string | boolean | number
  rawValue?: string
  passRange?: { min: number; max: number }
  failRange?: { min?: number; max?: number }
}

export interface InspectionRecord {
  id: string
  taskId: string
  containerNo: string
  items: CheckItem[]
  result: InspectionResult
  remark?: string
  operator: string
  createdAt: string
  tempReading?: number
}

export type ExceptionType = 'temp_deviation' | 'power_failure' | 'door_seal' | 'equipment_malfunction' | 'other'

export type ExceptionAction = 'reconnect_power' | 'contact_yard' | 'wait_repair' | 'adjust_temp' | 'return_to_port' | 'other'

export interface ExceptionReport {
  id: string
  taskId: string
  containerNo: string
  type: ExceptionType
  reason: string
  photos: string[]
  location: string
  locationLat?: number
  locationLng?: number
  actions: ExceptionAction[]
  description: string
  reporter: string
  status: 'submitted' | 'handling' | 'resolved'
  createdAt: string
  currentTemp?: number
  durationMinutes?: number
  dispatchViewed?: boolean
  dispatchViewedAt?: string
  dispatchOpinion?: string
  dispatchOpinionAt?: string
  needSupplement?: 'photo' | 'temp' | 'both' | null
  timeline?: ExceptionTimelineItem[]
}

export interface ExceptionTimelineItem {
  time: string
  label: string
  done: boolean
}

export const TASK_STATUS_TEXT: Record<TaskStatus, string> = {
  pending: '待提箱',
  picking: '提箱中',
  shipping: '运输中',
  arrived: '已到港',
  completed: '已完成'
}

export const INSPECTION_RESULT_TEXT: Record<InspectionResult, string> = {
  pass: '可发车',
  review: '需复核',
  reject: '禁止发车'
}

export const EXCEPTION_TYPE_TEXT: Record<ExceptionType, string> = {
  temp_deviation: '温度偏离',
  power_failure: '断电告警',
  door_seal: '箱门异常',
  equipment_malfunction: '设备故障',
  other: '其他异常'
}

export const EXCEPTION_ACTION_TEXT: Record<ExceptionAction, string> = {
  reconnect_power: '重新接电',
  contact_yard: '联系堆场',
  wait_repair: '等待维修',
  adjust_temp: '调整温度',
  return_to_port: '返回港区',
  other: '其他措施'
}

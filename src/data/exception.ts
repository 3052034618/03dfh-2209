import { ExceptionType, ExceptionAction, ExceptionReport } from '@/types'

export const exceptionReasons: Record<ExceptionType, string[]> = {
  temp_deviation: [
    '环境温度过高，制冷效率下降',
    '温控机设定值被误改',
    '频繁开关箱门导致冷量流失',
    '蒸发器结霜严重',
    '冷媒不足或泄漏',
    '温控传感器故障',
    '其他原因'
  ],
  power_failure: [
    '车载发电机故障停机',
    '港区插头接触不良',
    '电缆破损或烧断',
    '车辆电瓶电量耗尽',
    '外部供电中断',
    '保险丝/断路器跳闸',
    '其他原因'
  ],
  door_seal: [
    '密封条老化破损',
    '箱门未完全闭合',
    '锁杆卡扣松动',
    '箱门轻微变形',
    '封条被人为破坏',
    '其他原因'
  ],
  equipment_malfunction: [
    '压缩机异常停机',
    '冷凝器风扇故障',
    '控制面板死机',
    '异常报警持续响起',
    '显示屏无显示',
    '其他原因'
  ],
  other: [
    '交通事故',
    '道路拥堵无法行驶',
    '车辆机械故障',
    '人员身体不适',
    '其他'
  ]
}

export const exceptionActionList: ExceptionAction[] = [
  'reconnect_power',
  'contact_yard',
  'wait_repair',
  'adjust_temp',
  'return_to_port',
  'other'
]

export const mockExceptionReports: ExceptionReport[] = [
  {
    id: 'ER20260621001',
    taskId: 'T20260621001',
    containerNo: 'MSKU1234567',
    type: 'temp_deviation',
    reason: '蒸发器结霜严重',
    photos: [],
    location: '上海市浦东新区S2高速临港出口附近',
    locationLat: 30.90,
    locationLng: 121.80,
    actions: ['adjust_temp', 'contact_yard'],
    description: '行驶中发现温度从-18℃上升至-12℃，停车检查发现蒸发器结霜过厚，已联系堆场技术指导进行除霜操作',
    reporter: '张师傅',
    status: 'handling',
    createdAt: '2026-06-21T11:30:00',
    currentTemp: -12,
    durationMinutes: 25
  },
  {
    id: 'ER20260621002',
    taskId: 'T20260621002',
    containerNo: 'MAEU7654321',
    type: 'power_failure',
    reason: '车载发电机故障停机',
    photos: [],
    location: '上海市嘉定区G1501绕城高速安亭服务区',
    locationLat: 31.28,
    locationLng: 121.18,
    actions: ['reconnect_power', 'wait_repair'],
    description: '发电机运行两小时后突然停机，已切换至应急电池供电并报修，维修人员预计30分钟到达',
    reporter: '李师傅',
    status: 'submitted',
    createdAt: '2026-06-21T13:15:00',
    durationMinutes: 30
  }
]

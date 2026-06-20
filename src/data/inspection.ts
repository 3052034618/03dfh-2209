import { CheckItem, InspectionRecord } from '@/types'

export const defaultCheckItems: CheckItem[] = [
  {
    id: 'door_seal',
    name: '箱门密封检查',
    description: '确认左右箱门密封条完整、无破损，锁杆及封条卡扣正常',
    type: 'switch',
    required: true,
    status: 'pending'
  },
  {
    id: 'plug_status',
    name: '插电状态确认',
    description: '检查插头已稳固插入，电缆外皮无破损，插头指示灯正常亮起',
    type: 'switch',
    required: true,
    status: 'pending'
  },
  {
    id: 'thermo_reading',
    name: '温控机显示温度',
    description: '读取温控机面板实际显示温度（℃），与客户要求温度比对',
    type: 'input',
    unit: '℃',
    required: true,
    status: 'pending',
    passRange: { min: -25, max: 8 },
    failRange: { min: -35, max: 15 }
  },
  {
    id: 'power_vehicle',
    name: '车载电源连接',
    description: '确认车载发电机或冷柜专用供电接口连接牢固，电压稳定',
    type: 'switch',
    required: true,
    status: 'pending'
  },
  {
    id: 'set_temp_match',
    name: '设定温度核对',
    description: '温控机设定值与客户要求温度一致，±2℃内为正常',
    type: 'input',
    unit: '℃',
    required: true,
    status: 'pending',
    passRange: { min: -25, max: 8 }
  },
  {
    id: 'fan_operation',
    name: '蒸发器风机运行',
    description: '聆听风机运转声音正常，无异常震动或异响',
    type: 'switch',
    required: false,
    status: 'pending'
  }
]

export const mockInspectionRecords: InspectionRecord[] = [
  {
    id: 'IR20260621001',
    taskId: 'T20260621001',
    containerNo: 'MSKU1234567',
    items: defaultCheckItems.map((it, idx) => ({
      ...it,
      status: idx < 4 ? 'pass' : 'pending',
      value: it.type === 'switch' ? true : (it.id === 'thermo_reading' ? -18 : -18)
    })),
    result: 'pass',
    operator: '张师傅',
    createdAt: '2026-06-21T08:45:00',
    tempReading: -18
  },
  {
    id: 'IR20260620089',
    taskId: 'T20260620089',
    containerNo: 'HLCU5566778',
    items: defaultCheckItems.map((it, idx) => ({
      ...it,
      status: idx < 3 ? 'pass' : 'pending',
      value: it.type === 'switch' ? (idx === 3 ? false : true) : (it.id === 'thermo_reading' ? 2 : 0)
    })),
    result: 'review',
    remark: '车载电源需再次确认，已临时接电',
    operator: '张师傅',
    createdAt: '2026-06-21T06:20:00',
    tempReading: 2
  }
]

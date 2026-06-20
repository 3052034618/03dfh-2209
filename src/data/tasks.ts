import { Task } from '@/types'

export const mockTasks: Task[] = [
  {
    id: 'T20260621001',
    containerNo: 'MSKU1234567',
    sealNo: 'SL-8821456',
    requiredTemp: -18,
    loadingAddress: '上海市浦东新区临港冷链物流园A区12号库',
    deadline: '2026-06-21T18:00:00',
    pickupTime: '2026-06-21T08:30:00',
    customer: '顺丰冷链',
    status: 'shipping',
    portName: '洋山港四期',
    cargoType: '冷冻水产'
  },
  {
    id: 'T20260621002',
    containerNo: 'MAEU7654321',
    sealNo: 'SL-8821789',
    requiredTemp: 2,
    loadingAddress: '上海市嘉定区安亭镇仓储路88号B3库',
    deadline: '2026-06-21T22:00:00',
    pickupTime: '2026-06-21T10:00:00',
    customer: '京东物流',
    status: 'picking',
    portName: '外高桥二期',
    cargoType: '生鲜蔬菜'
  },
  {
    id: 'T20260621003',
    containerNo: 'COSU2468013',
    sealNo: 'SL-8822034',
    requiredTemp: -22,
    loadingAddress: '江苏省昆山市花桥镇经济开发区冷链中心5号',
    deadline: '2026-06-22T02:00:00',
    pickupTime: '2026-06-21T14:30:00',
    customer: '招商美冷',
    status: 'pending',
    portName: '洋山港三期',
    cargoType: '速冻肉制品'
  },
  {
    id: 'T20260621004',
    containerNo: 'EMC9876543',
    sealNo: 'SL-8822312',
    requiredTemp: 5,
    loadingAddress: '上海市青浦区华新镇华徐公路3000号',
    deadline: '2026-06-22T06:00:00',
    pickupTime: '2026-06-21T16:00:00',
    customer: '中外运冷链',
    status: 'pending',
    portName: '洋山港一期',
    cargoType: '乳制品'
  },
  {
    id: 'T20260621005',
    containerNo: 'ONE1122334',
    sealNo: 'SL-8822567',
    requiredTemp: -20,
    loadingAddress: '上海市奉贤区海湾镇冷链产业园D区',
    deadline: '2026-06-22T10:00:00',
    pickupTime: '2026-06-21T19:00:00',
    customer: '万纬冷链',
    status: 'pending',
    portName: '外高桥四期',
    cargoType: '冰淇淋'
  },
  {
    id: 'T20260620089',
    containerNo: 'HLCU5566778',
    sealNo: 'SL-8818901',
    requiredTemp: 0,
    loadingAddress: '上海市松江区新桥镇冷链路168号',
    deadline: '2026-06-21T12:00:00',
    pickupTime: '2026-06-21T06:00:00',
    customer: '太古冷链',
    status: 'arrived',
    portName: '外高桥一期',
    cargoType: '水果进口'
  },
  {
    id: 'T20260620076',
    containerNo: 'YMLU9900112',
    sealNo: 'SL-8817834',
    requiredTemp: -18,
    loadingAddress: '上海市宝山区罗泾镇港区冷链中心',
    deadline: '2026-06-21T09:00:00',
    pickupTime: '2026-06-21T03:00:00',
    customer: '恒伟冷链',
    status: 'completed',
    portName: '罗泾港区',
    cargoType: '冷冻食品'
  }
]

export const getTaskById = (id: string): Task | undefined => {
  return mockTasks.find(t => t.id === id)
}

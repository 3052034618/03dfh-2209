import React, { useMemo } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import {
  TASK_STATUS_TEXT,
  INSPECTION_RESULT_TEXT,
  EXCEPTION_TYPE_TEXT,
  InspectionResult
} from '@/types'
import { mockTasks } from '@/data/tasks'
import { appStore, useStoreSnapshot } from '@/store'
import {
  formatDateTime,
  getDeadlineText,
  isDeadlineNear,
  buildTempRanges,
  taskStatusColor
} from '@/utils'
import StatusBadge from '@/components/StatusBadge'
import SectionCard from '@/components/SectionCard'
import styles from './index.module.scss'

const EXCEPTION_STATUS_TEXT: Record<string, string> = {
  submitted: '已提交',
  handling: '处理中',
  resolved: '已解决'
}

const RESULT_COLOR: Record<InspectionResult, 'green' | 'orange' | 'red'> = {
  pass: 'green',
  review: 'orange',
  reject: 'red'
}

const getAdvice = (
  hasInspection: boolean,
  inspectionResult?: InspectionResult,
  hasException?: boolean,
  exceptionStatus?: string
): { icon: string; text: string; color: string } => {
  if (!hasInspection) {
    return { icon: '🔍', text: '尚未检查，建议立即前往箱体检查', color: '#2563EB' }
  }
  if (hasException && exceptionStatus !== 'resolved') {
    return { icon: '📢', text: '有未处理异常，请查看调度意见', color: '#EA580C' }
  }
  if (inspectionResult === 'reject') {
    return { icon: '🚫', text: '检查不通过，禁止发车，等待处理', color: '#DC2626' }
  }
  if (inspectionResult === 'review') {
    return { icon: '📞', text: '检查需复核，请联系调度确认', color: '#EA580C' }
  }
  return { icon: '✅', text: '检查通过，可安全发车', color: '#16A34A' }
}

const TaskDetailPage: React.FC = () => {
  const router = useRouter()
  const taskId = router.params.id

  useStoreSnapshot(() => null)

  const task = useMemo(() => mockTasks.find(t => t.id === taskId), [taskId])

  const latestInspection = useMemo(
    () => task ? appStore.getLatestInspectionByContainer(task.containerNo) : undefined,
    [task]
  )

  const latestException = useMemo(
    () => task ? appStore.getLatestExceptionByContainer(task.containerNo) : undefined,
    [task]
  )

  if (!task) {
    return (
      <View className={styles.page}>
        <View className={styles.empty}>
          <Text className={styles.emptyIcon}>❓</Text>
          <Text className={styles.emptyText}>未找到该任务</Text>
          <Button className={styles.backBtn} onClick={() => Taro.navigateBack()}>
            返回任务列表
          </Button>
        </View>
      </View>
    )
  }

  const deadlineText = getDeadlineText(task.deadline)
  const deadlineNear = isDeadlineNear(task.deadline)

  const thermoItem = latestInspection?.items.find(i => i.id === 'thermo_reading')
  const actualTemp = thermoItem?.rawValue
    ? parseFloat(thermoItem.rawValue)
    : typeof thermoItem?.value === 'number'
      ? thermoItem.value
      : undefined
  const requiredTemp = (latestInspection as any)?.requiredTemp ?? task.requiredTemp
  const deviation = actualTemp !== undefined ? actualTemp - requiredTemp : undefined

  const advice = getAdvice(
    !!latestInspection,
    latestInspection?.result,
    !!latestException,
    latestException?.status
  )

  return (
    <View className={styles.page}>
      <View className={styles.headerBanner}>
        <View className={styles.bannerTop}>
          <View className={styles.bannerLeft}>
            <View className={styles.bannerNoRow}>
              <Text className={styles.bannerIcon}>📦</Text>
              <Text className={styles.bannerNo}>{task.containerNo}</Text>
            </View>
            <Text className={styles.bannerCustomer}>{task.customer}</Text>
          </View>
          <StatusBadge
            text={TASK_STATUS_TEXT[task.status]}
            color={taskStatusColor(task.status) as any}
            size='md'
          />
        </View>
        <View className={styles.bannerMeta}>
          <View className={styles.metaItem}>
            <Text>🏗️</Text>
            <Text>{task.portName}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text>🕐</Text>
            <Text>{deadlineText}</Text>
          </View>
        </View>
      </View>

      <SectionCard title='任务信息'>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>箱号</Text>
          <Text className={styles.infoValue}>{task.containerNo}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>铅封号</Text>
          <Text className={styles.infoValue}>{task.sealNo}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>要求温度</Text>
          <Text className={styles.infoValue}>{task.requiredTemp}℃</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>客户名</Text>
          <Text className={styles.infoValue}>{task.customer}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>货物类型</Text>
          <Text className={styles.infoValue}>{task.cargoType}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>装货地址</Text>
          <Text className={styles.infoValue}>{task.loadingAddress}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>到港截止</Text>
          <Text className={styles.infoValue} style={{ color: deadlineNear ? '#EA580C' : '#0F172A' }}>
            {formatDateTime(task.deadline)}（{deadlineText}）
          </Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>任务状态</Text>
          <View className={styles.infoValue}>
            <StatusBadge
              text={TASK_STATUS_TEXT[task.status]}
              color={taskStatusColor(task.status) as any}
            />
          </View>
        </View>
      </SectionCard>

      <SectionCard title='最近检查结果'>
        {latestInspection ? (
          <>
            <View className={styles.resultRow}>
              <Text className={styles.infoLabel}>判定结果</Text>
              <View className={styles.infoValue}>
                <StatusBadge
                  text={INSPECTION_RESULT_TEXT[latestInspection.result]}
                  color={RESULT_COLOR[latestInspection.result]}
                />
              </View>
            </View>
            {actualTemp !== undefined && (
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>实际温度</Text>
                <Text className={styles.infoValue}>
                  {actualTemp}℃
                </Text>
              </View>
            )}
            {deviation !== undefined && (
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>偏差</Text>
                <Text
                  className={styles.infoValue}
                  style={{
                    color: Math.abs(deviation) > 5 ? '#DC2626' : Math.abs(deviation) > 2 ? '#EA580C' : '#16A34A',
                    fontWeight: 600
                  }}
                >
                  {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}℃
                </Text>
              </View>
            )}
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>检查时间</Text>
              <Text className={styles.infoValue}>{formatDateTime(latestInspection.createdAt)}</Text>
            </View>
          </>
        ) : (
          <View className={styles.emptyCard}>
            <Text className={styles.emptyCardIcon}>🔍</Text>
            <Text className={styles.emptyCardText}>尚未检查</Text>
          </View>
        )}
      </SectionCard>

      <SectionCard title='最近异常上报'>
        {latestException ? (
          <>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>异常类型</Text>
              <Text className={styles.infoValue}>{EXCEPTION_TYPE_TEXT[latestException.type]}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>原因</Text>
              <Text className={styles.infoValue}>{latestException.reason}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>状态</Text>
              <View className={styles.infoValue}>
                <StatusBadge
                  text={EXCEPTION_STATUS_TEXT[latestException.status] || latestException.status}
                  color={
                    latestException.status === 'resolved' ? 'green'
                    : latestException.status === 'handling' ? 'orange'
                    : 'red'
                  }
                />
              </View>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>调度已查看</Text>
              <Text className={styles.infoValue} style={{ color: latestException.dispatchViewed ? '#16A34A' : '#94A3B8' }}>
                {latestException.dispatchViewed ? '是' : '否'}
              </Text>
            </View>
          </>
        ) : (
          <View className={styles.emptyCard}>
            <Text className={styles.emptyCardIcon}>✨</Text>
            <Text className={styles.emptyCardText}>暂无异常</Text>
          </View>
        )}
      </SectionCard>

      <SectionCard title='下一步建议'>
        <View className={styles.adviceBlock} style={{ borderLeftColor: advice.color }}>
          <Text className={styles.adviceIcon}>{advice.icon}</Text>
          <Text className={styles.adviceText} style={{ color: advice.color }}>{advice.text}</Text>
        </View>
      </SectionCard>

      <View className={styles.bottomActions}>
        <Button
          className={styles.actionBtn}
          onClick={() => Taro.switchTab({ url: '/pages/inspection/index' })}
        >
          🔍 去箱体检查
        </Button>
        <Button
          className={styles.actionBtn}
          onClick={() => Taro.switchTab({ url: '/pages/exception/index' })}
        >
          ⚠️ 去异常上报
        </Button>
        <Button
          className={styles.actionBtnSecondary}
          onClick={() => Taro.navigateBack()}
        >
          ← 返回任务列表
        </Button>
      </View>
    </View>
  )
}

export default TaskDetailPage

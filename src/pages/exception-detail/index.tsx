import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import {
  ExceptionType,
  ExceptionAction,
  EXCEPTION_TYPE_TEXT,
  EXCEPTION_ACTION_TEXT
} from '@/types'
import { appStore, useStoreSnapshot } from '@/store'
import { formatDateTime, buildTempRanges } from '@/utils'
import { mockTasks } from '@/data/tasks'
import styles from './index.module.scss'

const STATUS_TEXT: Record<string, string> = {
  submitted: '已提交',
  handling: '处理中',
  resolved: '已解决'
}

const TYPE_BADGE: Record<ExceptionType, { icon: string; color: string }> = {
  temp_deviation: { icon: '🌡️', color: '#FEE2E2' },
  power_failure: { icon: '⚡', color: '#FEE2E2' },
  door_seal: { icon: '🚪', color: '#FFEDD5' },
  equipment_malfunction: { icon: '🔧', color: '#FFEDD5' },
  other: { icon: '⚠️', color: '#DBEAFE' }
}

const SUPPLEMENT_TEXT: Record<string, string> = {
  photo: '📸 调度要求补充现场照片，请尽快拍摄上传',
  temp: '🌡️ 调度要求补充温度读数，请记录当前温度并上报',
  both: '📸🌡️ 调度要求补充现场照片和温度读数，请尽快完成'
}

const ExceptionDetailPage: React.FC = () => {
  const router = useRouter()
  const id = router.params.id
  const [simulating, setSimulating] = useState(false)

  const report = useStoreSnapshot(s => {
    if (!id) return undefined
    return s.exceptions.find(r => r.id === id)
  })

  const timeline = report?.timeline || []
  const currentStepIndex = useMemo(() => {
    const idx = timeline.findIndex(item => !item.done)
    return idx === -1 ? timeline.length : idx
  }, [timeline])

  const handleSimulateStep = useCallback((step: 'view' | 'opinion' | 'supplement' | 'close') => {
    if (!id || simulating || !report) return
    setSimulating(true)
    const now = new Date().toISOString()
    const existingTimeline = report.timeline || []
    let updatedTimeline = existingTimeline.map(item => ({ ...item }))
    const updates: Record<string, any> = {}

    if (step === 'view') {
      updatedTimeline = updatedTimeline.map(item => {
        if (!item.done && item.label === '等待调度查看') {
          return { time: now, label: '调度已查看', done: true }
        }
        return item
      })
      updates.dispatchViewed = true
      updates.dispatchViewedAt = now
      updates.status = 'handling'
    } else if (step === 'opinion') {
      updatedTimeline = updatedTimeline.map(item => {
        if (!item.done && item.label === '等待调度查看') {
          return { time: report.dispatchViewedAt || now, label: '调度已查看', done: true }
        }
        if (!item.done && item.label === '调度给出处置意见') {
          return { time: now, label: '调度已给出处置意见', done: true }
        }
        return item
      })
      updates.dispatchViewed = true
      updates.dispatchViewedAt = report.dispatchViewedAt || now
      updates.dispatchOpinion = '已联系就近维修站现场处理，司机请在安全区域等待，预计30分钟内到达。除霜后重新测温，温度恢复正常可继续运输。'
      updates.dispatchOpinionAt = now
      updates.status = 'handling'
      updates.needSupplement = 'temp'
    } else if (step === 'supplement') {
      updatedTimeline = updatedTimeline.map(item => {
        if (!item.done && item.label === '需要补充信息') {
          return { time: now, label: '司机已补充信息并确认', done: true }
        }
        return item
      })
      updates.needSupplement = null
    } else if (step === 'close') {
      updatedTimeline = updatedTimeline.map(item => {
        if (!item.done && item.label === '等待调度查看') {
          return { time: report.dispatchViewedAt || now, label: '调度已查看', done: true }
        }
        if (!item.done && item.label === '调度给出处置意见') {
          return { time: report.dispatchOpinionAt || now, label: '调度已给出处置意见', done: true }
        }
        if (!item.done && item.label === '需要补充信息') {
          return { time: now, label: '无需补充信息', done: true }
        }
        if (!item.done && item.label === '问题解决，关闭上报') {
          return { time: now, label: '问题已解决，上报已关闭', done: true }
        }
        return item
      })
      updates.status = 'resolved'
      updates.dispatchViewed = true
    }

    updates.timeline = updatedTimeline
    appStore.updateExceptionStatus(id, updates)
    setTimeout(() => setSimulating(false), 600)
  }, [id, simulating, report])

  if (!report) {
    return (
      <View className={styles.page}>
        <View className={styles.empty}>
          <Text className={styles.emptyIcon}>❓</Text>
          <Text className={styles.emptyText}>未找到该异常上报记录</Text>
          <Button className={styles.backBtn} onClick={() => Taro.switchTab({ url: '/pages/exception/index' })}>
            返回上报列表
          </Button>
        </View>
      </View>
    )
  }

  const task = mockTasks.find(t => t.id === report.taskId)
  const requiredTemp = task?.requiredTemp
  const badgeCfg = TYPE_BADGE[report.type] || TYPE_BADGE.other

  const currentTemp = report.currentTemp
  const diffValue = currentTemp !== undefined && requiredTemp !== undefined
    ? currentTemp - requiredTemp
    : undefined

  const tempRanges = requiredTemp !== undefined ? buildTempRanges(requiredTemp) : null

  return (
    <View className={styles.page}>
      <View className={styles.headerBanner}>
        <View className={styles.bannerTop}>
          <View className={styles.bannerLeft}>
            <View className={styles.bannerTypeRow}>
              <Text className={styles.bannerIcon}>{badgeCfg.icon}</Text>
              <Text className={styles.bannerType}>{EXCEPTION_TYPE_TEXT[report.type]}</Text>
            </View>
            <Text className={styles.bannerNo}>箱号 {report.containerNo}</Text>
          </View>
          <View className={styles.bannerStatus}>
            {STATUS_TEXT[report.status] || report.status}
          </View>
        </View>
        <View className={styles.bannerMeta}>
          <View className={styles.metaItem}>
            <Text>👷</Text>
            <Text>{report.reporter}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text>🕐</Text>
            <Text>{formatDateTime(report.createdAt)}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text>🆔</Text>
            <Text>{report.id}</Text>
          </View>
          {report.durationMinutes && (
            <View className={styles.metaItem}>
              <Text>⏱</Text>
              <Text>持续 {report.durationMinutes} 分钟</Text>
            </View>
          )}
        </View>
      </View>

      {(requiredTemp !== undefined || currentTemp !== undefined) && (
        <View className={styles.card}>
          <View className={styles.cardTitle}>🌡️ 温度快照</View>
          <View className={styles.tempGroup}>
            <View className={classnames(styles.tempBlock, styles.tempReq)}>
              <Text className={styles.tempLabel}>客户要求</Text>
              <Text className={styles.tempNum}>
                {requiredTemp !== undefined ? `${requiredTemp}℃` : '—'}
              </Text>
            </View>
            <View className={classnames(styles.tempBlock, styles.tempNow)}>
              <Text className={styles.tempLabel}>当前温度</Text>
              <Text className={styles.tempNum}>
                {currentTemp !== undefined ? `${currentTemp}℃` : '—'}
              </Text>
            </View>
            <View className={classnames(styles.tempBlock, styles.tempDiff)}>
              <Text className={styles.tempLabel}>偏差</Text>
              <Text className={styles.tempNum}>
                {diffValue !== undefined
                  ? `${diffValue > 0 ? '+' : ''}${diffValue.toFixed(1)}℃`
                  : '—'}
              </Text>
            </View>
          </View>
          {tempRanges && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>正常范围</Text>
              <Text className={styles.infoValue}>
                {tempRanges.passMin} ~ {tempRanges.passMax}℃
              </Text>
            </View>
          )}
          {diffValue !== undefined && Math.abs(diffValue) > 2 && (
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>偏离判定</Text>
              <Text className={styles.infoValue} style={{
                color: Math.abs(diffValue) > 5 ? '#DC2626' : '#EA580C',
                fontWeight: 600
              }}>
                {Math.abs(diffValue) > 5
                  ? `⚠️ 严重偏离（>${requiredTemp! + 5}℃ 或 <${requiredTemp! - 5}℃），禁止发车`
                  : `🔔 轻度偏离（±2~5℃内），需调度复核`}
              </Text>
            </View>
          )}
        </View>
      )}

      <View className={styles.card}>
        <View className={styles.cardTitle}>📋 上报信息</View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>异常类型</Text>
          <Text className={styles.infoValue}>{EXCEPTION_TYPE_TEXT[report.type]}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>具体原因</Text>
          <Text className={styles.infoValue}>{report.reason}</Text>
        </View>
        {task && (
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>关联客户</Text>
            <Text className={styles.infoValue}>{task.customer}</Text>
          </View>
        )}
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>任务状态</Text>
          <Text className={styles.infoValue}>
            {task
              ? ({
                pending: '待提箱',
                picking: '提箱中',
                shipping: '运输中',
                arrived: '已到港',
                completed: '已完成'
              } as Record<string, string>)[task.status] || '未知'
              : '未关联'}
          </Text>
        </View>
      </View>

      <View className={styles.card}>
        <View className={styles.cardTitle}>📷 现场照片（{report.photos?.length || 0}/3）</View>
        {report.photos && report.photos.length > 0 ? (
          <View className={styles.photoGrid}>
            {report.photos.map((p, idx) => (
              <View key={idx} className={styles.photoItem}>
                <Image className={styles.photoImg} src={p} mode='aspectFill' />
              </View>
            ))}
          </View>
        ) : (
          <View className={styles.photoEmpty}>
            <Text className={styles.photoEmptyIcon}>🖼️</Text>
            <Text className={styles.photoEmptyText}>未上传现场照片</Text>
          </View>
        )}
      </View>

      <View className={styles.card}>
        <View className={styles.cardTitle}>📍 当前停车位置</View>
        {report.location ? (
          <View className={styles.locationBlock}>
            <Text className={styles.locationIcon}>🚛</Text>
            <Text className={styles.locationText}>{report.location}</Text>
          </View>
        ) : (
          <View style={{ fontSize: 24, color: '#94A3B8', textAlign: 'center', padding: '32rpx 0' }}>
            未获取位置信息
          </View>
        )}
      </View>

      <View className={styles.card}>
        <View className={styles.cardTitle}>✅ 已采取措施（{report.actions?.length || 0}项）</View>
        {report.actions && report.actions.length > 0 ? (
          <View className={styles.actionTags}>
            {report.actions.map((a: ExceptionAction) => (
              <View key={a} className={styles.actionTag}>
                ✓ {EXCEPTION_ACTION_TEXT[a]}
              </View>
            ))}
          </View>
        ) : (
          <View style={{ fontSize: 24, color: '#94A3B8', textAlign: 'center', padding: '32rpx 0' }}>
            未选择已采取的措施
          </View>
        )}
      </View>

      {report.description && (
        <View className={styles.card}>
          <View className={styles.cardTitle}>📝 情况详细说明</View>
          <View className={styles.descBlock}>{report.description}</View>
        </View>
      )}

      {timeline.length > 0 && (
        <View className={styles.card}>
          <View className={styles.cardTitle}>📊 处理进度</View>
          <View className={styles.timeline}>
            {timeline.map((item, idx) => {
              const isDone = item.done
              const isCurrent = idx === currentStepIndex
              const isLast = idx === timeline.length - 1
              return (
                <View key={idx} className={styles.timelineItem}>
                  <View className={styles.timelineLeft}>
                    <View className={classnames(
                      styles.timelineDot,
                      isDone && styles.timelineDotDone,
                      isCurrent && styles.timelineDotCurrent,
                      !isDone && !isCurrent && styles.timelineDotPending
                    )} />
                    {!isLast && (
                      <View className={classnames(
                        styles.timelineLine,
                        isDone && styles.timelineLineDone,
                        !isDone && styles.timelineLinePending
                      )} />
                    )}
                  </View>
                  <View className={classnames(
                    styles.timelineContent,
                    isCurrent && styles.timelineContentCurrent
                  )}>
                    <View className={styles.timelineHeader}>
                      <Text className={classnames(
                        styles.timelineLabel,
                        isDone && styles.timelineLabelDone,
                        isCurrent && styles.timelineLabelCurrent,
                        !isDone && !isCurrent && styles.timelineLabelPending
                      )}>
                        {item.label}
                      </Text>
                      {isCurrent && <View className={styles.timelineBadge}>进行中</View>}
                    </View>
                    <Text className={styles.timelineTime}>
                      {item.done ? formatDateTime(item.time) : '⏳ 等待中'}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {(report.dispatchViewed || report.dispatchOpinion) && (
        <View className={styles.card}>
          <View className={styles.cardTitle}>📡 调度反馈</View>
          {report.dispatchViewed && (
            <View className={styles.dispatchRow}>
              <View className={styles.dispatchViewedTag}>
                <Text className={styles.dispatchViewedIcon}>👀</Text>
                <Text className={styles.dispatchViewedText}>调度已查看</Text>
              </View>
              {report.dispatchViewedAt && (
                <Text className={styles.dispatchTime}>{formatDateTime(report.dispatchViewedAt)}</Text>
              )}
            </View>
          )}
          {report.dispatchOpinion && (
            <View className={styles.opinionBlock}>
              <Text className={styles.opinionLabel}>处置意见</Text>
              <Text className={styles.opinionContent}>{report.dispatchOpinion}</Text>
              {report.dispatchOpinionAt && (
                <Text className={styles.dispatchTime}>{formatDateTime(report.dispatchOpinionAt)}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {report.needSupplement && report.needSupplement !== null && (
        <View className={styles.supplementCard}>
          <View className={styles.supplementHeader}>
            <Text className={styles.supplementIcon}>⚠️</Text>
            <Text className={styles.supplementTitle}>需要补充信息</Text>
          </View>
          <Text className={styles.supplementDesc}>
            {SUPPLEMENT_TEXT[report.needSupplement] || '调度要求补充相关信息，请尽快处理'}
          </Text>
        </View>
      )}

      <View className={styles.card}>
        <View className={styles.cardTitle}>💡 调度处理建议</View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>优先级</Text>
          <Text className={styles.infoValue} style={{
            color: report.type === 'power_failure' || report.type === 'temp_deviation' ? '#DC2626' : '#EA580C',
            fontWeight: 700
          }}>
            {report.type === 'power_failure' || Math.abs(diffValue || 99) > 5 ? '🔴 紧急' : '🟠 一般'}
          </Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>建议动作</Text>
          <View className={styles.infoValue} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.type === 'temp_deviation' && (
              <>
                <Text>1. 立即联系司机确认当前温度和供电状态</Text>
                <Text>2. 指导司机检查蒸发器是否结霜、压缩机是否运行</Text>
                <Text>3. 偏差超过5℃需评估是否返回堆场或就近维修</Text>
                <Text>4. 通知客户货物可能受影响，协调后续方案</Text>
              </>
            )}
            {report.type === 'power_failure' && (
              <>
                <Text>1. 立即指导司机重新接电，优先保障制冷</Text>
                <Text>2. 远程协助排查发电机、电缆、港区插头</Text>
                <Text>3. 无法恢复时立即派维修车辆现场抢修</Text>
                <Text>4. 评估货物温度上升风险，必要时转运</Text>
              </>
            )}
            {report.type === 'door_seal' && (
              <>
                <Text>1. 让司机拍照确认箱门密封条和封条现状</Text>
                <Text>2. 若封条破损需报备海关/客户确认</Text>
                <Text>3. 箱门变形无法闭合需立即回堆场换箱</Text>
              </>
            )}
            {report.type === 'equipment_malfunction' && (
              <>
                <Text>1. 详细记录报警代码和故障现象</Text>
                <Text>2. 联系冷柜厂商技术支持远程诊断</Text>
                <Text>3. 必要时安排维修人员现场处理</Text>
              </>
            )}
            {report.type === 'other' && (
              <>
                <Text>1. 回电司机了解详细情况</Text>
                <Text>2. 根据具体情况协调对应资源</Text>
              </>
            )}
          </View>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>联系司机</Text>
          <Text className={styles.infoValue} style={{ color: '#2563EB', fontWeight: 600 }}>
            📞 {report.reporter}
          </Text>
        </View>
      </View>

      {report.status !== 'resolved' && (
        <View className={styles.simulateGroup}>
          {!report.dispatchViewed && (
            <Button
              className={classnames(styles.simulateBtn, styles.simulateBtnPrimary)}
              disabled={simulating}
              onClick={() => handleSimulateStep('view')}
            >
              {simulating ? '处理中...' : '① 模拟调度查看'}
            </Button>
          )}
          {report.dispatchViewed && !report.dispatchOpinion && (
            <Button
              className={classnames(styles.simulateBtn, styles.simulateBtnPrimary)}
              disabled={simulating}
              onClick={() => handleSimulateStep('opinion')}
            >
              {simulating ? '处理中...' : '② 模拟调度给出意见'}
            </Button>
          )}
          {report.needSupplement && (
            <Button
              className={classnames(styles.simulateBtn, styles.simulateBtnOrange)}
              disabled={simulating}
              onClick={() => handleSimulateStep('supplement')}
            >
              {simulating ? '处理中...' : '③ 模拟司机补充信息'}
            </Button>
          )}
          {report.dispatchViewed && (
            <Button
              className={classnames(styles.simulateBtn, styles.simulateBtnGreen)}
              disabled={simulating}
              onClick={() => handleSimulateStep('close')}
            >
              {simulating ? '处理中...' : '④ 模拟问题解决关闭'}
            </Button>
          )}
        </View>
      )}

      <Button className={styles.backBtn} onClick={() => Taro.navigateBack()}>
        ← 返回上报列表
      </Button>
    </View>
  )
}

export default ExceptionDetailPage

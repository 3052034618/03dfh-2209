import React, { useState, useMemo, useEffect } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import classnames from 'classnames'
import { Task, CheckItem, InspectionResult, INSPECTION_RESULT_TEXT } from '@/types'
import { mockTasks } from '@/data/tasks'
import { defaultCheckItems, mockInspectionRecords } from '@/data/inspection'
import { evaluateInspection, formatDateTime } from '@/utils'
import CheckItemComp from '@/components/CheckItem'
import SectionCard from '@/components/SectionCard'
import StatusBadge from '@/components/StatusBadge'
import styles from './index.module.scss'

const InspectionPage: React.FC = () => {
  const availableTasks = useMemo(() =>
    mockTasks.filter(t => t.status === 'pending' || t.status === 'picking' || t.status === 'shipping'),
    []
  )
  const [selectedTask, setSelectedTask] = useState<Task | null>(availableTasks[0] || null)
  const [checkItems, setCheckItems] = useState<CheckItem[]>(
    defaultCheckItems.map(it => ({ ...it }))
  )
  const [showTaskPicker, setShowTaskPicker] = useState(false)

  const evaluation = useMemo(() => evaluateInspection(checkItems), [checkItems])
  const { result, issues } = evaluation

  const progress = useMemo(() => {
    const required = checkItems.filter(i => i.required)
    const done = required.filter(i => {
      if (i.type === 'switch') return i.value === true
      if (i.type === 'input') return i.value !== undefined && i.value !== ''
      return false
    })
    return { done: done.length, total: required.length }
  }, [checkItems])

  useEffect(() => {
    console.log('[Inspection] 当前任务:', selectedTask?.containerNo)
    console.log('[Inspection] 评估结果:', INSPECTION_RESULT_TEXT[result])
  }, [selectedTask, result])

  usePullDownRefresh(() => {
    setTimeout(() => {
      setCheckItems(defaultCheckItems.map(it => ({ ...it })))
      Taro.stopPullDownRefresh()
    }, 600)
  })

  const handleSelectTask = () => {
    setShowTaskPicker(true)
    Taro.showActionSheet({
      itemList: availableTasks.map(t => `${t.containerNo} · ${t.customer}`),
      success: res => {
        const task = availableTasks[res.tapIndex]
        setSelectedTask(task)
        setCheckItems(defaultCheckItems.map(it => ({ ...it })))
        console.log('[Inspection] 切换任务:', task.containerNo)
      },
      complete: () => setShowTaskPicker(false)
    })
  }

  const handleItemChange = (id: string, value: boolean | number | string) => {
    setCheckItems(prev => prev.map(item => {
      if (item.id !== id) return item
      let status: CheckItem['status'] = 'pending'
      if (item.type === 'switch') {
        status = value === true ? 'pass' : 'fail'
      } else if (item.type === 'input' && item.passRange && typeof value === 'number') {
        const { min, max } = item.passRange
        if (value >= min && value <= max) {
          status = 'pass'
        } else if (item.failRange) {
          const fmin = item.failRange.min ?? -Infinity
          const fmax = item.failRange.max ?? Infinity
          status = (value < fmin || value > fmax) ? 'fail' : 'pass'
        } else {
          status = 'fail'
        }
      }
      return { ...item, value, status }
    }))
  }

  const handleReset = () => {
    Taro.showModal({
      title: '重置检查',
      content: '确定要清空所有检查项吗？',
      success: res => {
        if (res.confirm) {
          setCheckItems(defaultCheckItems.map(it => ({ ...it })))
          Taro.showToast({ title: '已重置', icon: 'success' })
        }
      }
    })
  }

  const handleSubmit = () => {
    if (!selectedTask) {
      Taro.showToast({ title: '请先选择任务', icon: 'none' })
      return
    }
    if (progress.done < progress.total) {
      Taro.showModal({
        title: '检查未完成',
        content: `还有 ${progress.total - progress.done} 项必检项未完成，确定提交吗？`,
        success: res => {
          if (res.confirm) doSubmit()
        }
      })
      return
    }
    doSubmit()
  }

  const doSubmit = () => {
    const titleMap: Record<InspectionResult, string> = {
      pass: '检查通过 · 可发车',
      review: '部分异常 · 需复核',
      reject: '检查不通过 · 禁止发车'
    }
    const contentMap: Record<InspectionResult, string> = {
      pass: `箱体 ${selectedTask?.containerNo} 检查通过，温度正常，可安全发车。`,
      review: `箱体 ${selectedTask?.containerNo} 存在需复核项：\n${issues.slice(0, 3).join('\n')}\n请联系调度确认后再决定。`,
      reject: `箱体 ${selectedTask?.containerNo} 存在严重问题：\n${issues.slice(0, 3).join('\n')}\n禁止发车，请立即处理。`
    }
    Taro.showModal({
      title: titleMap[result],
      content: contentMap[result],
      confirmText: result === 'reject' ? '联系调度' : '确认提交',
      showCancel: false,
      success: () => {
        Taro.showLoading({ title: '提交中...' })
        setTimeout(() => {
          Taro.hideLoading()
          Taro.showToast({ title: '检查已提交', icon: 'success' })
          console.log('[Inspection] 检查记录提交:', {
            taskId: selectedTask?.id,
            containerNo: selectedTask?.containerNo,
            result,
            items: checkItems
          })
        }, 800)
      }
    })
  }

  const resultClass = progress.done === 0 ? 'resultBannerPending'
    : result === 'pass' ? 'resultBannerPass'
    : result === 'review' ? 'resultBannerReview'
    : 'resultBannerReject'

  const resultText = progress.done === 0 ? '等待检查' : INSPECTION_RESULT_TEXT[result]

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.content}>
        <View className={styles.selectorCard}>
          <Text className={styles.selectorLabel}>选择本次检查的集装箱任务</Text>
          <View className={styles.selectorRow}>
            <View className={styles.selectorLeft}>
              {selectedTask ? (
                <>
                  <Text className={styles.selectorContainerNo}>{selectedTask.containerNo}</Text>
                  <View className={styles.selectorTempRow}>
                    <View className={styles.selectorTempItem}>
                      <Text className={styles.selectorTempLabel}>要求</Text>
                      <Text className={styles.selectorTempValue}>{selectedTask.requiredTemp}℃</Text>
                    </View>
                    <View className={styles.selectorTempItem}>
                      <Text className={styles.selectorTempLabel}>客户</Text>
                      <Text className={styles.selectorTempValue} style={{ color: '#475569' }}>{selectedTask.customer}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text className={styles.selectorContainerNo} style={{ color: '#94A3B8' }}>请选择任务</Text>
              )}
            </View>
            <Button className={styles.selectorBtn} onClick={handleSelectTask}>
              切换任务
            </Button>
          </View>
        </View>

        <View className={classnames(styles.resultBanner, styles[resultClass])}>
          <View className={styles.resultHeader}>
            <Text className={styles.resultTitle}>检查结果判定</Text>
            <Text className={styles.resultMain}>{resultText}</Text>
          </View>
          <Text className={styles.resultSub}>
            {progress.done === 0
              ? '请开始逐项检查箱体状态，完成后系统将自动判定发车许可。'
              : result === 'pass'
                ? '所有必检项已通过，箱体状态良好，安全可发车。'
                : result === 'review'
                  ? `存在 ${issues.length} 项待确认问题，请根据情况处理或联系调度复核。`
                  : `存在 ${issues.length} 项严重问题，禁止发车！请立即处理后重新检查。`
            }
          </Text>
          {issues.length > 0 && progress.done > 0 && (
            <View className={styles.issueList}>
              {issues.slice(0, 5).map((iss, idx) => (
                <Text key={idx} className={styles.issueItem}>{iss}</Text>
              ))}
            </View>
          )}
        </View>

        <View className={styles.progressInfo}>
          <Text className={styles.progressText}>必检项完成进度</Text>
          <Text className={styles.progressNum}>
            {progress.done} / {progress.total}
          </Text>
        </View>

        <SectionCard
          title='箱体检查清单'
          subtitle='请严格按照顺序逐项确认，确保行车安全'
        >
          {checkItems.map(item => (
            <CheckItemComp
              key={item.id}
              item={item}
              onChange={handleItemChange}
              referenceValue={
                (item.id === 'thermo_reading' || item.id === 'set_temp_match')
                  ? selectedTask?.requiredTemp
                  : undefined
              }
              referenceLabel='客户要求'
            />
          ))}
        </SectionCard>

        <View className={styles.historySection}>
          <Text className={styles.historyTitle}>近期检查记录</Text>
          {mockInspectionRecords.length === 0 ? (
            <View className={styles.emptyHint}>
              <Text className={styles.emptyHintText}>暂无历史检查记录</Text>
            </View>
          ) : (
            mockInspectionRecords.map(rec => (
              <View
                key={rec.id}
                className={styles.historyItem}
                onClick={() => Taro.navigateTo({
                  url: `/pages/inspection-detail/index?id=${rec.id}`
                })}
              >
                <View className={styles.historyLeft}>
                  <Text className={styles.historyNo}>{rec.containerNo}</Text>
                  <Text className={styles.historyTime}>
                    {rec.operator} · {formatDateTime(rec.createdAt)}
                  </Text>
                </View>
                <StatusBadge
                  text={INSPECTION_RESULT_TEXT[rec.result]}
                  color={
                    rec.result === 'pass' ? 'green'
                      : rec.result === 'review' ? 'orange' : 'red'
                  }
                  size='md'
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <Button className={styles.resetBtn} onClick={handleReset}>
          重置
        </Button>
        <Button
          className={classnames(
            styles.submitBtn,
            !selectedTask && styles.submitBtnDisabled
          )}
          disabled={!selectedTask}
          onClick={handleSubmit}
        >
          提交检查结果
        </Button>
      </View>
    </View>
  )
}

export default InspectionPage

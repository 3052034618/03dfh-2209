import React, { useState, useMemo, useEffect, useRef } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import classnames from 'classnames'
import { Task, CheckItem, InspectionResult, INSPECTION_RESULT_TEXT } from '@/types'
import { mockTasks } from '@/data/tasks'
import { defaultCheckItems } from '@/data/inspection'
import { evaluateInspection, formatDateTime, buildTempRanges } from '@/utils'
import { useStoreSnapshot, appStore } from '@/store'
import CheckItemComp from '@/components/CheckItem'
import SectionCard from '@/components/SectionCard'
import StatusBadge from '@/components/StatusBadge'
import styles from './index.module.scss'

const parseNumeric = (v: any): number | undefined => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }
  return undefined
}

const buildInitialState = (availableTasks: Task[]) => {
  const draft = appStore.loadInspectionDraft()
  if (draft && draft.items.length > 0) {
    const matchedTask = availableTasks.find(t => t.id === draft.taskId)
    if (matchedTask) {
      console.log('[Inspection] 初始化恢复草稿:', draft.containerNo, '任务ID:', draft.taskId)
      return { task: matchedTask, items: draft.items }
    }
  }
  return { task: availableTasks[0] || null, items: defaultCheckItems.map(it => ({ ...it })) }
}

const InspectionPage: React.FC = () => {
  const availableTasks = useMemo(() =>
    mockTasks.filter(t => t.status === 'pending' || t.status === 'picking' || t.status === 'shipping'),
    []
  )

  const initial = useMemo(() => buildInitialState(availableTasks), [])
  const [selectedTask, setSelectedTask] = useState<Task | null>(initial.task)
  const [checkItems, setCheckItems] = useState<CheckItem[]>(initial.items)
  const [showTaskPicker, setShowTaskPicker] = useState(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const evaluation = useMemo(() => {
    if (!selectedTask) return { result: 'review' as InspectionResult, issues: [] }
    return evaluateInspection(checkItems, selectedTask.requiredTemp)
  }, [checkItems, selectedTask])
  const { result, issues } = evaluation

  const tempRanges = useMemo(() => {
    if (!selectedTask) return null
    const { passMin, passMax, reviewMin, reviewMax } = buildTempRanges(selectedTask.requiredTemp)
    return {
      passRange: { min: passMin, max: passMax },
      failRange: { min: reviewMin, max: reviewMax }
    }
  }, [selectedTask])

  const progress = useMemo(() => {
    const required = checkItems.filter(i => i.required)
    const done = required.filter(i => {
      if (i.type === 'switch') return i.value === true
      if (i.type === 'input') return i.value !== undefined && i.value !== ''
      return false
    })
    return { done: done.length, total: required.length }
  }, [checkItems])

  const saveDraft = (items: CheckItem[], task: Task | null) => {
    if (!task) return
    const hasInput = items.some(i =>
      (i.type === 'switch' && i.value === true) ||
      (i.type === 'input' && i.value !== undefined && i.value !== '')
    )
    if (!hasInput) {
      appStore.clearInspectionDraft()
      return
    }
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      appStore.saveInspectionDraft({
        taskId: task.id,
        containerNo: task.containerNo,
        items: JSON.parse(JSON.stringify(items))
      })
    }, 300)
  }

  useEffect(() => {
    console.log('[Inspection] 当前任务:', selectedTask?.containerNo, '要求温度:', selectedTask?.requiredTemp)
    console.log('[Inspection] 评估结果:', INSPECTION_RESULT_TEXT[result])
  }, [selectedTask, result])

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  usePullDownRefresh(() => {
    setTimeout(() => {
      setCheckItems(defaultCheckItems.map(it => ({ ...it })))
      appStore.clearInspectionDraft()
      Taro.stopPullDownRefresh()
    }, 600)
  })

  const showToastBrief = (title: string, icon: any = 'none', duration = 1500) => {
    Taro.showToast({ title, icon, duration })
  }

  const handleSelectTask = () => {
    setShowTaskPicker(true)
    Taro.showActionSheet({
      itemList: availableTasks.map(t => `${t.containerNo} · ${t.customer} · 要求${t.requiredTemp}℃`),
      success: res => {
        const task = availableTasks[res.tapIndex]
        if (!task) return
        const cur = selectedTask
        if (cur && cur.id === task.id) {
          showToastBrief('当前已选择该任务')
          return
        }
        const hasInput = checkItems.some(i =>
          (i.type === 'switch' && i.value === true) ||
          (i.type === 'input' && i.value !== undefined && i.value !== '')
        )
        const doSwitch = () => {
          setSelectedTask(task)
          const resetItems = defaultCheckItems.map(it => ({
            ...it,
            value: undefined,
            rawValue: undefined,
            status: 'pending' as const
          }))
          setCheckItems(resetItems)
          appStore.clearInspectionDraft()
          console.log('[Inspection] 切换任务:', task.containerNo, '要求温度:', task.requiredTemp, '℃')
          showToastBrief(`已切换到 ${task.containerNo}（${task.requiredTemp}℃）`)
        }
        if (hasInput) {
          Taro.showModal({
            title: '切换任务将清空草稿',
            content: `当前 ${cur?.containerNo || ''} 的未提交检查内容将丢失，确认切换到 ${task.containerNo}？`,
            confirmText: '确认切换',
            success: r => { if (r.confirm) doSwitch() }
          })
        } else {
          doSwitch()
        }
      },
      complete: () => setShowTaskPicker(false)
    })
  }

  const handleItemChange = (id: string, value: boolean | number | string, rawValue?: string) => {
    setCheckItems(prev => {
      const next = prev.map(item => {
        if (item.id !== id) return item
        let status: CheckItem['status'] = 'pending'

        if (item.type === 'switch') {
          status = value === true ? 'pass' : 'fail'
        } else if (item.type === 'input' && selectedTask) {
          const numV = parseNumeric(value)
          if (numV === undefined) {
            status = 'pending'
          } else if (id === 'thermo_reading' || id === 'set_temp_match') {
            const { passMin, passMax, reviewMin, reviewMax } = buildTempRanges(selectedTask.requiredTemp)
            if (numV >= passMin && numV <= passMax) {
              status = 'pass'
            } else if (numV < reviewMin || numV > reviewMax) {
              status = 'fail'
            } else {
              status = 'fail'
            }
          } else if (item.passRange) {
            const { min, max } = item.passRange
            if (numV >= min && numV <= max) {
              status = 'pass'
            } else if (item.failRange) {
              const fmin = item.failRange.min ?? -Infinity
              const fmax = item.failRange.max ?? Infinity
              status = (numV < fmin || numV > fmax) ? 'fail' : 'fail'
            } else {
              status = 'fail'
            }
          }
        }
        const updated: CheckItem = { ...item, value, status }
        if (item.type === 'input') {
          (updated as any).rawValue = rawValue
        }
        return updated
      })
      saveDraft(next, selectedTask)
      return next
    })
  }

  const handleReset = () => {
    const hasInput = checkItems.some(i =>
      (i.type === 'switch' && i.value === true) ||
      (i.type === 'input' && i.value !== undefined && i.value !== '')
    )
    const doReset = () => {
      const resetItems = defaultCheckItems.map(it => ({
        ...it,
        value: undefined as undefined,
        rawValue: undefined as undefined,
        status: 'pending' as const
      }))
      setCheckItems(resetItems)
      appStore.clearInspectionDraft()
      showToastBrief('已重置', 'success')
    }
    if (!hasInput) {
      doReset()
      return
    }
    Taro.showModal({
      title: '重置检查',
      content: '所有已填内容和草稿将被清空，确定重置吗？',
      confirmText: '确定重置',
      success: res => {
        if (res.confirm) doReset()
      }
    })
  }

  const handleSubmit = () => {
    if (!selectedTask) {
      showToastBrief('请先选择任务')
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
    if (!selectedTask) return

    const titleMap: Record<InspectionResult, string> = {
      pass: '检查通过 · 可发车',
      review: '部分异常 · 需复核',
      reject: '检查不通过 · 禁止发车'
    }
    const contentMap: Record<InspectionResult, string> = {
      pass: `箱体 ${selectedTask.containerNo} 检查通过，温度正常，可安全发车。`,
      review: `箱体 ${selectedTask.containerNo} 存在需复核项：\n${issues.slice(0, 3).join('\n')}\n请联系调度确认后再决定。`,
      reject: `箱体 ${selectedTask.containerNo} 存在严重问题：\n${issues.slice(0, 3).join('\n')}\n禁止发车，请立即处理。`
    }
    Taro.showModal({
      title: titleMap[result],
      content: contentMap[result],
      confirmText: result === 'reject' ? '联系调度' : '确认提交',
      showCancel: false,
      success: () => {
        Taro.showLoading({ title: '提交中...' })
        try {
          const saved = appStore.buildAndSaveInspection({
            taskId: selectedTask.id,
            containerNo: selectedTask.containerNo,
            items: checkItems,
            result,
            requiredTemp: selectedTask.requiredTemp,
            remark: issues.length > 0 ? issues.join('；') : undefined
          })
          setTimeout(() => {
            Taro.hideLoading()
            showToastBrief('检查已提交', 'success')
            console.log('[Inspection] 检查记录已保存:', saved.id, saved.containerNo, '草稿已清除')
            const resetItems = defaultCheckItems.map(it => ({
              ...it,
              value: undefined as undefined,
              rawValue: undefined as undefined,
              status: 'pending' as const
            }))
            setCheckItems(resetItems)
            appStore.clearInspectionDraft()
          }, 800)
        } catch (e) {
          Taro.hideLoading()
          showToastBrief('提交失败，请重试')
          console.error('[Inspection] 提交失败:', e)
        }
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
                ? `基于 ${selectedTask?.containerNo || '当前任务'} 要求温度 ${selectedTask?.requiredTemp}℃ 判定：所有必检项已通过，箱体状态良好，安全可发车。`
                : result === 'review'
                  ? `基于 ${selectedTask?.containerNo || '当前任务'} 要求温度 ${selectedTask?.requiredTemp}℃ 判定：存在 ${issues.length} 项待确认问题，请根据情况处理或联系调度复核。`
                  : `基于 ${selectedTask?.containerNo || '当前任务'} 要求温度 ${selectedTask?.requiredTemp}℃ 判定：存在 ${issues.length} 项严重问题，禁止发车！请立即处理后重新检查。`
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
              dynamicPassRange={
                (item.id === 'thermo_reading' || item.id === 'set_temp_match')
                  ? tempRanges?.passRange
                  : undefined
              }
              dynamicFailRange={
                (item.id === 'thermo_reading' || item.id === 'set_temp_match')
                  ? tempRanges?.failRange
                  : undefined
              }
            />
          ))}
        </SectionCard>

        <HistoryList />
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

const HistoryList: React.FC = () => {
  const inspections = useStoreSnapshot(s => s.inspections)

  return (
    <View className={styles.historySection}>
      <Text className={styles.historyTitle}>近期检查记录（共 {inspections.length} 条）</Text>
      {inspections.length === 0 ? (
        <View className={styles.emptyHint}>
          <Text className={styles.emptyHintText}>暂无历史检查记录</Text>
        </View>
      ) : (
        inspections.map(rec => {
          const thermoItem = rec.items.find(i => i.id === 'thermo_reading')
          const tempDisplay = thermoItem?.rawValue
            ? thermoItem.rawValue
            : (typeof thermoItem?.value === 'number' ? `${thermoItem.value}` : (typeof thermoItem?.value === 'string' && thermoItem.value ? thermoItem.value : ''))
          const tempStr = tempDisplay ? `${tempDisplay}℃` : '未录入'
          const tempNum = parseNumeric(thermoItem?.value)
          const reqTemp = (rec as any).requiredTemp
          let diffText = ''
          if (tempNum !== undefined && typeof reqTemp === 'number') {
            const diff = tempNum - reqTemp
            const sign = diff > 0 ? '+' : ''
            diffText = `（${sign}${diff.toFixed(1)}℃）`
          }
          return (
            <View
              key={rec.id}
              className={styles.historyItem}
              onClick={() => Taro.navigateTo({
                url: `/pages/inspection-detail/index?id=${rec.id}`
              })}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text className={styles.historyNo}>{rec.containerNo}</Text>
                  <StatusBadge
                    text={INSPECTION_RESULT_TEXT[rec.result]}
                    color={
                      rec.result === 'pass' ? 'green'
                        : rec.result === 'review' ? 'orange' : 'red'
                    }
                    size='md'
                  />
                </View>
                <View style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 24, color: '#2563EB', fontWeight: 600 }}>
                    温控：{tempStr}{diffText}
                  </Text>
                  {typeof reqTemp === 'number' && (
                    <Text style={{ fontSize: 22, color: '#64748B' }}>要求 {reqTemp}℃</Text>
                  )}
                </View>
                <Text className={styles.historyTime} style={{ marginTop: 8 }}>
                  {rec.operator} · {formatDateTime(rec.createdAt)}
                </Text>
              </View>
            </View>
          )
        })
      )}
    </View>
  )
}

export default InspectionPage

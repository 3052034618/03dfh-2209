import React, { useMemo } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import classnames from 'classnames'
import { INSPECTION_RESULT_TEXT, CheckItem } from '@/types'
import { appStore } from '@/store'
import { buildTempRanges, formatDateTime } from '@/utils'
import styles from './index.module.scss'

const INSPECTION_RESULT_LABEL: Record<string, string> = {
  pass: '通过',
  fail: '未通过',
  pending: '未检测'
}

const parseNum = (v: any): number | undefined => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }
  return undefined
}

const InspectionDetailPage: React.FC = () => {
  const router = useRouter()
  const id = router.params.id
  const record = useMemo(() => (id ? appStore.getInspectionById(id) : undefined), [id])

  if (!record) {
    return (
      <View className={styles.page}>
        <View className={styles.empty}>
          <Text className={styles.emptyIcon}>❓</Text>
          <Text className={styles.emptyText}>未找到该检查记录</Text>
          <Button className={styles.backBtn} onClick={() => Taro.switchTab({ url: '/pages/inspection/index' })}>
            返回检查列表
          </Button>
        </View>
      </View>
    )
  }

  const requiredTemp = (record as any).requiredTemp as number | undefined
  const tempRanges = requiredTemp !== undefined ? buildTempRanges(requiredTemp) : null

  const thermoItem = record.items.find(i => i.id === 'thermo_reading')
  const settingItem = record.items.find(i => i.id === 'set_temp_match')
  const thermoValue = parseNum(thermoItem?.value)
  const settingValue = parseNum(settingItem?.value)

  const diffValue = thermoValue !== undefined && requiredTemp !== undefined
    ? thermoValue - requiredTemp
    : undefined

  const diffClass = diffValue !== undefined
    ? (Math.abs(diffValue) <= 2 ? styles.itemDiffOk
      : Math.abs(diffValue) <= 5 ? styles.itemDiffWarn
      : styles.itemDiffErr)
    : ''

  const suggestions = useMemo(() => {
    const list: { icon: string; text: string }[] = []
    if (record.result === 'pass') {
      list.push({ icon: '✅', text: '所有必检项已通过，允许发车，途中每2小时通过App复查温度' })
      list.push({ icon: '📱', text: '若途中收到温度偏离或断电提醒，立即在异常上报中提交' })
      list.push({ icon: '📦', text: '到港后按港区指引停靠，等待卸货指令' })
    } else if (record.result === 'review') {
      list.push({ icon: '📞', text: '请立即致电调度，说明异常项具体情况，等待复核意见' })
      list.push({ icon: '🔍', text: '针对偏离项进行二次检查确认，如温度波动需等待稳定后再读数' })
      list.push({ icon: '⏱', text: '调度确认通过后方可发车，切勿自行出发' })
    } else {
      list.push({ icon: '⛔', text: '该箱体存在严重安全隐患，禁止发车！请留在原地等待处理指令' })
      list.push({ icon: '📞', text: '立即联系堆场或调度，报告箱号和具体异常，等待现场人员到场' })
      list.push({ icon: '🚨', text: '若为温度严重偏离或断电，需在异常上报模块同步提交紧急报告' })
    }
    if (record.remark) {
      list.push({ icon: '📝', text: `检查备注：${record.remark}` })
    }
    return list
  }, [record])

  const renderItemRow = (item: CheckItem) => {
    const statusClass = item.status === 'pass'
      ? styles['itemRow-pass']
      : item.status === 'fail'
        ? styles['itemRow-fail']
        : styles['itemRow-pending']
    const statusLabel = INSPECTION_RESULT_LABEL[item.status] || '未检测'
    const statusBadgeClass = item.status === 'pass'
      ? styles['itemStatus-pass']
      : item.status === 'fail'
        ? styles['itemStatus-fail']
        : styles['itemStatus-pending']

    const itemValue = parseNum(item.value)

    let diffBlock = null
    if (requiredTemp !== undefined && (item.id === 'thermo_reading' || item.id === 'set_temp_match') && itemValue !== undefined) {
      const d = itemValue - requiredTemp
      const sign = d > 0 ? '+' : ''
      const cls = Math.abs(d) <= 2 ? styles.itemDiffOk
        : Math.abs(d) <= 5 ? styles.itemDiffWarn
        : styles.itemDiffErr
      diffBlock = (
        <View className={classnames(styles.itemDiff, cls)}>
          {sign}{d.toFixed(1)}℃
        </View>
      )
    }

    return (
      <View key={item.id} className={classnames(styles.itemRow, statusClass)}>
        <View className={styles.itemHead}>
          <Text className={styles.itemName}>{item.name}</Text>
          <View className={classnames(styles.itemStatus, statusBadgeClass)}>{statusLabel}</View>
        </View>
        <Text className={styles.itemDesc}>{item.description}</Text>
        <View className={styles.itemValues}>
          {item.type === 'switch' && (
            <View className={styles.itemValue}>
              <Text className={styles.itemValueLabel}>状态：</Text>
              <Text className={styles.itemValueNum} style={{
                color: item.value === true ? '#16A34A' : '#DC2626'
              }}>
                {item.value === true ? '已确认 ✓' : item.value === false ? '未确认 ✗' : '—'}
              </Text>
            </View>
          )}
          {item.type === 'input' && (
            <>
              <View className={styles.itemValue}>
                <Text className={styles.itemValueLabel}>录入值：</Text>
                <Text className={styles.itemValueNum}>
                  {itemValue !== undefined ? `${itemValue}${item.unit || ''}` : '—'}
                </Text>
              </View>
              {requiredTemp !== undefined && (item.id === 'thermo_reading' || item.id === 'set_temp_match') && (
                <View className={styles.itemValue}>
                  <Text className={styles.itemValueLabel}>客户要求：</Text>
                  <Text className={styles.itemValueNum} style={{ color: '#2563EB' }}>
                    {requiredTemp}℃
                  </Text>
                </View>
              )}
              {tempRanges && (item.id === 'thermo_reading' || item.id === 'set_temp_match') && (
                <View className={styles.itemValue}>
                  <Text className={styles.itemValueLabel}>合格范围：</Text>
                  <Text className={styles.itemValueLabel}>
                    {tempRanges.passMin}~{tempRanges.passMax}{item.unit}
                  </Text>
                </View>
              )}
              {diffBlock}
            </>
          )}
        </View>
      </View>
    )
  }

  return (
    <View className={styles.page}>
      <View className={classnames(
        styles.resultBanner,
        styles[`resultBanner-${record.result}`]
      )}>
        <View className={styles.bannerTop}>
          <Text className={styles.bannerLabel}>最终判定结果</Text>
          <Text className={styles.bannerResult}>{INSPECTION_RESULT_TEXT[record.result]}</Text>
        </View>
        <Text className={styles.bannerNo}>箱号 {record.containerNo}</Text>
        <View className={styles.bannerMeta}>
          <View className={styles.bannerMetaItem}>
            <Text>👷</Text>
            <Text>{record.operator}</Text>
          </View>
          <View className={styles.bannerMetaItem}>
            <Text>🕐</Text>
            <Text>{formatDateTime(record.createdAt)}</Text>
          </View>
          <View className={styles.bannerMetaItem}>
            <Text>🆔</Text>
            <Text>{record.id}</Text>
          </View>
        </View>
      </View>

      {requiredTemp !== undefined && (
        <View className={styles.infoCard}>
          <View className={styles.infoTitle}>🌡️ 温度核对总览</View>
          <View className={styles.tempCompare}>
            <View className={classnames(styles.tempBlock, styles.tempBlockReq)}>
              <Text className={styles.tempLabel}>客户要求</Text>
              <Text className={styles.tempValue}>{requiredTemp}℃</Text>
            </View>
            <View className={classnames(styles.tempBlock, styles.tempBlockAct)}>
              <Text className={styles.tempLabel}>实际读数</Text>
              <Text className={styles.tempValue}>
                {thermoValue !== undefined ? `${thermoValue}℃` : '—'}
              </Text>
            </View>
            <View className={classnames(styles.tempBlock, styles.tempBlockDiff)}>
              <Text className={styles.tempLabel}>偏差</Text>
              <Text className={styles.tempValue}>
                {diffValue !== undefined ? `${diffValue > 0 ? '+' : ''}${diffValue.toFixed(1)}℃` : '—'}
              </Text>
            </View>
          </View>
          {settingValue !== undefined && (
            <View className={styles.itemValues} style={{ padding: 0 }}>
              <View className={styles.itemValue}>
                <Text className={styles.itemValueLabel}>温控机设定值：</Text>
                <Text className={styles.itemValueNum}>{settingValue}℃</Text>
              </View>
              <View className={styles.itemValue}>
                <Text className={styles.itemValueLabel}>合格范围：</Text>
                <Text className={styles.itemValueLabel}>
                  {tempRanges!.passMin}~{tempRanges!.passMax}℃
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      <View className={styles.infoCard}>
        <View className={styles.infoTitle}>📋 逐项检查结果</View>
        <View className={styles.itemList}>
          {record.items.map(renderItemRow)}
        </View>
      </View>

      <View className={styles.suggestCard}>
        <View className={styles.suggestTitle}>💡 司机处理建议 & 调度复核参考</View>
        {suggestions.map((s, idx) => (
          <View key={idx} className={styles.suggestItem}>
            <Text className={styles.suggestIcon}>{s.icon}</Text>
            <Text className={styles.suggestText}>{s.text}</Text>
          </View>
        ))}
      </View>

      <Button className={styles.backBtn} onClick={() => Taro.navigateBack()}>
        ← 返回检查列表
      </Button>
    </View>
  )
}

export default InspectionDetailPage

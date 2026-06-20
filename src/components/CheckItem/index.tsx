import React from 'react'
import { View, Text, Switch, Input } from '@tarojs/components'
import classnames from 'classnames'
import { CheckItem as CheckItemType } from '@/types'
import styles from './index.module.scss'

interface CheckItemProps {
  item: CheckItemType
  onChange: (id: string, value: boolean | number | string, rawValue?: string) => void
  referenceValue?: number
  referenceLabel?: string
  dynamicPassRange?: { min: number; max: number }
  dynamicFailRange?: { min: number; max: number }
}

const CheckItemComp: React.FC<CheckItemProps> = ({
  item,
  onChange,
  referenceValue,
  referenceLabel = '参考值',
  dynamicPassRange,
  dynamicFailRange
}) => {
  const checked = item.value === true

  const parseValueForDisplay = (): string => {
    if (item.type === 'input' && item.rawValue !== undefined && item.rawValue !== null && item.rawValue !== '') {
      return item.rawValue
    }
    if (item.value === undefined || item.value === null) return ''
    if (typeof item.value === 'boolean') return ''
    return String(item.value)
  }

  const parseValueForNum = (): number | undefined => {
    if (item.value === undefined || item.value === null) return undefined
    if (typeof item.value === 'boolean') return undefined
    const n = parseFloat(String(item.value))
    return isNaN(n) ? undefined : n
  }

  const displayValue = parseValueForDisplay()
  const numValue = parseValueForNum()

  const passRange = dynamicPassRange || item.passRange
  const failRange = dynamicFailRange || item.failRange

  const renderPassHint = () => {
    if (item.type !== 'input') return null
    if (numValue === undefined || numValue === null) return null

    if (passRange) {
      const { min, max } = passRange
      if (numValue >= min && numValue <= max) {
        return <View className={styles.passTag}>✓ 在正常范围</View>
      }
    }
    if (failRange) {
      const fmin = failRange.min ?? -Infinity
      const fmax = failRange.max ?? Infinity
      if (numValue < fmin || numValue > fmax) {
        return <View className={styles.failTag}>✗ 严重偏离</View>
      }
    }
    return <View className={styles.warningTag}>⚠ 偏离范围</View>
  }

  return (
    <View className={classnames(styles.item, !item.required && styles.itemOptional)}>
      <View className={styles.itemHeader}>
        <View className={styles.itemTitleRow}>
          <Text className={styles.itemTitle}>{item.name}</Text>
          {item.required ? (
            <View className={styles.requiredTag}>必检</View>
          ) : (
            <View className={styles.optionalTag}>选检</View>
          )}
        </View>
        <Text className={styles.itemDesc}>{item.description}</Text>
      </View>

      <View className={styles.itemBody}>
        {item.type === 'switch' && (
          <View className={styles.switchRow}>
            <View className={styles.switchLabels}>
              <Text className={classnames(styles.switchLabel, !checked && styles.switchLabelActive)}>
                未确认
              </Text>
              <Text className={classnames(styles.switchLabel, checked && styles.switchLabelActive)}>
                已确认
              </Text>
            </View>
            <Switch
              checked={checked}
              color='#2563EB'
              onChange={e => onChange(item.id, e.detail.value)}
            />
          </View>
        )}

        {item.type === 'input' && (
          <View className={styles.inputSection}>
            <View className={styles.inputRow}>
              <View className={styles.inputWrapper}>
                <Input
                  type='text'
                  className={styles.input}
                  value={displayValue}
                  placeholder='请输入实际读数（如 -18）'
                  confirmType='done'
                  onInput={e => {
                    const v = e.detail.value
                    if (v === '') {
                      onChange(item.id, '', '')
                      return
                    }
                    if (!/^-?\d*\.?\d*$/.test(v)) return
                    if (v === '-' || v === '.' || v === '-.' || v.endsWith('.')) {
                      onChange(item.id, v, v)
                      return
                    }
                    const n = parseFloat(v)
                    if (!isNaN(n)) {
                      onChange(item.id, n, v)
                    } else {
                      onChange(item.id, v, v)
                    }
                  }}
                />
                {item.unit && <Text className={styles.inputUnit}>{item.unit}</Text>}
              </View>
              {passRange && (
                <View className={styles.rangeHint}>
                  正常：{passRange.min}~{passRange.max}{item.unit}
                </View>
              )}
            </View>
            {referenceValue !== undefined && (
              <View className={styles.refRow}>
                <Text className={styles.refLabel}>{referenceLabel}：</Text>
                <Text className={styles.refValue}>{referenceValue}{item.unit}</Text>
                {numValue !== undefined && referenceValue !== undefined && (
                  <Text className={classnames(
                    styles.diffValue,
                    Math.abs(numValue - referenceValue) <= 2 && styles.diffOk,
                    Math.abs(numValue - referenceValue) > 2 && Math.abs(numValue - referenceValue) <= 5 && styles.diffWarn,
                    Math.abs(numValue - referenceValue) > 5 && styles.diffErr
                  )}>
                    ({numValue > referenceValue ? '+' : ''}{(numValue - referenceValue).toFixed(1)}{item.unit})
                  </Text>
                )}
              </View>
            )}
            <View className={styles.statusRow}>{renderPassHint()}</View>
          </View>
        )}
      </View>
    </View>
  )
}

export default CheckItemComp

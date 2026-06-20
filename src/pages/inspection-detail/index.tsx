import React from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'

const InspectionDetailPage: React.FC = () => {
  return (
    <View className={styles.page}>
      <View className={styles.wrapper}>
        <Text className={styles.icon}>✅</Text>
        <Text className={styles.title}>检查记录详情</Text>
        <Text className={styles.hint}>
          检查记录详情功能正在开发中...
          {'\n'}
          后续将展示完整的检查项明细、历史对比、调度复核意见等内容。
        </Text>
        <Button className={styles.backBtn} onClick={() => Taro.navigateBack()}>
          返回检查列表
        </Button>
      </View>
    </View>
  )
}

export default InspectionDetailPage

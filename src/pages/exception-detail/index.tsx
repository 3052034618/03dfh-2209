import React from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'

const ExceptionDetailPage: React.FC = () => {
  return (
    <View className={styles.page}>
      <View className={styles.wrapper}>
        <Text className={styles.icon}>🚨</Text>
        <Text className={styles.title}>上报记录详情</Text>
        <Text className={styles.hint}>
          上报记录详情功能正在开发中...
          {'\n'}
          后续将展示完整的上报明细、调度处理过程、现场照片、位置轨迹等内容。
        </Text>
        <Button className={styles.backBtn} onClick={() => Taro.navigateBack()}>
          返回上报列表
        </Button>
      </View>
    </View>
  )
}

export default ExceptionDetailPage

import React from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'

const TaskDetailPage: React.FC = () => {
  return (
    <View className={styles.page}>
      <View className={styles.wrapper}>
        <Text className={styles.icon}>📋</Text>
        <Text className={styles.title}>任务详情</Text>
        <Text className={styles.hint}>
          任务详情功能正在开发中...
          {'\n'}
          后续将展示完整的任务信息、操作日志、状态流转记录等内容。
        </Text>
        <Button className={styles.backBtn} onClick={() => Taro.navigateBack()}>
          返回任务列表
        </Button>
      </View>
    </View>
  )
}

export default TaskDetailPage

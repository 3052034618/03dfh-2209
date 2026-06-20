import React from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { Task, TASK_STATUS_TEXT } from '@/types'
import { formatTime, getDeadlineText, isDeadlineNear, taskStatusColor } from '@/utils'
import StatusBadge from '@/components/StatusBadge'
import styles from './index.module.scss'

interface TaskCardProps {
  task: Task
  showInspectionBtn?: boolean
  onClick?: () => void
}

const TaskCard: React.FC<TaskCardProps> = ({ task, showInspectionBtn = true, onClick }) => {
  const deadlineNear = isDeadlineNear(task.deadline)
  const statusColor = taskStatusColor(task.status)

  const handleInspection = (e: React.MouseEvent) => {
    e.stopPropagation()
    Taro.switchTab({ url: '/pages/inspection/index' })
  }

  const handleDetail = () => {
    if (onClick) {
      onClick()
    } else {
      Taro.navigateTo({ url: `/pages/task-detail/index?id=${task.id}` })
    }
  }

  return (
    <View className={styles.card} onClick={handleDetail}>
      <View className={styles.header}>
        <View className={styles.timeBlock}>
          <Text className={styles.timeLabel}>提箱时间</Text>
          <Text className={styles.timeValue}>{formatTime(task.pickupTime)}</Text>
        </View>
        <StatusBadge
          text={TASK_STATUS_TEXT[task.status]}
          color={statusColor as any}
          size='sm'
        />
      </View>

      <View className={styles.containerNoRow}>
        <View className={styles.containerNoBlock}>
          <Text className={styles.label}>箱号</Text>
          <Text className={styles.containerNo}>{task.containerNo}</Text>
        </View>
        <View className={styles.sealBlock}>
          <Text className={styles.label}>铅封号</Text>
          <Text className={styles.sealNo}>{task.sealNo}</Text>
        </View>
      </View>

      <View className={styles.infoGrid}>
        <View className={styles.infoItem}>
          <View className={styles.infoIconTemp}>❄</View>
          <View className={styles.infoContent}>
            <Text className={styles.infoLabel}>客户温度要求</Text>
            <Text className={styles.tempValue}>{task.requiredTemp}℃</Text>
          </View>
        </View>
        <View className={styles.infoItem}>
          <View className={styles.infoIconCargo}>📦</View>
          <View className={styles.infoContent}>
            <Text className={styles.infoLabel}>货物类型</Text>
            <Text className={styles.infoValue}>{task.cargoType}</Text>
          </View>
        </View>
      </View>

      <View className={styles.addressRow}>
        <View className={styles.addressIcon}>📍</View>
        <View className={styles.addressContent}>
          <Text className={styles.addressLabel}>装货地址</Text>
          <Text className={styles.addressText}>{task.loadingAddress}</Text>
        </View>
      </View>

      <View className={styles.footer}>
        <View className={classnames(styles.deadline, deadlineNear && styles.deadlineUrgent)}>
          <Text className={styles.deadlineIcon}>⏱</Text>
          <Text className={styles.deadlineLabel}>到港截止：</Text>
          <Text className={classnames(styles.deadlineValue, deadlineNear && styles.deadlineUrgentText)}>
            {getDeadlineText(task.deadline)}
          </Text>
          <Text className={styles.portName}> · {task.portName}</Text>
        </View>
        {showInspectionBtn && (task.status === 'picking' || task.status === 'pending') && (
          <Button className={styles.inspectBtn} onClick={handleInspection}>
            <Text>箱体检查</Text>
          </Button>
        )}
      </View>
    </View>
  )
}

export default TaskCard

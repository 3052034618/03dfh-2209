import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import classnames from 'classnames'
import { Task, TaskStatus } from '@/types'
import { mockTasks } from '@/data/tasks'
import TaskCard from '@/components/TaskCard'
import styles from './index.module.scss'

type FilterStatus = 'all' | TaskStatus

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待提箱' },
  { value: 'picking', label: '提箱中' },
  { value: 'shipping', label: '运输中' },
  { value: 'arrived', label: '已到港' },
  { value: 'completed', label: '已完成' }
]

const TasksPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [tasks, setTasks] = useState<Task[]>(mockTasks)

  const todayStr = useMemo(() => {
    const d = new Date()
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return {
      date: `${d.getMonth() + 1}月${d.getDate()}日`,
      week: weeks[d.getDay()]
    }
  }, [])

  const filteredTasks = useMemo(() => {
    let list = [...tasks]
    if (filter !== 'all') {
      list = list.filter(t => t.status === filter)
    }
    return list.sort((a, b) =>
      new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime()
    )
  }, [tasks, filter])

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending' || t.status === 'picking').length,
      shipping: tasks.filter(t => t.status === 'shipping').length,
      done: tasks.filter(t => t.status === 'arrived' || t.status === 'completed').length
    }
  }, [tasks])

  usePullDownRefresh(() => {
    setTimeout(() => {
      setTasks([...mockTasks])
      Taro.stopPullDownRefresh()
      Taro.showToast({ title: '刷新成功', icon: 'success' })
    }, 800)
  })

  const handleFilterChange = (val: FilterStatus) => {
    setFilter(val)
  }

  return (
    <View className={styles.page}>
      <View className={styles.sectionWrap}>
        <View className={styles.header}>
          <View className={styles.headerTop}>
            <View className={styles.greeting}>
              <Text className={styles.greetingText}>早上好，注意行车安全</Text>
              <Text className={styles.driverName}>张师傅</Text>
            </View>
            <View className={styles.headerDate}>
              <Text className={styles.dateText}>{todayStr.date}</Text>
              <Text className={styles.weekText}>{todayStr.week}</Text>
            </View>
          </View>
          <View className={styles.statsRow}>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{stats.total}</Text>
              <Text className={styles.statLabel}>今日总任务</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{stats.pending}</Text>
              <Text className={styles.statLabel}>待提箱</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{stats.shipping}</Text>
              <Text className={styles.statLabel}>运输中</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statNumber}>{stats.done}</Text>
              <Text className={styles.statLabel}>已完成</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView scrollX className={styles.filterTabs}>
        {FILTER_OPTIONS.map(opt => (
          <View
            key={opt.value}
            className={classnames(
              styles.filterTab,
              filter === opt.value && styles.filterTabActive
            )}
            onClick={() => handleFilterChange(opt.value)}
          >
            {opt.label}
          </View>
        ))}
      </ScrollView>

      <View className={styles.listContent}>
        <View className={styles.sectionTitleRow}>
          <Text className={styles.sectionTitle}>任务列表</Text>
          <Text className={styles.sectionCount}>共 {filteredTasks.length} 条</Text>
        </View>

        {filteredTasks.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无相关任务</Text>
            <Text className={styles.emptyHint}>切换筛选条件查看其他任务</Text>
          </View>
        ) : (
          filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </View>
    </View>
  )
}

export default TasksPage

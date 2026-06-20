import React, { useState, useMemo, useEffect } from 'react'
import { View, Text, Button, Textarea, ScrollView, Image } from '@tarojs/components'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import classnames from 'classnames'
import {
  ExceptionType,
  ExceptionAction,
  EXCEPTION_TYPE_TEXT,
  EXCEPTION_ACTION_TEXT
} from '@/types'
import { mockTasks } from '@/data/tasks'
import { exceptionReasons, exceptionActionList, mockExceptionReports } from '@/data/exception'
import { formatDateTime } from '@/utils'
import SectionCard from '@/components/SectionCard'
import StatusBadge from '@/components/StatusBadge'
import styles from './index.module.scss'

const TYPE_CONFIG: { key: ExceptionType; icon: string; hint: string }[] = [
  { key: 'temp_deviation', icon: '🌡️', hint: '温度超出正常范围' },
  { key: 'power_failure', icon: '⚡', hint: '冷柜断电或供电异常' },
  { key: 'door_seal', icon: '🚪', hint: '箱门或封条问题' },
  { key: 'equipment_malfunction', icon: '🔧', hint: '设备故障或报警' },
  { key: 'other', icon: '⚠️', hint: '其他现场异常情况' }
]

const ExceptionPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<ExceptionType>('temp_deviation')
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [selectedActions, setSelectedActions] = useState<ExceptionAction[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [location, setLocation] = useState<string>('正在定位...')
  const [locating, setLocating] = useState<boolean>(true)
  const [description, setDescription] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<string>(mockTasks[0]?.containerNo || '')
  const MAX_DESC = 500

  const currentReasons = useMemo(() => exceptionReasons[selectedType], [selectedType])

  const canSubmit = useMemo(() => {
    return !!selectedReason
      && selectedActions.length > 0
      && location
      && location !== '正在定位...'
  }, [selectedReason, selectedActions, location])

  useEffect(() => {
    console.log('[Exception] 页面加载，开始定位')
    setTimeout(() => {
      setLocation('上海市浦东新区G1503绕城高速近东川公路出口 · 停靠点A12')
      setLocating(false)
      console.log('[Exception] 定位完成')
    }, 1500)
  }, [])

  usePullDownRefresh(() => {
    setTimeout(() => {
      Taro.stopPullDownRefresh()
    }, 600)
  })

  const handleTypeSelect = (type: ExceptionType) => {
    setSelectedType(type)
    setSelectedReason('')
    console.log('[Exception] 切换异常类型:', EXCEPTION_TYPE_TEXT[type])
  }

  const handleActionToggle = (action: ExceptionAction) => {
    setSelectedActions(prev => {
      if (prev.includes(action)) {
        return prev.filter(a => a !== action)
      }
      return [...prev, action]
    })
  }

  const handleAddPhoto = () => {
    Taro.chooseImage({
      count: 3 - photos.length,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: res => {
        const newPhotos = res.tempFilePaths
        setPhotos(prev => [...prev, ...newPhotos].slice(0, 3))
        console.log('[Exception] 新增照片:', newPhotos.length, '张')
      },
      fail: err => {
        console.error('[Exception] 拍照失败:', err)
        if (photos.length < 3) {
          const placeholder = `https://picsum.photos/id/${160 + photos.length}/300/300`
          setPhotos(prev => [...prev, placeholder])
        }
      }
    })
  }

  const handleRemovePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  const handleRelocate = () => {
    setLocating(true)
    setLocation('正在重新定位...')
    console.log('[Exception] 开始重新定位')
    setTimeout(() => {
      const locOptions = [
        '上海市浦东新区S2沪芦高速临港服务区',
        '上海市奉贤区G15沈海高速南桥出口',
        '上海市嘉定区G1501绕城高速安亭服务区'
      ]
      setLocation(locOptions[Math.floor(Math.random() * locOptions.length)])
      setLocating(false)
      Taro.showToast({ title: '定位成功', icon: 'success' })
    }, 1200)
  }

  const handleSelectTask = () => {
    const list = mockTasks
      .filter(t => t.status === 'shipping' || t.status === 'picking')
      .map(t => t.containerNo)
    Taro.showActionSheet({
      itemList: list,
      success: res => {
        setSelectedTask(list[res.tapIndex])
      }
    })
  }

  const handleClear = () => {
    Taro.showModal({
      title: '清空表单',
      content: '确定要清空已填写的所有内容吗？',
      success: res => {
        if (res.confirm) {
          setSelectedReason('')
          setSelectedActions([])
          setPhotos([])
          setDescription('')
          Taro.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  }

  const handleSubmit = () => {
    if (!canSubmit) {
      const missing: string[] = []
      if (!selectedReason) missing.push('选择异常原因')
      if (selectedActions.length === 0) missing.push('选择已采取动作')
      if (!location || location === '正在定位...') missing.push('获取停车位置')
      Taro.showToast({ title: `请先${missing.join('、')}`, icon: 'none', duration: 2500 })
      return
    }

    Taro.showModal({
      title: '确认提交异常上报',
      content: `类型：${EXCEPTION_TYPE_TEXT[selectedType]}\n原因：${selectedReason}\n位置：${location}\n已采取 ${selectedActions.length} 项措施\n\n提交后调度端将实时收到通知，请保持电话畅通。`,
      confirmText: '确认上报',
      confirmColor: '#DC2626',
      success: res => {
        if (res.confirm) {
          Taro.showLoading({ title: '上报中...' })
          setTimeout(() => {
            Taro.hideLoading()
            Taro.showToast({ title: '上报成功', icon: 'success' })
            console.log('[Exception] 上报提交:', {
              containerNo: selectedTask,
              type: selectedType,
              reason: selectedReason,
              actions: selectedActions,
              photos: photos.length,
              location
            })
            setSelectedReason('')
            setSelectedActions([])
            setPhotos([])
            setDescription('')
          }, 1000)
        }
      }
    })
  }

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.content}>
        <View className={styles.alertBanner}>
          <View className={styles.alertTitleRow}>
            <Text className={styles.alertIcon}>🚨</Text>
            <Text className={styles.alertTitle}>紧急异常上报通道</Text>
          </View>
          <Text className={styles.alertDesc}>
            行驶途中出现温度偏离、断电等紧急情况，请在此如实填写现场状态。
            调度端将实时收到通知并协助处理，减少电话沟通成本。
          </Text>
        </View>

        <View className={styles.sectionLabel}>关联集装箱</View>
        <View
          className={classnames(
            styles.locationCard,
            { [styles.locationCard]: true }
          )}
          onClick={handleSelectTask}
        >
          <View style={{
            fontSize: '40rpx',
            width: '64rpx',
            height: '64rpx',
            backgroundColor: '#EFF6FF',
            borderRadius: '8rpx',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>📦</View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: '28rpx', fontWeight: 600, color: '#0F172A', fontFamily: 'Menlo, Consolas, monospace' }}>
              {selectedTask}
            </Text>
            <Text style={{ fontSize: '22rpx', color: '#94A3B8', marginTop: '4rpx', display: 'block' }}>
              点击切换其他任务
            </Text>
          </View>
        </View>

        <Text className={styles.sectionLabel}>① 选择异常类型</Text>
        <View className={styles.typeGrid}>
          {TYPE_CONFIG.map(cfg => {
            const active = selectedType === cfg.key
            return (
              <View
                key={cfg.key}
                className={classnames(styles.typeCard, active && styles.typeCardActive)}
                onClick={() => handleTypeSelect(cfg.key)}
              >
                <View className={styles.typeCardTop}>
                  <View className={styles.typeIcon}>{cfg.icon}</View>
                  <View className={classnames(
                    styles.typeCheck,
                    active && styles.typeCheckChecked
                  )}>
                    {active && <Text className={styles.typeCheckIcon}>✓</Text>}
                  </View>
                </View>
                <Text className={styles.typeName}>{EXCEPTION_TYPE_TEXT[cfg.key]}</Text>
                <Text className={styles.typeHint}>{cfg.hint}</Text>
              </View>
            )
          })}
        </View>

        <Text className={styles.sectionLabel}>② 选择具体原因</Text>
        <View className={styles.reasonList}>
          {currentReasons.map(reason => {
            const checked = selectedReason === reason
            return (
              <View
                key={reason}
                className={styles.reasonItem}
                onClick={() => setSelectedReason(reason)}
              >
                <Text className={styles.reasonText}>{reason}</Text>
                <View className={classnames(
                  styles.reasonCheck,
                  checked && styles.reasonCheckChecked
                )}>
                  {checked && <Text style={{ fontSize: '22rpx', color: '#fff', fontWeight: 'bold' }}>✓</Text>}
                </View>
              </View>
            )
          })}
        </View>

        <Text className={styles.sectionLabel}>③ 补充现场照片（最多3张）</Text>
        <View className={styles.photoGrid}>
          {photos.map((photo, idx) => (
            <View key={idx} className={styles.photoItem}>
              <Image
                className={styles.photoImage}
                src={photo}
                mode='aspectFill'
              />
              <View
                className={styles.photoRemove}
                onClick={() => handleRemovePhoto(idx)}
              >×</View>
            </View>
          ))}
          {photos.length < 3 && (
            <View className={classnames(styles.photoItem, styles.photoAdd)} onClick={handleAddPhoto}>
              <View className={styles.photoContent}>
                <Text className={styles.photoAddIcon}>📷</Text>
                <Text className={styles.photoAddText}>拍照/上传</Text>
              </View>
            </View>
          )}
        </View>

        <Text className={styles.sectionLabel}>④ 当前停车位置</Text>
        <View className={styles.locationCard}>
          <View className={styles.locationIcon}>📍</View>
          <View className={styles.locationContent}>
            {locating ? (
              <Text className={styles.locationLoading}>定位中，请稍候...</Text>
            ) : (
              <Text className={styles.locationText}>{location}</Text>
            )}
          </View>
          <Button className={styles.locationBtn} onClick={handleRelocate}>
            {locating ? '定位中' : '重新定位'}
          </Button>
        </View>

        <Text className={styles.sectionLabel}>⑤ 已采取的措施（可多选）</Text>
        <View className={styles.actionGrid}>
          {exceptionActionList.map(action => {
            const active = selectedActions.includes(action)
            return (
              <View
                key={action}
                className={classnames(styles.actionTag, active && styles.actionTagActive)}
                onClick={() => handleActionToggle(action)}
              >
                {EXCEPTION_ACTION_TEXT[action]}
              </View>
            )
          })}
        </View>

        <Text className={styles.sectionLabel}>⑥ 详细情况说明（可选）</Text>
        <View className={styles.descCard}>
          <Textarea
            className={styles.descTextarea}
            placeholder='请补充描述异常发生的详细经过、当前状态、需要调度协助的事项等...'
            maxlength={MAX_DESC}
            value={description}
            onInput={e => setDescription(e.detail.value)}
            showConfirmBar={false}
            autoHeight
          />
          <View className={styles.descCounter}>
            <Text className={styles.descCountText}>
              {description.length} / {MAX_DESC}
            </Text>
          </View>
        </View>

        <View className={styles.historySection}>
          <Text className={styles.historyTitle}>近期上报记录</Text>
          {mockExceptionReports.length === 0 ? (
            <SectionCard>
              <Text style={{ fontSize: '24rpx', color: '#94A3B8', textAlign: 'center', padding: '32rpx 0' }}>
                暂无上报记录
              </Text>
            </SectionCard>
          ) : (
            mockExceptionReports.map(rep => (
              <View
                key={rep.id}
                className={styles.historyCard}
                onClick={() => Taro.navigateTo({
                  url: `/pages/exception-detail/index?id=${rep.id}`
                })}
              >
                <View className={styles.historyHeader}>
                  <View className={styles.historyLeft}>
                    <StatusBadge
                      text={EXCEPTION_TYPE_TEXT[rep.type]}
                      color={
                        rep.type === 'power_failure' || rep.type === 'temp_deviation' ? 'red'
                          : rep.type === 'equipment_malfunction' ? 'orange'
                          : rep.type === 'door_seal' ? 'orange' : 'blue'
                      }
                      size='sm'
                    />
                    <Text className={styles.historyNo}>{rep.containerNo}</Text>
                  </View>
                  <StatusBadge
                    text={
                      rep.status === 'submitted' ? '已提交'
                        : rep.status === 'handling' ? '处理中' : '已解决'
                    }
                    color={
                      rep.status === 'submitted' ? 'blue'
                        : rep.status === 'handling' ? 'orange' : 'green'
                    }
                    size='sm'
                  />
                </View>
                <View className={styles.historyMeta}>
                  <Text className={styles.historyMetaText}>💬 {rep.reason}</Text>
                </View>
                <View className={styles.historyMeta}>
                  <Text className={styles.historyMetaText}>
                    {formatDateTime(rep.createdAt)}
                  </Text>
                  <Text className={styles.historyMetaText}>
                    · {rep.reporter}
                  </Text>
                  {rep.durationMinutes && (
                    <Text className={styles.historyMetaText}>
                      · 持续 {rep.durationMinutes} 分钟
                    </Text>
                  )}
                </View>
                <Text className={styles.historyDesc}>{rep.description}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <Button className={styles.clearBtn} onClick={handleClear}>
          清空
        </Button>
        <Button
          className={classnames(
            styles.submitBtn,
            !canSubmit && styles.submitBtnDisabled
          )}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          🚨 立即上报调度
        </Button>
      </View>
    </View>
  )
}

export default ExceptionPage

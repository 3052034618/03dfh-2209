import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

export type BadgeColor = 'blue' | 'green' | 'orange' | 'red' | 'gray'

interface StatusBadgeProps {
  text: string
  color?: BadgeColor
  size?: 'sm' | 'md'
  className?: string
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  text,
  color = 'blue',
  size = 'sm',
  className
}) => {
  return (
    <View
      className={classnames(
        styles.badge,
        styles[`badge-${color}`],
        styles[`badge-${size}`],
        className
      )}
    >
      <Text className={styles.badgeText}>{text}</Text>
    </View>
  )
}

export default StatusBadge

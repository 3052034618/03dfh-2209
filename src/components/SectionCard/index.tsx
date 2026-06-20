import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface SectionCardProps {
  title?: string
  subtitle?: string
  showDivider?: boolean
  className?: string
  children?: React.ReactNode
  extra?: React.ReactNode
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  showDivider = true,
  className,
  children,
  extra
}) => {
  return (
    <View className={classnames(styles.card, className)}>
      {(title || extra) && (
        <View className={styles.cardHeader}>
          <View className={styles.headerLeft}>
            {title && <Text className={styles.title}>{title}</Text>}
            {subtitle && <Text className={styles.subtitle}>{subtitle}</Text>}
          </View>
          {extra && <View className={styles.headerExtra}>{extra}</View>}
        </View>
      )}
      {(title || extra) && showDivider && <View className={styles.divider} />}
      <View className={styles.cardBody}>{children}</View>
    </View>
  )
}

export default SectionCard

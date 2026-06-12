import React, { useState, useEffect } from 'react'
import {
  List,
  Button,
  Tabs,
  Tag,
  Empty,
  Spin,
  Pagination,
  Card,
  message
} from 'antd'
import {
  BellOutlined,
  CheckCircleOutlined,
  ReadOutlined,
  UnorderedListOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { notificationAPI } from '../services/api'
import useUserStore from '../store/useUserStore'
import { NOTIFICATION_TYPE_MAP } from '../utils/constants'

const Notifications = () => {
  const { setUnreadCount } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  useEffect(() => {
    fetchNotifications()
  }, [activeTab, pagination.current, pagination.pageSize])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...(activeTab !== 'all' && { status: activeTab })
      }
      const res = await notificationAPI.getList(params)
      setNotifications(res.data?.list || res.data || [])
      setPagination(prev => ({
        ...prev,
        total: res.data?.total || (res.data?.length || 0)
      }))
    } catch (error) {
      console.error('获取通知列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationAPI.getUnreadCount()
      setUnreadCount(res.data?.count || 0)
    } catch (error) {
      console.error('获取未读数量失败:', error)
    }
  }

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id)
      message.success('已标记为已读')
      fetchNotifications()
      fetchUnreadCount()
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead()
      message.success('全部标记为已读')
      fetchNotifications()
      fetchUnreadCount()
    } catch (error) {
      console.error('全部已读失败:', error)
    }
  }

  const handleTabChange = (key) => {
    setActiveTab(key)
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  const handlePageChange = (page, pageSize) => {
    setPagination(prev => ({ ...prev, current: page, pageSize }))
  }

  const tabItems = [
    { key: 'all', label: '全部通知' },
    { key: 'unread', label: '未读通知' },
    { key: 'read', label: '已读通知' }
  ]

  const renderNotificationItem = (item) => {
    const isRead = item.isRead || item.status === 'read'
    const type = NOTIFICATION_TYPE_MAP[item.type] || '系统通知'

    return (
      <List.Item
        style={{
          background: isRead ? '#fff' : '#f6ffed',
          padding: '16px 24px',
          cursor: 'pointer',
          borderBottom: '1px solid #f0f0f0'
        }}
        onClick={() => {
          if (!isRead) {
            handleMarkAsRead(item.id)
          }
        }}
      >
        <List.Item.Meta
          avatar={
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: isRead ? '#f0f0f0' : '#1890ff20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BellOutlined style={{ fontSize: 20, color: isRead ? '#999' : '#1890ff' }} />
            </div>
          }
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: isRead ? 'normal' : '600', color: '#333' }}>
                {item.title}
              </span>
              <Tag color="blue" style={{ fontSize: 12 }}>
                {type}
              </Tag>
              {!isRead && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#f5222d',
                    display: 'inline-block'
                  }}
                />
              )}
            </div>
          }
          description={
            <div>
              <p style={{ color: '#666', marginBottom: 8, lineHeight: 1.6 }}>
                {item.content}
              </p>
              <span style={{ color: '#999', fontSize: 12 }}>
                {dayjs(item.createdAt || item.time).format('YYYY-MM-DD HH:mm')}
              </span>
            </div>
          }
        />
        {!isRead && (
          <Button type="text" size="small" icon={<ReadOutlined />}>
            标为已读
          </Button>
        )}
      </List.Item>
    )
  }

  return (
    <div>
      <div className="page-title">消息通知</div>

      <Card bordered={false} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tabs
            defaultActiveKey="all"
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
          />
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleMarkAllRead}
          >
            全部已读
          </Button>
        </div>

        <Spin spinning={loading}>
          {notifications.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={activeTab === 'unread' ? '暂无未读消息' : '暂无消息'}
              style={{ padding: '60px 0' }}
            />
          ) : (
            <List
              dataSource={notifications}
              renderItem={renderNotificationItem}
              style={{ border: '1px solid #f0f0f0', borderRadius: 8 }}
            />
          )}

          {pagination.total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onChange={handlePageChange}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 条`}
              />
            </div>
          )}
        </Spin>
      </Card>
    </div>
  )
}

export default Notifications

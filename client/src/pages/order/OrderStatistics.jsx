import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Empty, Spin } from 'antd'
import {
  ShoppingCartOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { orderAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { ORDER_STATUS_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const OrderStatistics = () => {
  const { user } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const res = await orderAPI.getStatistics()
      if (res.code === 200) {
        setStatistics(res.data)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentOrders = async () => {
    try {
      const res = await orderAPI.getOrders({ page: 1, pageSize: 5 })
      if (res.code === 200) {
        setRecentOrders(res.data?.list || res.data || [])
      }
    } catch (error) {
      console.error('获取近期订单失败:', error)
    }
  }

  useEffect(() => {
    fetchStatistics()
    fetchRecentOrders()
  }, [])

  const statCards = statistics ? [
    {
      title: '总订单数',
      value: statistics.totalOrders || 0,
      icon: <ShoppingCartOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      color: '#1890ff'
    },
    {
      title: '总金额',
      value: `¥${Number(statistics.totalAmount || 0).toLocaleString()}`,
      icon: <DollarOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      color: '#52c41a'
    },
    {
      title: '已完成订单',
      value: statistics.completedOrders || 0,
      icon: <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      color: '#52c41a'
    },
    {
      title: '待处理订单',
      value: statistics.pendingOrders || 0,
      icon: <ClockCircleOutlined style={{ fontSize: 32, color: '#faad14' }} />,
      color: '#faad14'
    }
  ] : []

  const columns = [
    {
      title: '订单号',
      dataIndex: 'id',
      key: 'id',
      render: (text) => text ? `#${text}` : '-'
    },
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName'
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (text) => text ? `¥${Number(text).toLocaleString()}` : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusInfo = ORDER_STATUS_MAP[status] || { label: status, color: 'default' }
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
      }
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    }
  ]

  return (
    <div>
      <div className="page-title">订单统计</div>

      <Spin spinning={loading}>
        <Row gutter={16} className="dashboard-grid">
          {statCards.map((card, index) => (
            <Col span={6} key={index}>
              <Card className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Statistic
                      title={card.title}
                      value={card.value}
                      valueStyle={{ color: card.color }}
                    />
                  </div>
                  <div style={{ opacity: 0.8 }}>
                    {card.icon}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={24}>
          <Col span={24}>
            <Card className="chart-card" title="近期订单">
              {recentOrders.length > 0 ? (
                <Table
                  columns={columns}
                  dataSource={recentOrders}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              ) : (
                <Empty description="暂无订单数据" />
              )}
            </Card>
          </Col>
        </Row>

        {statistics?.statusDistribution && (
          <Row gutter={24} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card className="chart-card" title="订单状态分布">
                <Row gutter={16}>
                  {Object.entries(statistics.statusDistribution).map(([status, count]) => {
                    const statusInfo = ORDER_STATUS_MAP[status] || { label: status, color: 'default' }
                    return (
                      <Col span={6} key={status}>
                        <div style={{ textAlign: 'center', padding: '16px', background: '#fafafa', borderRadius: 8 }}>
                          <div style={{ fontSize: 28, fontWeight: 'bold', color: statusInfo.color }}>
                            {count}
                          </div>
                          <div style={{ marginTop: 8, color: '#666' }}>
                            <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
                          </div>
                        </div>
                      </Col>
                    )
                  })}
                </Row>
              </Card>
            </Col>
          </Row>
        )}
      </Spin>
    </div>
  )
}

export default OrderStatistics
